"""
Training pipeline for next-skill recommendation models.
Compares LogisticRegression, RandomForest, and GradientBoosting using validation HitRate@3.
Saves the best model and metadata deterministically.

Execution:
python -m training.train
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional

import numpy as np
import pandas as pd
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

from app.config import DATA_DIR, ML_SERVICE_DIR
from app.engine_py import build_career_models, CareerModel
from training.features import (
    build_features,
    FEATURE_NAMES,
    get_cached_career_models,
    get_cached_skills_map,
)

MODELS_DIR = ML_SERVICE_DIR / "models"


def get_profile_splits(
    df: pd.DataFrame,
    seed: int = 42,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Split profile IDs strictly into train / validation / test sets without row leakage.
    Deterministic given the same seed.
    """
    unique_profiles = np.sort(df["profile_id"].unique())
    rng = np.random.RandomState(seed)
    shuffled_profiles = rng.permutation(unique_profiles)

    n_total = len(shuffled_profiles)
    n_train = int(train_ratio * n_total)
    n_val = int(val_ratio * n_total)

    train_ids = shuffled_profiles[:n_train]
    val_ids = shuffled_profiles[n_train : n_train + n_val]
    test_ids = shuffled_profiles[n_train + n_val :]

    return train_ids, val_ids, test_ids


def build_candidate_dataset(
    df_subset: pd.DataFrame,
    career_models: Dict[str, CareerModel],
    skills_map: Dict[str, Dict[str, Any]],
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Construct one row per (profile, candidate_skill) where candidate skill has gap > 0.
    Label is 1 if candidate_skill == chosen_next_skill, else 0.
    """
    feature_rows: List[np.ndarray] = []
    labels: List[int] = []

    for _, row in df_subset.iterrows():
        c_slug = str(row["career"])
        chosen = str(row["chosen_next_skill"])
        model = career_models[c_slug]

        profile: Dict[str, int] = {
            col[6:]: int(row[col])
            for col in df_subset.columns
            if col.startswith("skill_")
        }

        for cs in model.career_skills_list:
            slug = cs.skill_slug
            prof = profile.get(slug, 0)
            gap = max(0, cs.required_level - prof)

            # Candidates are ONLY skills with gap > 0
            if gap > 0:
                feat = build_features(
                    profile=profile,
                    career=model,
                    candidate_skill=slug,
                    career_models=career_models,
                    skills_map=skills_map,
                )
                feature_rows.append(feat)
                labels.append(1 if slug == chosen else 0)

    X = np.array(feature_rows, dtype=np.float64)
    y = np.array(labels, dtype=np.int32)
    return X, y


def evaluate_hit_rate_at_3(
    model_obj: Any,
    df_subset: pd.DataFrame,
    career_models: Dict[str, CareerModel],
    skills_map: Dict[str, Dict[str, Any]],
) -> float:
    """
    Compute HitRate@3 across all profiles in df_subset:
    1 if ground-truth chosen_next_skill is in top-3 highest predicted probability candidates, else 0.
    """
    hits = 0
    total = 0

    for _, row in df_subset.iterrows():
        c_slug = str(row["career"])
        chosen = str(row["chosen_next_skill"])
        c_model = career_models[c_slug]

        profile: Dict[str, int] = {
            col[6:]: int(row[col])
            for col in df_subset.columns
            if col.startswith("skill_")
        }

        candidates: List[str] = []
        candidate_feats: List[np.ndarray] = []

        for cs in c_model.career_skills_list:
            slug = cs.skill_slug
            prof = profile.get(slug, 0)
            gap = max(0, cs.required_level - prof)
            if gap > 0:
                candidates.append(slug)
                candidate_feats.append(
                    build_features(
                        profile=profile,
                        career=c_model,
                        candidate_skill=slug,
                        career_models=career_models,
                        skills_map=skills_map,
                    )
                )

        if not candidates:
            continue

        probs = model_obj.predict_proba(candidate_feats)[:, 1]
        ranked_indices = np.argsort(-probs)
        top3 = [candidates[i] for i in ranked_indices[:3]]

        if chosen in top3:
            hits += 1
        total += 1

    return float(hits / total) if total > 0 else 0.0


def run_training(
    dataset_path: Optional[Path] = None,
    seed: int = 42,
    output_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Main training execution function.
    Deterministic with fixed seed and random_state.
    """
    if dataset_path is None:
        dataset_path = DATA_DIR / "profiles.csv"
    if output_dir is None:
        output_dir = MODELS_DIR

    output_dir.mkdir(parents=True, exist_ok=True)

    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found at: {dataset_path}")

    df = pd.read_csv(dataset_path)
    career_models = get_cached_career_models()
    skills_map = get_cached_skills_map()

    # 1. Profile-level group split
    train_ids, val_ids, test_ids = get_profile_splits(df, seed=seed)
    train_df = df[df["profile_id"].isin(set(train_ids))]
    val_df = df[df["profile_id"].isin(set(val_ids))]

    # 2. Build training candidate matrix
    X_train, y_train = build_candidate_dataset(train_df, career_models, skills_map)

    # 3. Define candidate models to compare with deterministic random_state
    candidate_models: Dict[str, Any] = {
        "LogisticRegression": Pipeline(
            [
                ("scaler", StandardScaler()),
                ("clf", LogisticRegression(max_iter=1000, random_state=seed)),
            ]
        ),
        "RandomForest": RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=seed,
            n_jobs=-1,
        ),
        "GradientBoosting": GradientBoostingClassifier(
            n_estimators=100,
            max_depth=4,
            random_state=seed,
        ),
    }

    models_compared: List[Dict[str, Any]] = []
    best_name: Optional[str] = None
    best_hit_rate: float = -1.0
    best_model_obj: Any = None

    for name, clf in candidate_models.items():
        clf.fit(X_train, y_train)
        val_hr = evaluate_hit_rate_at_3(clf, val_df, career_models, skills_map)
        models_compared.append(
            {
                "model": name,
                "val_hit_rate_at_3": round(val_hr, 4),
            }
        )

        if val_hr > best_hit_rate:
            best_hit_rate = val_hr
            best_name = name
            best_model_obj = clf

    # 4. Save chosen model with joblib
    model_save_path = output_dir / "model.joblib"
    joblib.dump(best_model_obj, model_save_path)

    # 5. Save model metadata JSON
    model_info = {
        "modelVersion": "v1",
        "chosenModel": best_name,
        "validationHitRateAt3": round(best_hit_rate, 4),
        "modelsCompared": models_compared,
        "featureNames": FEATURE_NAMES,
        "nProfilesTotal": len(df),
        "nProfilesTrain": len(train_ids),
        "nProfilesVal": len(val_ids),
        "nProfilesTest": len(test_ids),
        "seed": seed,
    }

    info_save_path = output_dir / "model_info.json"
    with open(info_save_path, "w", encoding="utf-8") as f:
        json.dump(model_info, f, indent=2)

    return model_info


if __name__ == "__main__":
    result = run_training()
    print("Training completed successfully.")
    print(f"Chosen model: {result['chosenModel']} (Validation HitRate@3: {result['validationHitRateAt3']})")
    print(f"Models compared: {result['modelsCompared']}")
