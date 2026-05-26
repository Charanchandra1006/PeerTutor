from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.llm import llm_service

router = APIRouter()

class HintRequest(BaseModel):
    puzzle_type: str
    description: str
    current_state: str
    mistakes_made: int

@router.post("/hint")
async def generate_dynamic_hint(request: HintRequest):
    """
    Generate a dynamic hint based on the user's current puzzle state.
    """
    intensity = "vague and guiding"
    if request.mistakes_made > 2:
        intensity = "direct and specific but DO NOT give the exact answer"
    elif request.mistakes_made > 5:
        intensity = "very obvious, almost giving the answer"

    prompt = f"""
    You are an AI assistant in a hacker escape room game. The player is stuck on a puzzle.
    Puzzle Type: {request.puzzle_type}
    Objective: {request.description}
    Player's current state/code: 
    {request.current_state}
    
    The player has made {request.mistakes_made} mistakes so far.
    Provide a hint that is {intensity}. Keep it under 2 sentences. Speak like an AI system guide.
    """
    
    try:
        hint = await llm_service.generate_text(prompt)
        return {"hint": hint.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
