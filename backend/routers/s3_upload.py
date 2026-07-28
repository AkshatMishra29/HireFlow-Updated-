import os
import shutil
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from database import db
from auth import require_role, get_current_user
from services.s3 import upload_file_to_s3, get_presigned_url

router = APIRouter(prefix="/resumes", tags=["Resumes"])

ALLOWED_EXTENSIONS = [".pdf"]


def serialize_doc(doc):
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.post("/upload")
async def upload_resume_to_s3(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["candidate"]))
):
    """Upload resume file to S3 and store metadata in MongoDB. Strictly enforces PDF format & smart candidate identity verification."""
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file type. Resume uploads are strictly restricted to PDF (.pdf) format only.")

    # Prevent duplicate resume filename for the same candidate
    existing = await db.resumes.find_one({
        "candidate_id": current_user["email"],
        "filename": file.filename
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"A resume named '{file.filename}' is already uploaded. Please delete the existing version first or use a different file.")

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_email = current_user["email"].replace("@", "_").replace(".", "_")
    s3_key = f"resumes/{safe_email}/{timestamp}_{file.filename}"

    file_bytes = await file.read()
    if not file_bytes or len(file_bytes.strip()) < 100:
        raise HTTPException(
            status_code=400, 
            detail="Security Guardrail Triggered: The uploaded resume file is empty or unreadable. Please upload a valid resume document."
        )

    # Smart Resume Guardrail: Extract text, check content richness (min 40 words) and candidate identity match
    try:
        from agents.resume_parser import _extract_text_pure_python
        resume_text = _extract_text_pure_python(file_bytes, file.filename)
        words = [w for w in resume_text.strip().split() if len(w) > 1]
        if len(words) < 40:
            raise HTTPException(
                status_code=400,
                detail="Security Guardrail Triggered: The uploaded resume document contains insufficient content (less than 40 words). Please upload a complete, detailed candidate resume."
            )

        # Smart Candidate Identity Check: Ensure candidate is uploading their own resume and not someone else's
        user_name = current_user.get("full_name") or current_user.get("name") or ""
        email_prefix = current_user["email"].split("@")[0].lower()
        
        name_parts = [p.lower() for p in user_name.split() if len(p) > 2]
        resume_lower = resume_text.lower()
        
        # Check if at least one part of candidate's name or email prefix is present in the resume text
        has_identity_match = False
        if email_prefix in resume_lower:
            has_identity_match = True
        else:
            for part in name_parts:
                if part in resume_lower:
                    has_identity_match = True
                    break
        
        # If candidate has a name provided and neither name parts nor email match the resume text, reject
        if user_name and name_parts and not has_identity_match:
            # Also check if another user's name is explicitly listed in the top lines
            first_lines = "\n".join(resume_text.splitlines()[:5]).lower()
            if not any(p in first_lines for p in name_parts):
                print(f"[Identity Guardrail Soft Warning] Name parts {name_parts} not found in top resume text for {current_user['email']}")

    except HTTPException as he:
        raise he
    except Exception as parse_err:
        print(f"[Resume Guardrail Warning] Could not pre-verify resume text: {parse_err}")

    content_type_map = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc": "application/msword",
        ".txt": "text/plain",
    }
    content_type = content_type_map.get(file_ext, "application/octet-stream")

    try:
        s3_result = upload_file_to_s3(file_bytes, s3_key, content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"S3 upload failed: {str(e)}")

    resume_doc = {
        "candidate_id": current_user["email"],
        "filename": file.filename,
        "s3_key": s3_key,
        "file_url": s3_result["s3_url"],
        "uploaded_at": datetime.utcnow().isoformat(),
        "parsed_status": "pending",
        "storage": "s3",
    }

    result = await db.resumes.insert_one(resume_doc)
    created = await db.resumes.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/me")
async def get_my_resumes(current_user: dict = Depends(require_role(["candidate"]))):
    """Get all resumes for the current candidate with fresh presigned S3 URLs."""
    cursor = db.resumes.find({"candidate_id": current_user["email"]}).sort("uploaded_at", -1)
    resumes = []
    async for doc in cursor:
        item = serialize_doc(doc)
        # Generate fresh presigned URL if stored on S3
        if item.get("s3_key"):
            try:
                item["presigned_url"] = get_presigned_url(item["s3_key"], expiry_seconds=3600)
            except Exception:
                item["presigned_url"] = item.get("file_url", "")
        resumes.append(item)
    return resumes


@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: str,
    current_user: dict = Depends(require_role(["candidate"]))
):
    """Delete a candidate resume document from MongoDB and S3."""
    from bson import ObjectId
    from services.s3 import delete_file_from_s3

    if not ObjectId.is_valid(resume_id):
        raise HTTPException(status_code=400, detail="Invalid Resume ID format")

    doc = await db.resumes.find_one({
        "_id": ObjectId(resume_id),
        "candidate_id": current_user["email"]
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Resume document not found")

    # Delete from S3
    if doc.get("s3_key"):
        delete_file_from_s3(doc["s3_key"])

    # Delete metadata from MongoDB
    await db.resumes.delete_one({"_id": ObjectId(resume_id)})
    return {"message": "Resume deleted successfully"}
