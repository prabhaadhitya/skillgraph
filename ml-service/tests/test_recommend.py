"""
Tests for ML service /recommend and /model-info endpoints.
Verifies:
- Only skills with gap > 0 are returned
- Recommendations are sorted by score descending
- Output structure matches { items: [{skillSlug, score}], model: {name, version} }
- X-Internal-Key authentication enforcement
- 503 service unavailable handling when model is missing
- /model-info includes algorithm name, "trainedOn": "synthetic", and version
"""

from pathlib import Path
from fastapi.testclient import TestClient
import pytest
from app.main import app, load_model_and_metadata
import app.main as main_module
from app.config import INTERNAL_KEY

client = TestClient(app)
AUTH_HEADERS = {"X-Internal-Key": INTERNAL_KEY}


def test_recommend_auth_required():
    """POST /recommend rejects requests without or with wrong X-Internal-Key."""
    # Without key
    res = client.post("/recommend", json={"career": "machine-learning-engineer"})
    assert res.status_code == 401

    # With invalid key
    res = client.post(
        "/recommend",
        json={"career": "machine-learning-engineer"},
        headers={"X-Internal-Key": "wrong-secret-key"},
    )
    assert res.status_code == 401


def test_recommend_returns_only_skills_with_gap_and_sorted():
    """POST /recommend returns only skills where requiredLevel > studentLevel, sorted by score desc."""
    payload = {
        "career": "machine-learning-engineer",
        "profile": {
            "python": 4,  # Python requiredLevel is 4 -> gap = 0 (MUST NOT appear)
            "statistics": 1,  # Statistics requiredLevel is 4 -> gap = 3 (candidate)
        },
        "limit": 5,
    }

    res = client.post("/recommend", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200

    data = res.json()
    assert "items" in data
    assert "model" in data
    assert "name" in data["model"]
    assert "version" in data["model"]

    items = data["items"]
    assert len(items) > 0
    assert len(items) <= 5

    # Python must NOT be recommended because student level = 4 (gap = 0)
    slugs = [item["skillSlug"] for item in items]
    assert "python" not in slugs

    # Verify each item has skillSlug and score
    for item in items:
        assert "skillSlug" in item
        assert "score" in item
        assert isinstance(item["score"], float)

    # Verify sorted strictly descending by score
    scores = [item["score"] for item in items]
    assert scores == sorted(scores, reverse=True)


def test_recommend_flexible_payload_shapes():
    """POST /recommend accepts both { career, profile, limit } and { careerSlug, proficiencies, topK }."""
    payload = {
        "careerSlug": "machine-learning-engineer",
        "proficiencies": {"python": 4},
        "topK": 3,
    }

    res = client.post("/recommend", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) <= 3
    assert all(item["skillSlug"] != "python" for item in data["items"])


def test_recommend_missing_model_returns_503():
    """When loaded model is None, /recommend returns 503 SERVICE UNAVAILABLE."""
    original_model = main_module._loaded_model
    try:
        main_module._loaded_model = None
        main_module._model_load_error = "Model file missing"

        res = client.post(
            "/recommend",
            json={"career": "machine-learning-engineer", "profile": {}},
            headers=AUTH_HEADERS,
        )
        assert res.status_code == 503
        assert "missing" in res.json().get("detail", "").lower()
    finally:
        main_module._loaded_model = original_model


def test_model_info_endpoint():
    """GET /model-info returns algorithm name, trainedOn: synthetic, version, and metrics."""
    res = client.get("/model-info", headers=AUTH_HEADERS)
    assert res.status_code == 200

    data = res.json()
    assert data["trainedOn"] == "synthetic"
    assert data["trainingData"] == "synthetic"
    assert "algorithm" in data
    assert "version" in data
    assert "metrics" in data
    assert "ml" in data["metrics"]
    assert "baseline" in data["metrics"]
    assert data.get("available") is True

    # Test alias /model/info as well
    res_alias = client.get("/model/info", headers=AUTH_HEADERS)
    assert res_alias.status_code == 200
    assert res_alias.json()["trainedOn"] == "synthetic"
