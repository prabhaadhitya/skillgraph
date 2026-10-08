"""
SkillGraph ML Service - FastAPI application.
Provides recommendation and model info endpoints for backend consumption.
Protected by shared internal key (X-Internal-Key).
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Optional, Any
import numpy as np
import joblib
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

from app.config import (
    INTERNAL_KEY,
    HOST,
    PORT,
    ML_SERVICE_DIR,
)
from training.features import (
    build_features,
    get_cached_career_models,
    get_cached_skills_map,
)

MODELS_DIR = ML_SERVICE_DIR / "models"
MODEL_FILE = MODELS_DIR / "model.joblib"
MODEL_INFO_FILE = MODELS_DIR / "model_info.json"
REPORTS_DIR = ML_SERVICE_DIR / "reports"
METRICS_FILE = REPORTS_DIR / "metrics.json"

app = FastAPI(
    title="SkillGraph ML Service",
    description="Internal machine learning service for next-skill recommendations",
    version="1.0.0",
)

# Global model state loaded once at startup
_loaded_model: Optional[Any] = None
_model_metadata: Dict[str, Any] = {
    "modelVersion": "v1",
    "chosenModel": "GradientBoosting",
}
_model_load_error: Optional[str] = None


def load_model_and_metadata():
    """Load model artifact and metadata once into memory."""
    global _loaded_model, _model_metadata, _model_load_error

    # Load metadata if exists
    if MODEL_INFO_FILE.exists():
        try:
            with open(MODEL_INFO_FILE, "r", encoding="utf-8") as f:
                _model_metadata.update(json.load(f))
        except Exception:
            pass

    # Load model artifact
    if MODEL_FILE.exists():
        try:
            _loaded_model = joblib.load(MODEL_FILE)
            _model_load_error = None
        except Exception as e:
            _loaded_model = None
            _model_load_error = f"Failed to load model file: {e}"
    else:
        _loaded_model = None
        _model_load_error = f"Model file not found at {MODEL_FILE}"

    return _loaded_model


# Initial load at import/startup time
load_model_and_metadata()


@app.middleware("http")
async def enforce_internal_key_middleware(request: Request, call_next):
    """
    Every route except /health requires X-Internal-Key header equal to env INTERNAL_KEY.
    """
    if request.url.path == "/health" or request.method == "OPTIONS":
        return await call_next(request)

    key = request.headers.get("X-Internal-Key")
    if not key or key != INTERNAL_KEY:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Unauthorized: invalid or missing X-Internal-Key"},
        )

    return await call_next(request)


@app.get("/health")
async def health():
    """
    Health check endpoint (public, unauthenticated).
    """
    return {
        "status": "ok",
        "modelLoaded": _loaded_model is not None,
    }


class RecommendRequest(BaseModel):
    career: Optional[str] = None
    careerSlug: Optional[str] = None
    profile: Optional[Dict[str, int]] = None
    proficiencies: Optional[Dict[str, int]] = None
    limit: Optional[int] = None
    topK: Optional[int] = None
    semester: Optional[int] = None

    def resolved_career(self) -> str:
        return (self.career or self.careerSlug or "").strip()

    def resolved_profile(self) -> Dict[str, int]:
        return self.profile or self.proficiencies or {}

    def resolved_limit(self) -> int:
        return self.limit or self.topK or 10


def _build_model_info_response() -> Dict[str, Any]:
    """Helper to assemble model info from metrics.json and model metadata."""
    metrics_data: Dict[str, Any] = {}
    if METRICS_FILE.exists():
        try:
            with open(METRICS_FILE, "r", encoding="utf-8") as f:
                metrics_data = json.load(f)
        except Exception:
            metrics_data = {}

    def enrich_metrics_block(b: dict) -> dict:
        return {
            **b,
            "precisionAt3": b.get("precision_at_3", b.get("precisionAt3", 0.0)),
            "recallAt3": b.get("recall_at_3", b.get("recallAt3", 0.0)),
            "hitRateAt3": b.get("hit_rate_at_3", b.get("hitRateAt3", 0.0)),
            "mrr": b.get("mrr", 0.0),
        }

    raw_ml = metrics_data.get("ml", {})
    raw_base = metrics_data.get("baseline", {})
    enriched_metrics = {
        "ml": enrich_metrics_block(raw_ml),
        "baseline": enrich_metrics_block(raw_base),
    }

    algorithm = _model_metadata.get("chosenModel", "GradientBoosting")
    version = _model_metadata.get("modelVersion", "v1")
    training_profiles = metrics_data.get("n_profiles", _model_metadata.get("nProfilesTotal", 5000))

    return {
        **metrics_data,
        "available": True,
        "algorithm": algorithm,
        "algorithmName": algorithm,
        "trainedOn": "synthetic",
        "trainingData": "synthetic",
        "version": version,
        "modelVersion": version,
        "trainingProfiles": training_profiles,
        "metrics": enriched_metrics,
        "modelsCompared": metrics_data.get("models_compared", _model_metadata.get("modelsCompared", [])),
    }


@app.get("/model-info")
@app.get("/model/info")
async def model_info():
    """
    Return model metadata and evaluation metrics.
    Requires X-Internal-Key.
    """
    return _build_model_info_response()


@app.post("/recommend")
async def recommend(req: RecommendRequest):
    """
    Generate next-skill recommendations using the loaded ML model.
    Returns only skills with gap > 0, sorted by score descending, as:
    { items: [{skillSlug, score}], model: {name, version} }
    Requires X-Internal-Key.
    """
    if _loaded_model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=_model_load_error or "Model file missing or unavailable",
        )

    career_slug = req.resolved_career()
    profile = req.resolved_profile()
    limit = req.resolved_limit()

    career_models = get_cached_career_models()
    skills_map = get_cached_skills_map()

    algorithm = _model_metadata.get("chosenModel", "GradientBoosting")
    version = _model_metadata.get("modelVersion", "v1")

    if not career_slug or career_slug not in career_models:
        return {
            "modelVersion": version,
            "model": {"name": algorithm, "version": version},
            "items": [],
        }

    career_model = career_models[career_slug]

    candidates: List[str] = []
    candidate_feats: List[np.ndarray] = []

    for cs in career_model.career_skills_list:
        slug = cs.skill_slug
        current_level = int(profile.get(slug, 0) or 0)
        gap = max(0, cs.required_level - current_level)

        # Only evaluate and recommend skills with an open gap > 0
        if gap > 0:
            candidates.append(slug)
            feat = build_features(
                profile=profile,
                career=career_model,
                candidate_skill=slug,
                career_models=career_models,
                skills_map=skills_map,
            )
            candidate_feats.append(feat)

    if not candidates:
        return {
            "modelVersion": version,
            "model": {"name": algorithm, "version": version},
            "items": [],
        }

    # Predict scores for all candidates
    probs = _loaded_model.predict_proba(candidate_feats)[:, 1]

    items = [
        {"skillSlug": slug, "score": round(float(prob), 4)}
        for slug, prob in zip(candidates, probs)
    ]
    # Sort strictly by score descending
    items.sort(key=lambda x: x["score"], reverse=True)

    # Slice to requested limit
    limited_items = items[:limit]

    return {
        "modelVersion": version,
        "model": {"name": algorithm, "version": version},
        "items": limited_items,
    }


if __name__ == "__main__":
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
