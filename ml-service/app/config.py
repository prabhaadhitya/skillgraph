import os
from pathlib import Path
from dotenv import load_dotenv

# Base paths
APP_DIR = Path(__file__).resolve().parent
ML_SERVICE_DIR = APP_DIR.parent
REPO_ROOT = ML_SERVICE_DIR.parent

# Load .env if present in ml-service or repo root
load_dotenv(ML_SERVICE_DIR / ".env")
load_dotenv(REPO_ROOT / ".env")

# Internal API key for service-to-service auth
# Prompt specifies: "every route except /health needs header X-Internal-Key equal to env INTERNAL_KEY"
INTERNAL_KEY = os.getenv("INTERNAL_KEY") or os.getenv("ML_INTERNAL_KEY") or "dev-internal-key"

PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")

# Shared seed & fixture paths
SEED_DIR = Path(os.getenv("SEED_DIR", str(REPO_ROOT / "shared" / "seed")))
FIXTURES_DIR = Path(os.getenv("FIXTURES_DIR", str(REPO_ROOT / "shared" / "fixtures")))
DATA_DIR = ML_SERVICE_DIR / "data"
