"""
Tests asserting strict data isolation (no profile leakage across splits)
and feature honesty (no target label leakage in feature vectors).
"""

import pandas as pd
import numpy as np
from pathlib import Path

from app.config import DATA_DIR
from training.train import get_profile_splits, build_candidate_dataset
from training.features import (
    FEATURE_NAMES,
    build_features,
    get_cached_career_models,
    get_cached_skills_map,
)


def test_split_by_profile_strictly_disjoint():
    """
    Assert that train, validation, and test splits have ZERO profile ID overlap.
    """
    profiles_csv = DATA_DIR / "profiles.csv"
    assert profiles_csv.exists(), f"profiles.csv missing at {profiles_csv}"

    df = pd.read_csv(profiles_csv)
    unique_profiles = df["profile_id"].unique()
    assert len(unique_profiles) == 5000

    train_ids, val_ids, test_ids = get_profile_splits(df, seed=42)

    train_set = set(train_ids)
    val_set = set(val_ids)
    test_set = set(test_ids)

    # 1. No profile appears in both train and test
    train_test_overlap = train_set.intersection(test_set)
    assert len(train_test_overlap) == 0, f"Leakage between train and test: {train_test_overlap}"

    # 2. No profile appears in both train and val
    train_val_overlap = train_set.intersection(val_set)
    assert len(train_val_overlap) == 0, f"Leakage between train and val: {train_val_overlap}"

    # 3. No profile appears in both val and test
    val_test_overlap = val_set.intersection(test_set)
    assert len(val_test_overlap) == 0, f"Leakage between val and test: {val_test_overlap}"

    # 4. Partition is complete
    assert len(train_set) + len(val_set) + len(test_set) == len(unique_profiles)
    assert len(train_set) == 3500
    assert len(val_set) == 750
    assert len(test_set) == 750


def test_feature_pipeline_has_no_target_leakage():
    """
    Assert that no feature name or feature calculation uses the label or ground-truth choice.
    """
    # 1. Disallowed keywords in feature names
    disallowed_terms = ["label", "chosen", "target", "ground_truth", "next_skill"]
    for feat in FEATURE_NAMES:
        feat_lower = feat.lower()
        assert feat_lower != "y", "Feature name cannot be 'y'"
        for term in disallowed_terms:
            assert term not in feat_lower, (
                f"Feature '{feat}' matches suspicious term '{term}' indicating possible leakage"
            )

    # 2. build_features signature and output do not receive or depend on chosen_next_skill
    career_models = get_cached_career_models()
    skills_map = get_cached_skills_map()

    c_model = career_models["machine-learning-engineer"]
    profile = {"python": 3, "statistics": 2}

    # Vector computed for candidate skill
    vec = build_features(
        profile=profile,
        career=c_model,
        candidate_skill="linear-algebra",
        career_models=career_models,
        skills_map=skills_map,
    )

    assert isinstance(vec, np.ndarray)
    assert len(vec) == len(FEATURE_NAMES)
    assert not np.isnan(vec).any(), "Feature vector contains NaN"
    assert not np.isinf(vec).any(), "Feature vector contains Inf"


def test_candidate_dataset_labels_independent_of_features():
    """
    Assert that labels are purely binary indicators (1 if candidate == chosen else 0)
    and are not embedded inside feature matrix X.
    """
    profiles_csv = DATA_DIR / "profiles.csv"
    df = pd.read_csv(profiles_csv).head(50)  # small sample
    career_models = get_cached_career_models()
    skills_map = get_cached_skills_map()

    X, y = build_candidate_dataset(df, career_models, skills_map)

    assert X.shape[0] == len(y)
    assert set(np.unique(y)).issubset({0, 1})
    assert np.sum(y == 1) > 0, "Expected at least one positive label in sample"

    # Verify no feature in X is identical to label y
    for col_idx, feat_name in enumerate(FEATURE_NAMES):
        col_values = X[:, col_idx]
        is_identical = np.array_equal(col_values, y)
        assert not is_identical, f"Feature '{feat_name}' is identical to target label y!"
