"""
Regression test suite for SkillGraph ML vs. Rule-Based Baseline evaluation.

Verifies:
1. Identical candidate sets and eligibility rules between ML and rule baseline.
2. Complete train/validation/test group separation without profile or label leakage.
3. Metric reproducibility and mathematical invariants (Precision@3 == HitRate@3 / 3, Recall@3 == HitRate@3).
4. Rank distribution trade-offs: ML has superior Rank 1 predictions (+10, boosting MRR),
   while Baseline retains more items inside top-3 (-3 net hits, with ML spilling +17 to Rank 4).
5. Error analysis verification: >80% of divergence cases stem from non-interest student choices.
"""

import json
from pathlib import Path
import pytest
import numpy as np
import pandas as pd
import joblib

from app.config import DATA_DIR, ML_SERVICE_DIR
from app.engine_py import is_ready, CareerModel
from training.train import get_profile_splits, MODELS_DIR
from training.features import (
    FEATURE_NAMES,
    build_features,
    get_cached_career_models,
    get_cached_skills_map,
)
from training.evaluate import (
    evaluate_ranking,
    run_evaluation,
    check_data_leakage,
    REPORTS_DIR,
)


@pytest.fixture(scope="module")
def evaluation_context():
    """Load test dataset, models, and run evaluation once for tests."""
    dataset_path = DATA_DIR / "profiles.csv"
    assert dataset_path.exists(), f"profiles.csv not found at {dataset_path}"

    df = pd.read_csv(dataset_path)
    career_models = get_cached_career_models()
    skills_map = get_cached_skills_map()
    ml_model = joblib.load(MODELS_DIR / "model.joblib")

    train_ids, val_ids, test_ids = get_profile_splits(df, seed=42)
    test_df = df[df["profile_id"].isin(set(test_ids))]

    ml_metrics, base_metrics, rank_analysis, error_cases = evaluate_ranking(
        test_df=test_df,
        career_models=career_models,
        skills_map=skills_map,
        ml_model=ml_model,
        eligibility_rule="identical_ready",
    )

    return {
        "df": df,
        "test_df": test_df,
        "train_ids": train_ids,
        "val_ids": val_ids,
        "test_ids": test_ids,
        "career_models": career_models,
        "skills_map": skills_map,
        "ml_model": ml_model,
        "ml_metrics": ml_metrics,
        "base_metrics": base_metrics,
        "rank_analysis": rank_analysis,
        "error_cases": error_cases,
    }


def test_zero_profile_and_feature_leakage(evaluation_context):
    """
    Assert 0% profile leakage across splits and zero label leakage in candidate features.
    """
    ctx = evaluation_context
    train_set = set(ctx["train_ids"])
    val_set = set(ctx["val_ids"])
    test_set = set(ctx["test_ids"])

    # Strict group split verification
    assert len(train_set.intersection(test_set)) == 0, "Profile leakage: train and test overlap!"
    assert len(train_set.intersection(val_set)) == 0, "Profile leakage: train and val overlap!"
    assert len(val_set.intersection(test_set)) == 0, "Profile leakage: val and test overlap!"

    assert len(train_set) == 3500
    assert len(val_set) == 750
    assert len(test_set) == 750

    # Target label isolation in features
    disallowed = ["chosen", "label", "target", "ground_truth", "next_skill"]
    for feat in FEATURE_NAMES:
        for term in disallowed:
            assert term not in feat.lower(), f"Suspicious feature name '{feat}' indicates leakage"


def test_evaluation_identical_candidate_eligibility(evaluation_context):
    """
    Assert that every evaluated candidate across test profiles has open gap > 0
    AND satisfies prerequisite readiness (is_ready == True).
    """
    ctx = evaluation_context
    test_df = ctx["test_df"]
    career_models = ctx["career_models"]

    for _, row in test_df.iterrows():
        c_slug = str(row["career"])
        model = career_models[c_slug]
        profile = {
            col[6:]: int(row[col])
            for col in test_df.columns
            if col.startswith("skill_")
        }

        # Candidates under identical_ready
        ready_gap_cands = [
            cs.skill_slug
            for cs in model.career_skills_list
            if max(0, cs.required_level - profile.get(cs.skill_slug, 0)) > 0
            and is_ready(model, profile, cs.skill_slug)
        ]

        # Ground truth skill MUST be an eligible ready candidate
        chosen = str(row["chosen_next_skill"])
        assert chosen in ready_gap_cands, (
            f"Chosen skill '{chosen}' for profile {row['profile_id']} is not in ready candidates"
        )


def test_metric_relationships_and_reproducibility(evaluation_context):
    """
    Assert metric values, mathematical invariants, and reproducibility.
    Precision@3 == HitRate@3 / 3, and Recall@3 == HitRate@3.
    """
    ctx = evaluation_context
    ml = ctx["ml_metrics"]
    base = ctx["base_metrics"]

    # Precision@3 invariant (1 target label per profile)
    assert abs(ml["precision_at_3"] - round(ml["hit_rate_at_3"] / 3.0, 4)) <= 0.0001
    assert abs(base["precision_at_3"] - round(base["hit_rate_at_3"] / 3.0, 4)) <= 0.0001

    # Recall@3 invariant (1 target label per profile)
    assert abs(ml["recall_at_3"] - ml["hit_rate_at_3"]) <= 0.0001
    assert abs(base["recall_at_3"] - base["hit_rate_at_3"]) <= 0.0001

    # Reproducible values
    assert ml["hit_rate_at_3"] == 0.5867
    assert base["hit_rate_at_3"] == 0.5907
    assert ml["mrr"] == 0.4728
    assert base["mrr"] == 0.4640

    # ML achieves higher MRR than baseline
    assert ml["mrr"] > base["mrr"]

    # Baseline achieves higher HitRate@3 than ML
    assert base["hit_rate_at_3"] > ml["hit_rate_at_3"]


def test_rank_distribution_tradeoff_regression(evaluation_context):
    """
    Assert the empirical rank distribution trade-off explaining the metric divergence:
    - ML places +10 more items at Rank 1 (driving higher MRR: 190 vs 180).
    - ML spills +17 more items to Rank 4 (driving lower HitRate@3: 94 vs 77).
    - Baseline achieves 3 more net top-3 hits (443 vs 440).
    """
    ctx = evaluation_context
    ra = ctx["rank_analysis"]
    ml_dist = ra["rank_distribution_ml"]
    base_dist = ra["rank_distribution_baseline"]

    # Rank 1 advantage for ML
    assert ml_dist["rank_1"] == 190
    assert base_dist["rank_1"] == 180
    assert ml_dist["rank_1"] > base_dist["rank_1"]

    # Rank 4 spillover for ML
    assert ml_dist["rank_4"] == 94
    assert base_dist["rank_4"] == 77
    assert ml_dist["rank_4"] > base_dist["rank_4"]

    # Net Top-3 hits
    ml_top3 = ml_dist["rank_1"] + ml_dist["rank_2"] + ml_dist["rank_3"]
    base_top3 = base_dist["rank_1"] + base_dist["rank_2"] + base_dist["rank_3"]
    assert ml_top3 == 440
    assert base_top3 == 443
    assert base_top3 - ml_top3 == 3


def test_error_analysis_latent_interest_disconnect(evaluation_context):
    """
    Assert error analysis root cause:
    In >80% of divergence cases where Baseline won and ML lost,
    the student chose a skill outside their latent category interest.
    """
    ctx = evaluation_context
    errors = ctx["error_cases"]
    assert len(errors) == 77

    non_interest_count = sum(1 for e in errors if not e["matches_interest"])
    non_interest_pct = (non_interest_count / len(errors)) * 100.0

    assert non_interest_pct >= 80.0
    assert round(non_interest_pct, 1) == 84.4


def test_run_evaluation_generates_reports():
    """
    Assert that run_evaluation() executes cleanly and outputs valid reports.
    """
    result = run_evaluation(seed=42, eligibility_rule="identical_ready")

    assert "ml" in result
    assert "baseline" in result
    assert "rank_analysis" in result

    metrics_json = REPORTS_DIR / "metrics.json"
    metrics_md = REPORTS_DIR / "metrics.md"

    assert metrics_json.exists()
    assert metrics_md.exists()

    with open(metrics_json, "r", encoding="utf-8") as f:
        data = json.load(f)
        assert data["ml"]["hit_rate_at_3"] == 0.5867
        assert data["baseline"]["hit_rate_at_3"] == 0.5907
        assert data["rank_analysis"]["tradeoff_justification"]["default_recommendation_system"] == "rule_based"

    md_content = metrics_md.read_text(encoding="utf-8")
    assert "Preserving Rule-Based Recommendations as Default" in md_content
    assert "Mathematical Objective Divergence" in md_content
