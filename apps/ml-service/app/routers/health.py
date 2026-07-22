from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter()


@router.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "ml-service",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }