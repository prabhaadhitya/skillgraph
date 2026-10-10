"""
Tests for authentication middleware, key validation, and health check endpoint.
Verifies that:
- /health is accessible without authentication
- All other endpoints require valid X-Internal-Key header
- Missing, empty, and mismatched keys are rejected with 401
- Requests are rejected when server key is unconfigured
- Production startup requires a strong matching key and rejects weak placeholders
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
import app.config as config
from app.config import (
    INTERNAL_KEY,
    is_strong_key,
    validate_production_key,
)

client = TestClient(app)


def test_health_endpoint_public():
    """GET /health is accessible without headers."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "modelLoaded" in data


def test_protected_route_missing_key():
    """Protected endpoints reject requests without X-Internal-Key."""
    response = client.get("/model/info")
    assert response.status_code == 401
    assert "detail" in response.json()

    post_resp = client.post("/recommend", json={"careerSlug": "software-developer"})
    assert post_resp.status_code == 401


def test_protected_route_empty_key():
    """Protected endpoints reject requests with empty X-Internal-Key."""
    headers = {"X-Internal-Key": ""}
    response = client.get("/model/info", headers=headers)
    assert response.status_code == 401
    assert "detail" in response.json()

    post_resp = client.post(
        "/recommend",
        json={"careerSlug": "software-developer"},
        headers=headers,
    )
    assert post_resp.status_code == 401


def test_protected_route_mismatched_key():
    """Protected endpoints reject requests with wrong/mismatched X-Internal-Key."""
    headers = {"X-Internal-Key": "completely-wrong-internal-key-12345"}
    response = client.get("/model/info", headers=headers)
    assert response.status_code == 401

    post_resp = client.post(
        "/recommend",
        json={"careerSlug": "software-developer"},
        headers=headers,
    )
    assert post_resp.status_code == 401


def test_protected_route_valid_key():
    """Protected endpoints allow requests with matching X-Internal-Key."""
    headers = {"X-Internal-Key": config.INTERNAL_KEY}
    response = client.get("/model/info", headers=headers)
    assert response.status_code == 200

    post_resp = client.post(
        "/recommend",
        json={"careerSlug": "software-developer", "proficiencies": {}},
        headers=headers,
    )
    assert post_resp.status_code == 200
    assert "items" in post_resp.json()


def test_protected_route_when_server_key_unconfigured(monkeypatch):
    """When server INTERNAL_KEY is unconfigured or empty, any protected request is rejected."""
    monkeypatch.setattr(config, "INTERNAL_KEY", "")
    headers = {"X-Internal-Key": "some-attempted-key"}

    response = client.get("/model/info", headers=headers)
    assert response.status_code == 401
    assert "detail" in response.json()

    post_resp = client.post(
        "/recommend",
        json={"careerSlug": "software-developer"},
        headers=headers,
    )
    assert post_resp.status_code == 401


def test_key_strength_checker():
    """is_strong_key requires at least 16 chars and rejects placeholders."""
    assert not is_strong_key("")
    assert not is_strong_key("short")
    assert not is_strong_key("dev-internal-key")
    assert not is_strong_key("your_ml_internal_key_placeholder")
    assert not is_strong_key("changeme")
    assert not is_strong_key("secret")
    assert is_strong_key("a-very-strong-production-token-12345")


def test_production_startup_validation_missing_key():
    """In production, missing key raises RuntimeError."""
    with pytest.raises(RuntimeError, match="INTERNAL_KEY .* required in production"):
        validate_production_key("", is_prod=True)


def test_production_startup_validation_weak_key():
    """In production, weak or placeholder key raises RuntimeError."""
    with pytest.raises(RuntimeError, match="must be a strong secret of at least 16 characters"):
        validate_production_key("dev-internal-key", is_prod=True)

    with pytest.raises(RuntimeError, match="must be a strong secret of at least 16 characters"):
        validate_production_key("too-short-key", is_prod=True)


def test_production_startup_validation_strong_key():
    """In production, strong key passes validation."""
    validate_production_key("strong-ml-secret-token-production-2026", is_prod=True)


def test_development_startup_allows_empty_key():
    """In non-production, missing key does not raise at startup."""
    validate_production_key("", is_prod=False)
