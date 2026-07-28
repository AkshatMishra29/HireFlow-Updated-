from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from database import db
from auth import require_role
from services.llm import llm_call, parse_json_from_llm

router = APIRouter(prefix="/copilot", tags=["Recruiter Copilot"])

@router.post("/query")
async def copilot_query(
    payload: dict,
    current_user: dict = Depends(require_role(["hr"]))
):
    """
    Recruiter Copilot Agent:
    Accepts natural-language recruiter questions, retrieves candidate application & AI screening data from MongoDB,
    passes context to LLM, returns grounded answer citing candidate sources, and logs query for auditability.
    """
    query_text = payload.get("query")
    job_id = payload.get("job_id")

    if not query_text or not query_text.strip():
        raise HTTPException(status_code=400, detail="Query text is required")

    # Retrieve context applications
    app_query = {}
    if job_id:
        app_query["job_id"] = job_id

    applications = await db.applications.find(app_query).to_list(50)
    context_docs = []

    for app in applications:
        cand_email = app.get("candidate_id")
        user_doc = await db.users.find_one({"email": cand_email})
        cand_name = user_doc.get("full_name") or user_doc.get("name") if user_doc else cand_email.split("@")[0].capitalize()

        job_doc = await db.jobs.find_one({"_id": app.get("job_id")}) if hasattr(app.get("job_id"), "binary") else None
        job_title = job_doc.get("title") if job_doc else "Software Opening"

        screening = await db.screening_results.find_one({"resume_id": app.get("resume_id")})
        score = screening.get("overall_score", "N/A") if screening else "N/A"
        summary = screening.get("summary", "No screening evaluation on file") if screening else ""

        context_docs.append({
            "candidate_id": cand_email,
            "candidate_name": cand_name,
            "job_title": job_title,
            "status": app.get("status", "applied"),
            "ai_score": score,
            "screening_summary": summary
        })

    system_prompt = (
        "You are HireFlow Recruiter Copilot, an elite AI talent acquisition assistant.\n"
        "Analyze candidate applications, evaluation scores, and screening summaries accurately.\n"
        "Provide direct, concise, and structured answers with bullet points.\n"
        "Always cite candidate names and emails explicitly when answering queries.\n"
        "Return valid JSON with this structure:\n"
        "{\n"
        '  "answer": "Clear, well-structured analytical response with bullet points if listing candidate details.",\n'
        '  "cited_candidates": ["Candidate Name (email@domain.com)", ...]\n'
        "}"
    )

    user_prompt = f"RECRUITER QUESTION:\n{query_text}\n\nCANDIDATE DATA CONTEXT:\n{context_docs}"

    try:
        raw_res, model_used, tokens = llm_call(system_prompt, user_prompt)
        parsed = parse_json_from_llm(raw_res)
        answer = parsed.get("answer", raw_res)
        cited = parsed.get("cited_candidates", [])
    except Exception as e:
        answer = f"Based on {len(context_docs)} candidate profiles retrieved: " + str(e)
        cited = [c["candidate_name"] for c in context_docs[:3]]

    now_iso = datetime.utcnow().isoformat()
    log_doc = {
        "user_email": current_user["email"],
        "user_role": current_user["role"],
        "query": query_text,
        "answer": answer,
        "cited_candidates": cited,
        "created_at": now_iso
    }
    await db.copilot_logs.insert_one(log_doc)

    return {
        "query": query_text,
        "answer": answer,
        "cited_candidates": cited,
        "created_at": now_iso
    }
