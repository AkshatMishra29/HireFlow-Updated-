from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from bson import ObjectId
from database import db
from auth import require_role, get_current_user
from services.llm import llm_call, parse_json_from_llm
from services.rag_kb import rebuild_faiss_index, retrieve_top_k, chunk_text

router = APIRouter(prefix="/assistant", tags=["Module 4 AI Assistant"])

def serialize_doc(doc):
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

# --- 1. RAG COMPANY DOCUMENTS ---

@router.post("/company-docs")
async def add_company_document(
    payload: dict,
    current_user: dict = Depends(require_role(["hr"]))
):
    """HR adds a text company policy / handbook document to the RAG knowledge base."""
    title = payload.get("title")
    content = payload.get("content")
    doc_type = payload.get("doc_type", "general")

    if not title or not content:
        raise HTTPException(status_code=400, detail="Title and content are required")

    doc_item = {
        "title": title,
        "content": content,
        "doc_type": doc_type,
        "created_by": current_user["email"],
        "created_at": datetime.utcnow().isoformat()
    }

    res = await db.company_documents.insert_one(doc_item)
    
    # Rebuild FAISS index with all docs in DB
    all_docs = await db.company_documents.find().to_list(100)
    rebuild_faiss_index(all_docs)

    created = await db.company_documents.find_one({"_id": res.inserted_id})
    return serialize_doc(created)


@router.get("/company-docs")
async def list_company_documents(
    current_user: dict = Depends(get_current_user)
):
    """List all company knowledge base documents."""
    cursor = db.company_documents.find().sort("created_at", -1)
    docs = []
    async for doc in cursor:
        docs.append(serialize_doc(doc))
    return docs


@router.delete("/company-docs/{doc_id}")
async def delete_company_document(
    doc_id: str,
    current_user: dict = Depends(require_role(["hr"]))
):
    """Delete a document from RAG KB."""
    if not ObjectId.is_valid(doc_id):
        raise HTTPException(status_code=400, detail="Invalid doc ID")
    await db.company_documents.delete_one({"_id": ObjectId(doc_id)})
    
    # Rebuild FAISS index
    all_docs = await db.company_documents.find().to_list(100)
    rebuild_faiss_index(all_docs)
    return {"message": "Document deleted"}


# --- 2. FAQ AGENT (RAG Grounded Q&A) ---

@router.post("/faq")
async def faq_assistant(
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    """Candidate or HR asks a question; retrieves context via FAISS RAG and grounds LLM answer."""
    question = payload.get("question")
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    # Load FAISS index if empty
    all_docs = await db.company_documents.find().to_list(100)
    rebuild_faiss_index(all_docs)

    # Retrieve context chunks
    relevant_chunks = retrieve_top_k(question, k=3)
    context_str = "\n\n".join([f"Document: {c['title']}\nContent: {c['text']}" for c in relevant_chunks])

    system_prompt = """You are HireFlow AI Corporate Assistant. Answer the candidate or HR user's question accurately using ONLY the provided company knowledge base context.
If the answer is not contained in the context, politely state that the information is not present in the current company documents and offer general guidance.
Keep responses professional, concise, and helpful."""

    user_prompt = f"Company Documents Context:\n{context_str or 'No specific company documents uploaded yet.'}\n\nUser Question: {question}"

    answer, model_used, _ = llm_call(system_prompt, user_prompt)

    # Log to chat_history
    await db.chat_history.insert_one({
        "user_id": current_user["email"],
        "agent_type": "faq",
        "question": question,
        "response": answer,
        "context_used": [c["title"] for c in relevant_chunks],
        "created_at": datetime.utcnow().isoformat()
    })

    return {
        "question": question,
        "answer": answer,
        "sources": list(set([c["title"] for c in relevant_chunks])),
        "model_used": model_used
    }


# --- 3. RESUME ADVISOR AGENT ---

@router.post("/resume-advice")
async def resume_advisor(
    payload: dict,
    current_user: dict = Depends(require_role(["candidate"]))
):
    """Provides ATS optimization, missing keywords, and section feedback for candidate resume vs targeted job."""
    application_id = payload.get("application_id")
    resume_id = payload.get("resume_id")

    resume_text = ""
    job_info = ""
    missing_skills = []

    if application_id and ObjectId.is_valid(application_id):
        app = await db.applications.find_one({"_id": ObjectId(application_id)})
        if app:
            job = await db.jobs.find_one({"_id": ObjectId(app["job_id"])})
            if job:
                job_info = f"Title: {job.get('title')}\nDescription: {job.get('description')}\nMust-Have Skills: {', '.join(job.get('must_have_skills', []))}"
            
            sr = await db.screening_results.find_one({"job_id": app["job_id"], "candidate_id": current_user["email"]})
            if sr:
                missing_skills = sr.get("missing_skills", [])

    if not resume_text and resume_id and ObjectId.is_valid(resume_id):
        r_doc = await db.resumes.find_one({"_id": ObjectId(resume_id)})
        if r_doc:
            resume_text = f"Filename: {r_doc.get('filename')}"

    system_prompt = """You are an expert ATS Resume Coach. Analyze the candidate's profile and provide actionable optimization tips.
Return valid JSON with this exact structure:
{
  "summary": "1-2 sentence overall resume assessment",
  "missing_keywords": ["keyword1", "keyword2"],
  "formatting_tips": ["tip1", "tip2"],
  "weak_sections": ["section feedback 1", "section feedback 2"],
  "recommended_action": "Primary recommendation"
}"""

    user_prompt = f"Candidate Profile / Application:\nTarget Job: {job_info or 'General Software Engineering Role'}\nIdentified Missing Skills: {missing_skills}\n\nProvide tailored resume optimization advice."

    resp, _, _ = llm_call(system_prompt, user_prompt)
    advice_json = parse_json_from_llm(resp)

    await db.chat_history.insert_one({
        "user_id": current_user["email"],
        "agent_type": "resume_advisor",
        "question": f"Resume Advice for {application_id or 'Resume'}",
        "response": advice_json,
        "created_at": datetime.utcnow().isoformat()
    })

    return advice_json


# --- 4. INTERVIEW COACH AGENT ---

@router.post("/interview-coach")
async def interview_coach(
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    """Generates customized candidate interview questions targeting specific skill gaps & evaluation rationale."""
    job_id = payload.get("job_id")
    application_id = payload.get("application_id")
    job_title = "Software Developer"
    must_skills = []
    gap_summary = ""

    if application_id and ObjectId.is_valid(application_id):
        app_doc = await db.applications.find_one({"_id": ObjectId(application_id)})
        if app_doc:
            job_id = app_doc.get("job_id", job_id)
            # Find candidate AI screening result gaps
            screening_result = await db.screening_results.find_one({"job_id": job_id, "resume_id": app_doc.get("resume_id")})
            if screening_result:
                evidence = screening_result.get("evidence_quotes", [])
                gaps = [e.get("gap_analysis") or e.get("quote") for e in evidence if isinstance(e, dict) and (e.get("gap_analysis") or "missing" in str(e).lower())]
                gap_summary = "\n".join(gaps[:3]) if gaps else str(screening_result.get("summary", ""))

    if job_id and ObjectId.is_valid(job_id):
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        if job:
            job_title = job.get("title", job_title)
            must_skills = job.get("must_have_skills", [])

    system_prompt = """You are an elite Recruiter & Technical Interviewer. Generate targeted interview questions specifically targeting the candidate's technical gaps and resume weaknesses for the job.
Return valid JSON with this exact structure:
{
  "role": "Job Title",
  "questions": [
    {
      "type": "Gap Assessment / Technical / Behavioral",
      "question": "Question text probing the candidate gap",
      "target_gap": "The specific gap or skill being probed",
      "hint": "Ideal response signals to look for"
    }
  ]
}"""

    user_prompt = f"Target Role: {job_title}\nKey Required Skills: {must_skills}\nCandidate Identified Gaps / Rationale:\n{gap_summary or 'No explicit gaps identified; probe advanced architecture and domain edge cases.'}\n\nGenerate 4 high-yield targeted interview questions targeting identified skill gaps."

    resp, _, _ = llm_call(system_prompt, user_prompt)
    coach_json = parse_json_from_llm(resp)

    await db.chat_history.insert_one({
        "user_id": current_user["email"],
        "agent_type": "interview_coach",
        "question": f"Targeted Interview Questions for {job_title}",
        "response": coach_json,
        "created_at": datetime.utcnow().isoformat()
    })

    return coach_json
