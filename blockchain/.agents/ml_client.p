import requests
from config import ML_SERVICE_URL, BACKEND_API_URL, BACKEND_API_KEY, ORGANIZATION_ID, ENDPOINT_ID


def get_prediction(features: dict) -> dict:
    payload = {
        "endpoint_id": ENDPOINT_ID,
        "organization_id": ORGANIZATION_ID,
        "features": features,
    }
    response = requests.post(f"{ML_SERVICE_URL}/predict/", json=payload, timeout=10)
    response.raise_for_status()
    return response.json()


def report_detection(risk_score: int, indicators: list):
    """
    Reports a detection to the backend's ML-ingestion endpoint — the same
    /api/detections/ingest route you've been testing manually with
    PowerShell, now called automatically by the agent instead.
    """
    payload = {
        "organizationId": ORGANIZATION_ID,
        "endpointId": ENDPOINT_ID,
        "riskScore": risk_score,
        "indicators": indicators,
        "modelVersion": "agent-v0.1",
    }
    headers = {"x-api-key": BACKEND_API_KEY}
    response = requests.post(
        f"{BACKEND_API_URL}/api/detections/ingest", json=payload, headers=headers, timeout=10
    )
    response.raise_for_status()
    return response.json()