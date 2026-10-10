"""
ML Model Deployment Verification Script.
Ensures that the model artifact (model.joblib) and metadata exist and are valid.
Run during deployment / release verification:
    python -m app.verify_model
"""

import sys
from pathlib import Path
import joblib
from app.config import MODEL_FILE, MODEL_INFO_FILE


def verify_model_artifact(model_path: Path = MODEL_FILE, info_path: Path = MODEL_INFO_FILE) -> bool:
    """
    Verifies that the trained ML model artifact exists, can be loaded,
    and exposes a prediction interface.
    """
    print(f"Verifying ML model artifact at: {model_path}")
    if not model_path.exists():
        print(f"ERROR: Model artifact not found at {model_path}", file=sys.stderr)
        return False

    try:
        model = joblib.load(model_path)
        if not hasattr(model, "predict") and not hasattr(model, "predict_proba"):
            print("ERROR: Loaded model object does not implement predict or predict_proba", file=sys.stderr)
            return False
        print("[OK] Model artifact loaded successfully and implements predictor interface.")
    except Exception as e:
        print(f"ERROR: Failed to load model artifact: {e}", file=sys.stderr)
        return False

    if info_path.exists():
        print(f"[OK] Model metadata found at: {info_path}")
    else:
        print(f"[WARN] Model metadata not found at: {info_path}")

    return True


if __name__ == "__main__":
    success = verify_model_artifact()
    if not success:
        sys.exit(1)
    print("Deployment model artifact verification PASSED.")
    sys.exit(0)
