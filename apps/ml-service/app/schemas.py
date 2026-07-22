from pydantic import BaseModel, Field


class BehaviourFeatures(BaseModel):
    """
    One row of behavioural features for a single observed event (a file
    operation, process creation, registry change, etc.), computed by the
    Windows agent exactly as they were computed for the training dataset.
    Field names with hyphens in the original dataset (process-related, etc.)
    use Python-safe names here with an alias mapping back to the original.
    """
    File_Delete_archived: int
    File_created: int
    File_creation_time_changed: int
    Pipe_Created: int
    Process_Create: int
    Registry_value_set: int
    process_related: int = Field(alias="process-related")
    network_related: int = Field(alias="network-related")
    file_related: int = Field(alias="file-related")
    suspicious_path: int
    system_executable: int
    path_length: int
    directory_depth: int
    process_name_length: int
    process_vs_parent_freq_ratio: float
    executable_depth_diff: int
    parent_is_system_executable: int
    extension_similarity: int
    file_name_entropy: float

    class Config:
        populate_by_name = True


class PredictionRequest(BaseModel):
    endpoint_id: str
    organization_id: str
    features: BehaviourFeatures


class PredictionResponse(BaseModel):
    risk_score: int
    is_ransomware: bool
    confidence: float
    model_version: str