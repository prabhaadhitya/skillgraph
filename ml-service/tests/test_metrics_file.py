"""
Tests for metrics report file and deterministic training reproducibility.
Verifies:
- reports/metrics.json has "ml" and "baseline" blocks with required metrics.
- Training twice with the same seed yields identical metrics.
"""

import json
from pathlib import Path
import pytest
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

from app.config import ML_SERVICE_DIR, DATA_DIR
from app.engine_py import build_career_models, load_seed_data
from training.train import (
    get_profile_splits,
    build_candidate_dataset,
    evaluate_hit_rate_at_3,
)
from training.features import (
    get_cached_career_models,
    get_cached_skills_map,
)


def test_metrics_json_structure():
    """reports/metrics.json must exist and contain 'ml' and 'baseline' blocks."""
    metrics_path = ML_SERVICE_DIR / "reports" / "metrics.json"
    assert metrics_path.exists(), f"metrics.json missing at {metrics_path}"

    with open(metrics_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Required top-level blocks
    assert "ml" in data, "metrics.json must have 'ml' block"
    assert "baseline" in data, "metrics.json must have 'baseline' block"
    assert "models_compared" in data, "metrics.json must have 'models_compared'"
    assert "n_profiles" in data, "metrics.json must have 'n_profiles'"
    assert "seed" in data, "metrics.json must have 'seed'"

    # Required metric keys in ml and baseline
    required_metrics = ["hit_rate_at_3", "precision_at_3", "recall_at_3", "mrr"]
    for m in required_metrics:
        assert m in data["ml"], f"'ml' missing metric {m}"
        assert m in data["baseline"], f"'baseline' missing metric {m}"
        assert isinstance(data["ml"][m], (int, float))
        assert isinstance(data["baseline"][m], (int, float))

    assert len(data["models_compared"]) >= 3


def test_metrics_markdown_exists():
    """reports/metrics.md must exist and contain the required honesty paragraph."""
    md_path = ML_SERVICE_DIR / "reports" / "metrics.md"
    assert md_path.exists(), f"metrics.md missing at {md_path}"

    content = md_path.read_text(encoding="utf-8")
    assert "The labels come from a simulator, not from real students." in content
    assert "HitRate@3" in content
    assert "MRR" in content


def test_training_twice_gives_identical_metrics():
    """
    Assert training reproducibility:
    Running candidate training twice with seed=42 produces bit-for-bit identical validation HitRate@3.
    """
    df = pd.read_csv(DATA_DIR / "profiles.csv")
    career_models = get_cached_career_models()
    skills_map = get_cached_skills_map()

    # Use first 300 profiles for quick deterministic assertion
    sample_df = df.head(300).copy()

    def run_trial(seed: int) -> float:
        train_ids, val_ids, _ = get_profile_splits(
            sample_df,
            seed=seed,
            train_ratio=0.70,
            val_ratio=0.30,
        )
        train_sub = sample_df[sample_df["profile_id"].isin(set(train_ids))]
        val_sub = sample_df[sample_df["profile_id"].isin(set(val_ids))]

        X_tr, y_tr = build_candidate_dataset(train_sub, career_models, skills_map)

        clf = Pipeline(
            [
                ("scaler", StandardScaler()),
                ("clf", LogisticRegression(max_iter=500, random_state=seed)),
            ]
        )
        clf.fit(X_tr, y_tr)
        return evaluate_hit_rate_at_3(clf, val_sub, career_models, skills_map)

    score_1 = run_trial(seed=42)
    score_2 = run_trial(seed=42)

    assert score_1 == score_2, f"Training run 1 ({score_1}) != run 2 ({score_2})"
