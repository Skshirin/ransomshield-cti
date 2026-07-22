import json
import joblib
from pathlib import Path

_MODEL_DIR = Path(__file__).parent
_model = None
_metadata = None


def load_model():
    """
    Loads the trained model and its metadata into memory once, at service
    startup, rather than reading from disk on every prediction request.
    """
    global _model, _metadata

    model_path = _MODEL_DIR / "model.pkl"
    metadata_path = _MODEL_DIR / "model_metadata.json"

    if not model_path.exists():
        raise FileNotFoundError(
            f"Model file not found at {model_path}. Run train_model.py first."
        )

    _model = joblib.load(model_path)
    with open(metadata_path) as f:
        _metadata = json.load(f)

    return _model, _metadata


def get_model():
    if _model is None:
        raise RuntimeError("Model not loaded. Call load_model() at startup first.")
    return _model, _metadata