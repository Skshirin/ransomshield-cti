import requests
import config as cfg


def get_prediction(features: dict) -> dict:
    payload = {
        "endpoint_id": cfg.ENDPOINT_ID,
        "organization_id": cfg.ORGANIZATION_ID,
        "features": features,
    }
    response = requests.post(f"{cfg.ML_SERVICE_URL}/predict/", json=payload, timeout=10)
    response.raise_for_status()
    return response.json()


def report_detection(risk_score: int, indicators: list):
    payload = {
        "organizationId": cfg.ORGANIZATION_ID,
        "endpointId": cfg.ENDPOINT_ID,
        "riskScore": risk_score,
        "indicators": indicators,
        "modelVersion": "agent-v0.1",
    }
    headers = {"x-api-key": cfg.BACKEND_API_KEY}
    response = requests.post(
        f"{cfg.BACKEND_API_URL}/api/detections/ingest", json=payload, headers=headers, timeout=10
    )
    response.raise_for_status()
    return response.json()