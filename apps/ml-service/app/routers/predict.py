from fastapi import APIRouter
from app.schemas import PredictionRequest, PredictionResponse
from app.ml.model_loader import get_model
import pandas as pd

router = APIRouter()

# Threshold above which a prediction is flagged as ransomware. 0.5 is the
# standard default; can be tuned lower later to further favor recall
# (catching more true ransomware at the cost of more false alarms).
RISK_THRESHOLD = 0.5


@router.post("/", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    model, metadata = get_model()

    # Build a single-row DataFrame in the exact column order the model
    # was trained on — order matters for tree-based models' internal
    # feature indexing.
    feature_dict = request.features.model_dump(by_alias=True)
    row = pd.DataFrame([[feature_dict[col] for col in metadata["feature_order"]]],
                       columns=metadata["feature_order"])

    probability = model.predict_proba(row)[0][1]
    risk_score = int(round(probability * 100))
    is_ransomware = probability >= RISK_THRESHOLD

    return PredictionResponse(
        risk_score=risk_score,
        is_ransomware=is_ransomware,
        confidence=round(float(probability), 4),
        model_version=metadata["model_version"],
    )