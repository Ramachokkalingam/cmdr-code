import os
import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from ..schemas import AIRequest, AIResponse
from rich import print

# Required: no fallback. A committed key would be public the moment it is pushed.
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError(
        "GOOGLE_API_KEY is not set. Export it or add it to cloud-backend/.env "
        "(see .env.example). The AI endpoint cannot start without it."
    )

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
