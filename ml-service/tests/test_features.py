"""
Unit tests for feature extraction in ml-service/training/features.py.
Verifies:
- Feature vector length is constant across all skills and careers.
- Unseen skill slugs are handled gracefully without exceptions.
- Unknown careers are handled gracefully.
- Feature vectors are strictly numeric (finite floats, no NaNs).
"""

import numpy as np
import pytest

from training.features import (
    build_features,
    FEATURE_NAMES,
    VECTOR_LENGTH,
    KNOWN_CAREERS,
    KNOWN_CATEGORIES,
)


def test_feature_vector_length_is_constant():
    """Feature vector length must always match VECTOR_LENGTH (26)."""
    profile = {
        "python": 3,
        "statistics": 2,
        "sql": 1,
    }

    careers = [
        "data-analyst",
        "data-scientist",
        "full-stack-developer",
        "machine-learning-engineer",
        "software-developer",
    ]

    for career in careers:
        vec = build_features(profile, career, "python")
        assert isinstance(vec, np.ndarray)
        assert len(vec) == VECTOR_LENGTH
        assert len(vec) == len(FEATURE_NAMES)
        assert not np.isnan(vec).any()
        assert not np.isinf(vec).any()


def test_unseen_skill_handled_without_crash():
    """An unseen/fictional skill slug must not raise and must produce valid vector with zero category."""
    profile = {"python": 4}
    unseen_skill = "super-quantum-neural-compiler-9000"

    vec = build_features(profile, "machine-learning-engineer", unseen_skill)

    assert isinstance(vec, np.ndarray)
    assert len(vec) == VECTOR_LENGTH
    assert not np.isnan(vec).any()

    # Category one-hot entries should all be 0.0 for an unseen skill
    cat_start = len(FEATURE_NAMES) - len(KNOWN_CATEGORIES)
    category_slice = vec[cat_start:]
    assert np.all(category_slice == 0.0)

    # Missing skill in career has zero gap and importance
    gap_idx = FEATURE_NAMES.index("gap")
    importance_idx = FEATURE_NAMES.index("importance")
    assert vec[gap_idx] == 0.0
    assert vec[importance_idx] == 0.0


def test_unknown_career_handled_without_crash():
    """An unknown career slug must not raise and must produce all zeros for career one-hot."""
    profile = {"python": 4}
    vec = build_features(profile, "non-existent-career-slug", "python")

    assert isinstance(vec, np.ndarray)
    assert len(vec) == VECTOR_LENGTH
    assert not np.isnan(vec).any()

    # Career one-hot entries should all be 0.0
    career_start = len(FEATURE_NAMES) - len(KNOWN_CATEGORIES) - len(KNOWN_CAREERS)
    career_end = career_start + len(KNOWN_CAREERS)
    career_slice = vec[career_start:career_end]
    assert np.all(career_slice == 0.0)


def test_feature_values_for_known_skill():
    """Verify specific feature values match requirements."""
    profile = {"python": 2}
    vec = build_features(profile, "machine-learning-engineer", "python")

    prof_idx = FEATURE_NAMES.index("current_proficiency")
    assert vec[prof_idx] == 2.0

    mle_idx = FEATURE_NAMES.index("career_machine-learning-engineer")
    assert vec[mle_idx] == 1.0

    prog_idx = FEATURE_NAMES.index("category_programming")
    assert vec[prog_idx] == 1.0
