import os
import shutil
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from database import db
from auth import require_role, get_current_user
from services.s3 import upload_file_to_s3, get_presigned_url

router = APIRouter(prefix="/resumes", tags=["Resumes"])

ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt"]


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
    """Upload resume file to S3 and store metadata in MongoDB. Prevents duplicate uploads with same filename."""
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PDF, DOCX, TXT")

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

    # Smart Resume Guardrail: Extract text and check content richness (min 40 words)
    try:
        from agents.resume_parser import _extract_text_pure_python
        resume_text = _extract_text_pure_python(file_bytes, file.filename)
        words = [w for w in resume_text.strip().split() if len(w) > 1]
        if len(words) < 40:
            raise HTTPException(
                status_code=400,
                detail="Security Guardrail Triggered: The uploaded resume document contains insufficient content (less than 40 words). Please upload a complete, detailed candidate resume."
            )
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
