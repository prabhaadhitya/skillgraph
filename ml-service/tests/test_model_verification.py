"""
Unit tests for ML model artifact verification during deployment and startup.
"""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.main import app
import app.config as config
from app.config import (
    MODEL_FILE,
    MODEL_INFO_FILE,
    validate_production_model,
)
from app.verify_model import verify_model_artifact

client = TestClient(app)


def test_verify_model_artifact_success():
    """verify_model_artifact returns True when trained model file exists."""
    assert MODEL_FILE.exists(), f"Model file must exist at {MODEL_FILE}"
    assert verify_model_artifact(MODEL_FILE, MODEL_INFO_FILE) is True


def test_verify_model_artifact_failure_when_missing(tmp_path):
    """verify_model_artifact returns False when model file is absent."""
    missing_file = tmp_path / "nonexistent_model.joblib"
    assert verify_model_artifact(missing_file, MODEL_INFO_FILE) is False


def test_validate_production_model_raises_in_production(tmp_path):
    """validate_production_model raises RuntimeError if model is missing in production."""
    missing_file = tmp_path / "missing.joblib"
    with pytest.raises(RuntimeError, match="ML service deployment failed: Model artifact not found"):
        validate_production_model(missing_file, is_prod=True)


def test_validate_production_model_passes_when_model_exists():
    """validate_production_model passes without error when model exists."""
    validate_production_model(MODEL_FILE, is_prod=True)
    validate_production_model(MODEL_FILE, is_prod=False)


def test_health_endpoint_healthy_when_model_loaded():
    """GET /health returns 200 and modelLoaded True when model is present."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["modelLoaded"] is True


def test_health_endpoint_503_in_production_when_unloaded(monkeypatch):
    """GET /health returns 503 Service Unavailable in production when model is not loaded."""
    monkeypatch.setattr(config, "IS_PRODUCTION", True)
    import app.main as main_module
    monkeypatch.setattr(main_module, "_loaded_model", None)
    monkeypatch.setattr(main_module, "_model_load_error", "Model artifact unreadable")

    response = client.get("/health")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "unhealthy"
    assert data["modelLoaded"] is False
    assert "error" in data
