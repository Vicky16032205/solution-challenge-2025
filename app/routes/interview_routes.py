# app/routes/interview_routes.py (updated)
from fastapi import APIRouter, UploadFile, HTTPException, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
import os
import io
import uuid
import time
import threading
from PyPDF2 import PdfReader
import google.generativeai as genai
from app.utils.interview_utils import *

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")
sessions = {}
SESSION_TIMEOUT = 1800  # 30 minutes

def cleanup_sessions():
    current_time = time.time()
    sessions_copy = sessions.copy()
    for sid, session in sessions_copy.items():
        if current_time - session["start_time"] > SESSION_TIMEOUT:
            del sessions[sid]
    threading.Timer(300, cleanup_sessions).start()

cleanup_sessions()

@router.post("/upload")
async def upload_resume(file: UploadFile, interview_type: str = Form(...)):
    try:
        contents = await file.read()
        
        # Add file type validation
        if file.content_type not in ["application/pdf", "text/plain"]:
            raise HTTPException(400, detail="Invalid file type. Only PDF/TXT allowed")

        # Process file content
        if file.content_type == "application/pdf":
            pdf = PdfReader(io.BytesIO(contents))
            resume_text = "\n".join([page.extract_text() for page in pdf.pages])
        else:
            resume_text = contents.decode("utf-8")

        # Generate questions
        questions = generate_questions_from_resume(resume_text, interview_type)
        if len(questions) != 10:
            questions = get_fallback_questions(interview_type)[:10]
        
        # Create session with unified questions key
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            "type": interview_type,
            "resume_text": resume_text,
            "questions": questions,  # Unified key for all question types
            "start_time": time.time(),
            "active": True,
            "current_index": 0,  # Single index for all question types
            "answers": [],
            "scores": []
        }

        return JSONResponse({
            "session_id": session_id,
            "questions": questions,
            "resume_preview": resume_text[:500] if file.content_type == "text/plain" else None,
            "redirect": f"/{interview_type}/interview?session_id={session_id}"
        })

    except UnicodeDecodeError:
        raise HTTPException(400, detail="Invalid text file encoding")
    except Exception as e:
        raise HTTPException(400, detail=f"Error processing file: {str(e)}")

@router.post("/evaluate_answer")
async def evaluate_answer_endpoint(
    session_id: str = Form(...),
    answer: str = Form(...),
    question_type: str = Form(...)
):
    try:
        session = sessions.get(session_id)
        if not session or not session["active"]:
            raise HTTPException(404, detail="Session not found")

        # Unified question handling
        current_index = session["current_index"]
        if current_index >= len(session["questions"]):
            raise HTTPException(400, detail="No more questions")

        question = session["questions"][current_index]
        
        # Evaluation logic
        if question_type == "technical":
            feedback, score = evaluate_technical_answer(question, answer)
        else:
            feedback, score = evaluate_hr_answer(question, answer, session["resume_text"])

        # Update session
        session["current_index"] += 1
        session.setdefault("answers", []).append(answer)
        session.setdefault("scores", []).append(score)

        return JSONResponse({
        "feedback": feedback,
        "score": score,
        "is_final_question": session["current_index"] + 1 >= len(session["questions"])
        })

    except Exception as e:
        print(f"Evaluation error: {str(e)}")  # Add logging
        raise HTTPException(500, detail=f"Evaluation failed: {str(e)}")

# Rest of the routes remain the same...
    
@router.get("/generate_hr_questions")
async def generate_hr_questions(session_id: str):
    try:
        session = sessions.get(session_id)
        if not session or not session["active"]:
            raise HTTPException(404, detail="Session not found")

        hr_questions = generate_questions_from_resume(
            session["resume_text"], 
            interview_type="hr"
        )
        session["hr_questions"] = hr_questions
        session["hr_index"] = 0

        return JSONResponse({
            "questions": hr_questions 
        })

    except Exception as e:
        raise HTTPException(500, detail=str(e))


@router.get("/analyze_resume")
async def analyze_resume(session_id: str):
    try:
        session = sessions.get(session_id)
        if not session or not session["active"]:
            raise HTTPException(404, detail="Session not found")

        analysis = analyze_resume_content(session["resume_text"])
        
        # Ensure list types
        return JSONResponse({
            "roles": list(analysis.get("roles", [])),
            "skills": list(analysis.get("skills", [])),
            "soft_skills": list(analysis.get("soft_skills", []))
        })

    except Exception as e:
        raise HTTPException(500, detail=str(e))
    
def generate_dsa_questions(resume_text: str = "") -> Dict[str, List[str]]:
    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = f"""Generate 30 DSA questions categorized by difficulty:
        - 10 easy (basic data structures, simple algorithms)
        - 10 medium (complex data structures, optimization problems)
        - 10 hard (system design, advanced algorithms)
        - for every question you generate dont include number with text.
        
        Return JSON format:
        {{
            "easy": ["question1", ...],
            "medium": ["question1", ...],
            "hard": ["question1", ...]
        }}
        """
        
        response = model.generate_content(prompt)
        return parse_dsa_response(response.text)
    
    except Exception as e:
        return get_fallback_dsa_questions()

# def generate_hr_questions2(resume_text: str = "") -> Dict[str, List[str]]:
#     try:
#         genai.configure(api_key=os.getenv("GEMINI_HR_API_KEY"))
#         model = genai.GenerativeModel('gemini-2.0-flash')
        
#         prompt = f"""Generate 30 behavioral interview questions covering:
#         - Teamwork and conflict resolution
#         - Leadership and decision making
#         - Communication and cultural fit
        
#         Return JSON format:
#         {{
#             "questions": ["question1", ...]
#         }}
#         """
        
#         response = model.generate_content(prompt)
#         return parse_hr_response(response.text)
    
#     except Exception as e:
#         return get_fallback_hr_questions()

def generate_hr_questions2(resume_text: str = "") -> Dict[str, List[Dict]]:
    try:
        genai.configure(api_key=os.getenv("GEMINI_HR_API_KEY"))
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = f"""Generate 30 behavioral interview questions with sample answers covering:
        - Teamwork and conflict resolution
        - Leadership and decision making
        - Communication and cultural fit
        
        Return JSON format:
        {{
            "questions": [
                {{"question": "question1", "answer": "sample answer1"}},
                ...
            ]
        }}
        """
        
        response = model.generate_content(prompt)
        return parse_hr_response(response.text)
    
    except Exception as e:
        return get_fallback_hr_questions()

def parse_dsa_response(text: str) -> Dict:
    try:
        json_str = re.search(r'\{.*\}', text, re.DOTALL).group()
        return json.loads(json_str)
    except:
        return get_fallback_dsa_questions()

# def parse_hr_response(text: str) -> Dict:
#     try:
#         json_str = re.search(r'\{.*\}', text, re.DOTALL).group()
#         return json.loads(json_str)
#     except:
#         return get_fallback_hr_questions()

def parse_hr_response(text: str) -> Dict:
    try:
        json_str = re.search(r'\{.*\}', text, re.DOTALL).group()
        data = json.loads(json_str)
        # Clean question text
        for item in data["questions"]:
            item["question"] = re.sub(r'^\d+\.?\s*', '', item["question"])
        return data
    except:
        return get_fallback_hr_questions()

def get_fallback_dsa_questions():
    return {
        "easy": ["", "", ...],
        "medium": ["", "", ...],
        "hard": ["", "", ...]
    }

# def get_fallback_hr_questions():
#     return {
#         "questions": [
#             "Tell me about a team conflict you resolved",
#             "Describe your leadership style",
#             ...
#         ]
#     }

def get_fallback_hr_questions():
    return {
        "questions": [
            {"question": "Tell me about a team conflict you resolved", 
             "answer": "In my previous role, I mediated a disagreement between team members by facilitating a discussion where each could express their views, leading to a mutually agreeable solution."},
            {"question": "Describe your leadership style",
             "answer": "I practice a collaborative leadership style, focusing on empowering team members while providing clear direction and support when needed."},
            # Add more fallback Q&A pairs...
        ]
    }

def clean_questions(questions: List[str]) -> List[str]:
    return [re.sub(r'^\d+\.?\s*', '', q) for q in questions]

@router.get("/dsa_questions", response_class=HTMLResponse)
async def dsa_questions_page(request: Request):  # Add request parameter
    try:
        questions = generate_dsa_questions()
        # Clean all questions
        cleaned = {
            "easy": clean_questions(questions["easy"]),
            "medium": clean_questions(questions["medium"]),
            "hard": clean_questions(questions["hard"])
        }
    except Exception as e:
        questions = get_fallback_dsa_questions()
        cleaned = questions
    
    return templates.TemplateResponse("dsa_questions.html", {
        "request": request,
        "easy": cleaned["easy"],
        "medium": cleaned["medium"],
        "hard": cleaned["hard"]
    })

# @router.get("/hr_questions", response_class=HTMLResponse)
# async def hr_questions_page(request: Request):  # Add request parameter
#     try:
#         questions = generate_hr_questions2()
#     except Exception as e:
#         questions = get_fallback_hr_questions()
    
#     return templates.TemplateResponse("hr_questions.html", {
#         "request": request,  # Pass request to context
#         "questions": questions["questions"]
#     })

@router.get("/hr_questions", response_class=HTMLResponse)
async def hr_questions_page(request: Request):
    try:
        questions_data = generate_hr_questions2()
    except Exception as e:
        questions_data = get_fallback_hr_questions()
    
    return templates.TemplateResponse("hr_questions.html", {
        "request": request,
        "questions_data": questions_data["questions"]
    })
    
@router.get("/generate_dsa_questions")
async def get_dsa_questions():
    return generate_dsa_questions()

@router.get("/generate_hr_questions2")
async def get_hr_questions():
    return generate_hr_questions2()

    
@router.get("/session_results/{session_id}")
async def get_session_results(session_id: str):
    try:
        session = sessions.get(session_id)
        if not session:
            raise HTTPException(404, detail="Session not found")

        analysis = {
            "total_questions": len(session["questions"]),
            "answered": len(session["answers"]),
            "average_score": sum(session["scores"])/len(session["scores"]),
            "scores": session["scores"],
            "answers": session["answers"],
            "feedback_report": generate_performance_report(session)
        }
        
        return JSONResponse(analysis)
    
    except Exception as e:
        raise HTTPException(500, detail=str(e))
    

@router.get("/", response_class=HTMLResponse)
async def home():
    with open("app/templates/index.html") as f:
        return f.read()

@router.get("/technical/interview", response_class=HTMLResponse)
async def technical_interview():
    with open("app/templates/technical/interview.html", encoding="utf-8") as f:
        return f.read()

@router.get("/hr/interview", response_class=HTMLResponse)
async def hr_interview():
    with open("app/templates/hr/interview.html", encoding="utf-8") as f:
        return f.read()