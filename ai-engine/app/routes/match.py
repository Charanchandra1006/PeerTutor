from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.models.matcher import matcher
from app.services.db import get_db
from app.services.cache import get_redis
from app.config import settings
import json

router = APIRouter()


class MatchRequest(BaseModel):
    student_id: str
    subject: str
    top_n: Optional[int] = 10


@router.post("")
async def match_tutors(request: MatchRequest):
    """
    POST /match
    Returns ranked tutors with match scores for a student.
    Results cached in Redis for 24h per (student_id, subject) pair.
    """
    redis = get_redis()
    cache_key = f"ai:match:{request.student_id}:{request.subject}"

    # Check cache
    if redis:
        cached = await redis.get(cache_key)
        if cached:
            return {"success": True, "data": json.loads(cached), "cached": True}

    # Compute matches
    db = get_db()
    results = await matcher.match(db, request.student_id, request.subject, request.top_n)

    # Cache results
    if redis and results:
        await redis.set(cache_key, json.dumps(results), ex=settings.AI_CACHE_TTL)

    return {"success": True, "data": results, "cached": False}
