"""
Feature engineering module for candidate next-skill recommendation.
Transforms (profile, career, candidate_skill) into a fixed-length numeric vector.

Contract:
- build_features(profile, career, candidate_skill) -> fixed-length 1D numpy array
- Handles unseen skill slugs and unknown careers without raising exceptions
"""

from typing import Dict, List, Union, Optional, Any
from pathlib import Path
import json
import numpy as np

from app.engine_py import (
    build_career_models,
    load_seed_data,
    is_ready,
    CareerModel,
)

# Standard catalog order of careers and categories for consistent one-hot encoding
KNOWN_CAREERS: List[str] = [
    "data-analyst",
    "data-scientist",
    "full-stack-developer",
    "machine-learning-engineer",
    "software-developer",
]

KNOWN_CATEGORIES: List[str] = [
    "ai-llm",
    "backend",
    "cloud",
    "cybersecurity",
    "data-analytics",
    "database",
    "deep-learning",
    "devops",
    "frontend",
    "machine-learning",
    "programming",
    "tools",
    "web-development",
]

BASE_FEATURE_NAMES: List[str] = [
    "gap",
    "importance",
    "required_level",
    "difficulty",
    "dependency_impact",
    "ready",
    "prereqs_with_gap",
    "current_proficiency",
]

CAREER_FEATURE_NAMES: List[str] = [f"career_{c}" for c in KNOWN_CAREERS]
CATEGORY_FEATURE_NAMES: List[str] = [f"category_{cat}" for cat in KNOWN_CATEGORIES]

FEATURE_NAMES: List[str] = BASE_FEATURE_NAMES + CAREER_FEATURE_NAMES + CATEGORY_FEATURE_NAMES
VECTOR_LENGTH: int = len(FEATURE_NAMES)

# Module-level cache for seed models and skill metadata
_CACHED_CAREER_MODELS: Optional[Dict[str, CareerModel]] = None
_CACHED_SKILLS_MAP: Optional[Dict[str, Dict[str, Any]]] = None


def get_cached_career_models() -> Dict[str, CareerModel]:
    """Return precomputed CareerModel instances, cached at module level."""
    global _CACHED_CAREER_MODELS
    if _CACHED_CAREER_MODELS is None:
        _CACHED_CAREER_MODELS = build_career_models()
    return _CACHED_CAREER_MODELS


def get_cached_skills_map() -> Dict[str, Dict[str, Any]]:
    """Return skills metadata mapping from catalog, cached at module level."""
    global _CACHED_SKILLS_MAP
    if _CACHED_SKILLS_MAP is None:
        skills, _, _ = load_seed_data()
        _CACHED_SKILLS_MAP = {s["slug"]: s for s in skills}
    return _CACHED_SKILLS_MAP


def build_features(
    profile: Dict[str, Any],
    career: Union[str, CareerModel],
    candidate_skill: str,
    career_models: Optional[Dict[str, CareerModel]] = None,
    skills_map: Optional[Dict[str, Dict[str, Any]]] = None,
) -> np.ndarray:
    """
    Build a fixed-length numeric feature vector for a candidate skill.

    Parameters:
    - profile: Dict mapping skill slugs to student proficiencies (0..5).
    - career: Target career slug (str) or pre-built CareerModel instance.
    - candidate_skill: Skill slug string to evaluate.
    - career_models: Optional pre-loaded career models dictionary.
    - skills_map: Optional pre-loaded skills metadata dictionary.

    Returns:
    - 1D numpy array of float64, length = len(FEATURE_NAMES) (26).
      Never raises on unseen skills or unknown careers.
    """
    if career_models is None:
        career_models = get_cached_career_models()
    if skills_map is None:
        skills_map = get_cached_skills_map()

    # 1. Resolve career model and career slug
    if isinstance(career, CareerModel):
        model: Optional[CareerModel] = career
        career_slug: str = career.career_slug
    elif isinstance(career, str):
        career_slug = career
        model = career_models.get(career)
    else:
        career_slug = str(career)
        model = None

    # 2. Extract skill metadata from catalog (or defaults for unseen skill)
    skill_info = skills_map.get(candidate_skill, {})
    difficulty = float(skill_info.get("difficulty", 3))
    category = skill_info.get("category", "")

    # 3. Extract career-specific requirements (or defaults if skill not in career)
    prof = float(profile.get(candidate_skill, 0) or 0)

    if model is not None and candidate_skill in model.career_skill_map:
        req = model.career_skill_map[candidate_skill]
        importance = float(req.importance)
        required_level = float(req.required_level)
        gap = float(max(0, required_level - prof))
        ready = 1.0 if is_ready(model, profile, candidate_skill) else 0.0

        prereqs = model.direct_prereqs.get(candidate_skill, [])
        prereqs_with_gap = float(
            sum(
                1
                for p in prereqs
                if float(profile.get(p, 0) or 0)
                < float(model.career_skill_map[p].required_level)
            )
        )

        # Normalized downstream impact: importance of descendants with an open gap
        descendants = model.descendants.get(candidate_skill, set())
        gap_descendants = [
            d
            for d in descendants
            if float(profile.get(d, 0) or 0)
            < float(model.career_skill_map[d].required_level)
        ]
        sum_imp = sum(model.career_skill_map[d].importance for d in gap_descendants)
        dependency_impact = float(min(1.0, sum_imp / 5.0))
    else:
        importance = 0.0
        required_level = 0.0
        gap = 0.0
        ready = 0.0
        prereqs_with_gap = 0.0
        dependency_impact = 0.0

    # 4. Career one-hot encoding (zeros if unknown career)
    career_one_hot = [
        1.0 if career_slug == c else 0.0 for c in KNOWN_CAREERS
    ]

    # 5. Category one-hot encoding (zeros if unknown category/unseen skill)
    category_one_hot = [
        1.0 if category == cat else 0.0 for cat in KNOWN_CATEGORIES
    ]

    # 6. Assemble into fixed-length array
    vector = [
        gap,
        importance,
        required_level,
        difficulty,
        dependency_impact,
        ready,
        prereqs_with_gap,
        prof,
        *career_one_hot,
        *category_one_hot,
    ]

    return np.array(vector, dtype=np.float64)
