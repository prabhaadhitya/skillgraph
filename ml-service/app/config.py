import os
from pathlib import Path
from dotenv import load_dotenv

# Base paths
APP_DIR = Path(__file__).resolve().parent
ML_SERVICE_DIR = APP_DIR.parent
REPO_ROOT = ML_SERVICE_DIR.parent

# Load .env if present in ml-service, repo root, or backend
load_dotenv(ML_SERVICE_DIR / ".env")
load_dotenv(REPO_ROOT / ".env")
load_dotenv(REPO_ROOT / "backend" / ".env")

NODE_ENV = (os.getenv("NODE_ENV") or os.getenv("ENVIRONMENT") or "development").lower()
IS_PRODUCTION = NODE_ENV == "production"

# Internal API key for service-to-service auth (NO hardcoded fallback)
INTERNAL_KEY = (os.getenv("INTERNAL_KEY") or os.getenv("ML_INTERNAL_KEY") or "").strip()

WEAK_PLACEHOLDERS = {
    "dev-internal-key",
    "your_ml_internal_key_placeholder",
    "your_development_shared_internal_key_min_16_chars",
    "changeme",
    "secret",
    "password",
    "admin",
    "test",
    "default",
}


def is_strong_key(key: str) -> bool:
    if not key or len(key) < 16:
        return False
    if key.lower() in WEAK_PLACEHOLDERS:
        return False
    return True


def validate_production_key(key: str, is_prod: bool) -> None:
    if is_prod:
        if not key:
            raise RuntimeError(
                "ML service startup failed: INTERNAL_KEY (or ML_INTERNAL_KEY) environment variable is required in production."
            )
        if not is_strong_key(key):
            raise RuntimeError(
                "ML service startup failed: INTERNAL_KEY must be a strong secret of at least 16 characters in production (not a placeholder)."
            )


# Enforce in production on startup
validate_production_key(INTERNAL_KEY, IS_PRODUCTION)

PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")

# Shared seed & fixture paths
SEED_DIR = Path(os.getenv("SEED_DIR", str(REPO_ROOT / "shared" / "seed")))
FIXTURES_DIR = Path(os.getenv("FIXTURES_DIR", str(REPO_ROOT / "shared" / "fixtures")))
DATA_DIR = ML_SERVICE_DIR / "data"

# Model artifact & metrics paths
MODELS_DIR = ML_SERVICE_DIR / "models"
MODEL_FILE = Path(os.getenv("MODEL_PATH", str(MODELS_DIR / "model.joblib")))
MODEL_INFO_FILE = Path(os.getenv("MODEL_INFO_PATH", str(MODELS_DIR / "model_info.json")))
REPORTS_DIR = ML_SERVICE_DIR / "reports"
METRICS_FILE = Path(os.getenv("METRICS_PATH", str(REPORTS_DIR / "metrics.json")))


def validate_production_model(model_path: Path, is_prod: bool) -> None:
    if is_prod and not model_path.exists():
        raise RuntimeError(
            f"ML service deployment failed: Model artifact not found at {model_path}. "
            "In production, the trained model artifact (model.joblib) must be available at deployment. "
            "Ensure the build command executes synthetic data generation and model training."
        )


# Enforce in production on startup
validate_production_model(MODEL_FILE, IS_PRODUCTION)
