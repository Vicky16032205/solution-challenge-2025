import io
import os
import re
import json
import bleach
import logging
import google.generativeai as genai
from dotenv import load_dotenv
from PyPDF2 import PdfReader
from typing import List, Tuple, Dict

logging.basicConfig(level=logging.WARNING)

load_dotenv()

def generate_questions_from_resume(resume_text: str, interview_type: str) -> List[str]:
    try:
        api_key = os.getenv("GEMINI_HR_API_KEY") if interview_type == "hr" else os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = f"""Generate exactly 10 {"behavioral" if interview_type == "hr" else "technical"} 
        interview questions based STRICTLY on this resume:
        {resume_text[:3000]}

        RULES:
        1. Return ONLY 10 questions
        2. No explanations/intro text
        3. Use strict format: "1. [Question]?\\n2. [Question]?\\n..."
        4. Focus on {"team conflicts, leadership, cultural fit, soft skills" if interview_type == "hr" 
                   else "algorithms, system design, debugging, coding based logical problems"}
        5. Questions must be directly related to resume content
        """

        response = model.generate_content(prompt)
        return _strict_parse_questions(response.text)
    
    except Exception as e:
        return get_fallback_questions(interview_type)[:10]

def _strict_parse_questions(text: str) -> List[str]:
    questions = []
    # Match lines starting with numbers followed by . or ) and optional question mark
    pattern = r'^\s*\d+[\.\)]\s+(.+?)(\?|$)\s*'
    
    for match in re.finditer(pattern, text, re.MULTILINE):
        question = match.group(1).strip()
        if not question.endswith('?'):
            question += '?'  # Ensure question mark
        if 15 < len(question) < 250:
            questions.append(question)
    
    # Fallback: Ensure exactly 10 questions
    fallback = get_fallback_questions("hr" if "behavioral" in text else "technical")
    while len(questions) < 10:
        questions.append(fallback[len(questions) % len(fallback)])
    
    return questions[:10]
    
def analyze_resume_content(resume_text: str) -> Dict:
    try:
        genai.configure(api_key=os.getenv("GEMINI_HR_API_KEY"))
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = f"""Analyze the following resume and extract:
        - 3 key roles
        - 5 top technical skills
        - 3 soft skills
        Resume: {resume_text[:3000]}
        Format as JSON with keys: roles, skills, soft_skills"""
        
        response = model.generate_content(prompt)
        logging.debug("Raw analysis response: %s", response.text)
        result = parse_analysis(response.text)
        return {
            "roles": result.get("roles", []),
            "skills": result.get("skills", []),
            "soft_skills": result.get("soft_skills", [])
        }
    
    except Exception as e:
        logging.debug("analyze_resume_content error: %s", e)
        return get_fallback_analysis()

def parse_analysis(text: str) -> Dict:
    try:
        match = re.search(r'(\{.*\})', text, re.DOTALL)
        if match:
            json_str = match.group(1)
            return json.loads(json_str)
        else:
            logging.debug("No JSON block found in API response. Full response: %s", text)
            return get_fallback_analysis()
    except Exception as e:
        logging.debug("JSON parsing error: %s", e)
        return get_fallback_analysis()

def get_fallback_analysis() -> Dict:
    return {
        "roles": ["Software Engineer", "Full Stack Developer", "Tech Lead"],
        "skills": ["Python", "JavaScript", "AWS", "React", "Node.js"],
        "soft_skills": ["Team Leadership", "Communication", "Problem Solving"]
    }

def evaluate_technical_answer(question: str, answer: str) -> Tuple[str, int]:
    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = f"""
        Evaluate this technical answer and provide a 1-10 score:

        Question: {question}
        Answer: {answer}

        **Instructions**:
        1. Return a short, structured review in valid HTML.
        2. Use headings (<h2>, <h3>), paragraphs (<p>), and bulleted lists (<ul><li>).
        3. Begin with a heading "Structured Evaluation".
        4. Include a "Score" section, then a "Rationale" section.
        5. Include a "Structured Feedback" section with subheadings for Comprehension, Content, Technical Depth, and Clarity & Communication.
        6. End with "Recommendations for Improvement" as another heading, and list each recommendation as a bullet point.
        7. return your response as valid HTML only, with no code fences (no ```).
        8. Do not wrap your output in Markdown fences.
        9. If user directly gives a negative response like they don't know about this, then give them a zero score explaining them it's not a good approach to tackle any question..
        Return ONLY valid HTML, no extra explanations.
        """

        response = model.generate_content(prompt)
        feedback_html = format_feedback(response.text)  # Custom formatting
        score = extract_score(response.text)

        return feedback_html, score

    except Exception as e:
        return "<b>⚠️ Evaluation failed</b>", 5


def evaluate_hr_answer(question: str, answer: str, resume_text: str) -> Tuple[str, int]:
    try:
        # Validate inputs
        if not question or not answer:
            return "Invalid question or answer", 5
            
        genai.configure(api_key=os.getenv("GEMINI_HR_API_KEY"))
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Truncate long texts
        truncated_resume = resume_text[:2000]
        truncated_answer = answer[:1500]
        
        prompt = f"""Evaluate HR answer (0-10 score):
        Resume: {truncated_resume}
        Question: {question}
        Answer: {truncated_answer}
        If user directly say they do not know about the question, then give them a 0 score
        Provide score and feedback"""
        
        response = model.generate_content(prompt)
        return format_feedback(response.text), extract_score(response.text)
        
    except Exception as e:
        print(f"HR Evaluation Error: {str(e)}")
        return "<b>⚠️ Evaluation failed</b>", 5

def parse_questions(text: str) -> List[str]:
    questions = []
    for line in text.split('\n'):
        # Remove all markdown/numbering/prefixes
        line = re.sub(r'^\s*(\d+[\.\)]?|\-|\*)\s*', '', line).strip()
        # Skip empty lines and non-questions
        if line and len(line) > 15 and '?' in line[-3:]:
            questions.append(line)
    return questions[:10]  # Ensure exactly 10 questions

def generate_performance_report(session: dict) -> str:
    try:
        genai.configure(api_key=os.getenv("GEMINI_HR_API_KEY" if session["type"] == "hr" else "GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-2.0-flash')
        avg_score = sum(session["scores"])/len(session["scores"])
        formatted_avg = f"{avg_score:.1f}"
        interview_type = session["type"]

        # Handle HR-specific templates
        if interview_type == "hr":
            if avg_score < 2:
                return f'''
                <div class="hr-feedback">
                    <h3 class="score-header">Average Score: {formatted_avg}/10</h3>
                    <div class="critical-issues">
                        <h4>🔍 Behavioral Red Flags:</h4>
                        <ul>
                            <li>Lacked clear examples in responses</li>
                            <li>Poor communication of soft skills</li>
                        </ul>
                    </div>
                    <div class="recommendations">
                        <h4>📚 HR-specific Recommendations:</h4>
                        <ul>
                            <li>Practice STAR interview technique</li>
                            <li>Study company culture research</li>
                        </ul>
                    </div>
                </div>'''
            else:
                # HR interview with score >= 2
                prompt = f"""Generate HR feedback using THIS STRUCTURE:
                <div class="hr-feedback">
                    <h3 class="score-header">Average Score: {formatted_avg}/10</h3>
                    <div class="strengths">
                        <h4>✅ Strong Points:</h4>
                        <ul>
                            {"<li>Good communication skills</li>" if avg_score >= 4 else "<li>Showed basic understanding</li>"}
                        </ul>
                    </div>
                    <div class="improvements">
                        <h4>🔧 Areas to Develop:</h4>
                        <ul>
                            {"<li>Need more specific examples</li>" if avg_score < 4 else "<li>Could demonstrate more leadership</li>"}
                        </ul>
                    </div>
                    <div class="recommendations">
                        <h4>📚 Career Advice:</h4>
                        <ul>
                            <li>Practice behavioral questions</li>
                            <li>Research company values</li>
                        </ul>
                    </div>
                </div>
                RULES: Use HR-specific feedback, focus on soft skills and cultural fit"""

        # Handle Technical interviews
        else:
            if avg_score < 2:
                return f"""
                <div class="technical-feedback">
                    <h3 class="score-header">Average Score: {formatted_avg}/10</h3>
                    <div class="improvement">
                        <h4>🔧 Critical Issues:</h4>
                        <ul>
                            <li>No technical knowledge demonstrated</li>
                            <li>All answers were incomplete</li>
                        </ul>
                    </div>
                    <div class="recommendation">
                        <h4>📚 Recommendations:</h4>
                        <ul>
                            <li>Study core technical concepts</li>
                            <li>Practice basic problem-solving</li>
                        </ul>
                    </div>
                </div>"""
            else:
                # Technical interview with score >= 2
                prompt = f"""Generate feedback using THIS STRUCTURE:
                <div class="technical-feedback">
                    <h3 class="score-header">Average Score: {formatted_avg}/10</h3>
                    <div class="strength">
                        <h4>✅ What Worked:</h4>
                        <ul>
                            {"<li>Good problem-solving approach</li>" if avg_score >= 4 else "<li>Basic technical understanding</li>"}
                        </ul>
                    </div>
                    <div class="improvement">
                        <h4>🔧 Needs Improvement:</h4>
                        <ul>
                            {"<li>Need deeper system design knowledge</li>" if avg_score < 4 else "<li>Could optimize solutions further</li>"}
                        </ul>
                    </div>
                    <div class="recommendation">
                        <h4>📚 Recommendations:</h4>
                        <ul>
                            <li>Study design patterns</li>
                            <li>Practice time complexity analysis</li>
                        </ul>
                    </div>
                </div>
                RULES: Focus on technical skills and implementation details"""

        # Common processing for AI-generated responses
        response = model.generate_content(prompt)
        clean_html = bleach.clean(
            response.text,
            tags=['div', 'h3', 'h4', 'ul', 'li', 'p', 'br'],
            attributes={'class': True},
            strip=True
        )
        
        # Ensure score formatting
        clean_html = re.sub(
            r'\b\d+\.?\d*/10\b', 
            f"{formatted_avg}/10", 
            clean_html, 
            flags=re.IGNORECASE
        )
        
        return clean_html

    except Exception as e:
        return f"""
        <div class="error-feedback">
            <h3>Average Score: {formatted_avg}/10</h3>
            <p>Could not generate detailed report: {str(e)}</p>
        </div>"""

def get_fallback_questions(interview_type: str) -> List[str]:
    if interview_type == "hr":
        return [
            "Tell me about a time you resolved a team conflict",
            "Describe your ideal work environment",
            "How do you handle tight deadlines?",
            "What motivates you professionally?",
            "Share an example of receiving negative feedback"
        ]
    return [
        "Explain your technical background",
        "Describe a challenging technical problem you solved",
        "How do you approach system design?",
        "Explain your experience with version control",
        "What's your process for debugging complex issues?"
    ]


def format_feedback(text: str) -> str:
    # Replace “smart quotes”
    text = text.replace("“", '"').replace("”", '"')
    text = text.replace("```html", "").replace("```", "")
    text = re.sub(r'(\r?\n){2,}', '</p><p>', text)

    # Convert double-newlines to paragraph breaks
    # This ensures that if the model includes blank lines, we split them into paragraphs.
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    text_html = "".join(f"<p>{p}</p>" for p in paragraphs)

    # Convert lines that start with "- " into <li> items if you want to handle bullet points
    # (only if the model returns them that way)
    text_html = re.sub(r'<p>- (.*)</p>', r'<ul><li>\1</li></ul>', text_html)

    # If consecutive <ul> tags appear, merge them
    text_html = re.sub(r'</ul>\s*<ul>', '', text_html)

    # Bold anything in double-asterisks (optional)
    text_html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text_html)

    # Convert any "X/10" found to a special <span class="score"> format
    text_html = re.sub(r'(\d+)/10', r'<span class="score">\1/10</span>', text_html)

    return text_html

def extract_score(text: str) -> int:
    match = re.search(r'(\d+)/10', text)
    return min(10, max(0, int(match.group(1)))) if match else 1

