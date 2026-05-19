from fastapi import APIRouter
from datetime import datetime
from app.models.matcher import matcher
from app.config import settings

router = APIRouter()


@router.get("/health")
async def health():
    """
    GET /health
    Returns AI engine health status with model version.
    """
    return {
        "status": "ok",
        "model_version": settings.MODEL_VERSION,
        "last_retrained": matcher.last_retrained,
        "timestamp": datetime.utcnow().isoformat(),
    }
