from pydantic import BaseModel
from typing import List, Optional


class BehaviourEvent(BaseModel):
    """
    A single raw event reported by the Windows agent — a process start,
    a burst of file renames, etc. The ML model will eventually take a
    sequence of these and decide whether they look like ransomware.
    """
    event_type: str
    description: str
    timestamp: str


class PredictionRequest(BaseModel):
    endpoint_id: str
    organization_id: str
    events: List[BehaviourEvent]


class PredictionResponse(BaseModel):
    risk_score: int
    is_ransomware: bool
    matched_patterns: List[str]
    model_version: str