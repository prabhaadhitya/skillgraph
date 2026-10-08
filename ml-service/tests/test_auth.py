"""
Tests for authentication middleware and health check endpoint.
Verifies that:
- /health is accessible without authentication
- All other endpoints require valid X-Internal-Key header
"""

from fastapi.testclient import TestClient
from app.main import app
from app.config import INTERNAL_KEY

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


def test_protected_route_invalid_key():
    """Protected endpoints reject requests with wrong X-Internal-Key."""
    headers = {"X-Internal-Key": "invalid-secret-key-123"}
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
    headers = {"X-Internal-Key": INTERNAL_KEY}
    response = client.get("/model/info", headers=headers)
    assert response.status_code == 200

    post_resp = client.post(
        "/recommend",
        json={"careerSlug": "software-developer", "proficiencies": {}},
        headers=headers,
    )
    assert post_resp.status_code == 200
    assert "items" in post_resp.json()
