from fastapi import APIRouter
from app.schemas import PredictionRequest, PredictionResponse

router = APIRouter()

MODEL_VERSION = "v0.0.1-stub"


@router.post("/", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    """
    STUB — no real model yet. Always returns a hardcoded high-risk response
    so we can build and test the full pipeline (agent -> ML service ->
    backend ingest -> CTI generation) before the actual model exists.
    Replaced with a real trained classifier in a later milestone.
    """
    return PredictionResponse(
        risk_score=92,
        is_ransomware=True,
        matched_patterns=["MASS_FILE_RENAME", "HIGH_ENTROPY_WRITE_BURST"],
        model_version=MODEL_VERSION,
    )