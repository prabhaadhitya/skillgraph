"""
SkillGraph ML Service - FastAPI application.
Provides recommendation and model info endpoints for backend consumption.
Protected by shared internal key (X-Internal-Key).
"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Optional, Any
import uvicorn

from app.config import INTERNAL_KEY, HOST, PORT

app = FastAPI(
    title="SkillGraph ML Service",
    description="Internal machine learning service for next-skill recommendations",
    version="1.0.0",
)


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
        "modelLoaded": False,
    }


class RecommendRequest(BaseModel):
    careerSlug: str
    proficiencies: Dict[str, int] = {}
    semester: Optional[int] = None
    topK: Optional[int] = 10


@app.get("/model/info")
async def model_info():
    """
    Return model metadata and evaluation metrics.
    Requires X-Internal-Key.
    """
    return {
        "modelVersion": "v1",
        "trainingData": "synthetic",
        "status": "ready",
    }


@app.post("/recommend")
async def recommend(req: RecommendRequest):
    """
    Generate next-skill recommendations.
    Requires X-Internal-Key.
    """
    return {
        "modelVersion": "v1",
        "items": [],
    }


if __name__ == "__main__":
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
