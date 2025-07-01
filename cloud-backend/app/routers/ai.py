import os
import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from ..schemas import AIRequest, AIResponse
from rich import print

# Use environment variable or fallback to hardcoded API key (for dev only)
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "AIzaSyAHuUAU4UWCr7GGjc0wSF7FOwK_PCj79nM")

# Gemini model setup
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

# Create router (not a separate app)
router = APIRouter()

# Core Gemini handler
def ask_gemini(prompt: str) -> str:
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"❌ Error: {e}"

# POST /api/ai/ask endpoint
@router.post("/ask", response_model=AIResponse)
async def handle_ai(request_data: AIRequest):
    user_prompt = request_data.prompt
    full_prompt = f"You are a Linux command-line assistant. {user_prompt}. Only return the exact command to run. No explanation. No alternatives."
    
    print(f"[cyan]→ Prompt received: {user_prompt}[/cyan]")
    result = ask_gemini(full_prompt)
    print(f"[green]← Response: {result}[/green]")

    return AIResponse(result=result)
