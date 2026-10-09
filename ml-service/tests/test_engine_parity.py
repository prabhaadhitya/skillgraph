"""
Parity tests asserting that the Python engine (engine_py.py) and JavaScript engine
yield IDENTICAL results on 100 random profiles x 5 careers (500 test cases total).

Asserted:
1. Fit score, coverage, readiness, and band
2. Gap summary counts (strong, developing, missing, total)
3. First 5 path steps (skill slug, fromLevel, toLevel, priority, effortPoints)
"""

import json
from pathlib import Path
import pytest
from app.engine_py import (
    build_career_models,
    compute_fit,
    compute_gap_items,
    build_learning_path,
)

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
FIXTURES_DIR = ROOT_DIR / "shared" / "fixtures"
SEED_DIR = ROOT_DIR / "shared" / "seed"


@pytest.fixture(scope="module")
def parity_data():
    fixture_path = FIXTURES_DIR / "engine_parity_100x5.json"
    with open(fixture_path, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def career_models():
    return build_career_models(SEED_DIR)


def test_parity_dataset_metadata(parity_data):
    """Verify parity fixture exists with exactly 500 test cases."""
    assert len(parity_data["cases"]) == 500
    assert parity_data["meta"]["profilesCount"] == 100
    assert parity_data["meta"]["careersCount"] == 5


def test_python_and_js_engine_parity_500_cases(parity_data, career_models):
    """
    Run Python engine on all 500 cases and assert 100% identical outputs with JS engine:
    - fitScore, coverage, readiness, band
    - summary counts
    - first 5 learning path steps
    """
    mismatches = []

    for case in parity_data["cases"]:
        case_id = case["id"]
        career_slug = case["career"]
        profile = case["profile"]
        expected_fit = case["fit"]
        expected_summary = case["summary"]
        expected_path_first_5 = case["pathFirst5"]

        model = career_models[career_slug]

        # 1. Fit metrics
        py_fit = compute_fit(model, profile)
        if py_fit["fitScore"] != expected_fit["fitScore"]:
            mismatches.append(f"{case_id} fitScore: py={py_fit['fitScore']} vs js={expected_fit['fitScore']}")
        if abs(py_fit["coverage"] - expected_fit["coverage"]) > 1e-4:
            mismatches.append(f"{case_id} coverage: py={py_fit['coverage']} vs js={expected_fit['coverage']}")
        if abs(py_fit["readiness"] - expected_fit["readiness"]) > 1e-4:
            mismatches.append(f"{case_id} readiness: py={py_fit['readiness']} vs js={expected_fit['readiness']}")
        if py_fit["band"] != expected_fit["band"]:
            mismatches.append(f"{case_id} band: py={py_fit['band']} vs js={expected_fit['band']}")

        # 2. Gap summary counts
        py_gap = compute_gap_items(model, profile)
        if py_gap["summary"] != expected_summary:
            mismatches.append(f"{case_id} summary: py={py_gap['summary']} vs js={expected_summary}")

        # 3. First 5 path steps
        py_path = build_learning_path(model, profile)
        py_first_5 = [
            {
                "skill": step["skill"]["slug"],
                "fromLevel": step["fromLevel"],
                "toLevel": step["toLevel"],
                "priority": step["priority"],
                "effortPoints": step["effortPoints"],
            }
            for step in py_path["steps"][:5]
        ]

        if py_first_5 != expected_path_first_5:
            mismatches.append(f"{case_id} pathFirst5: py={py_first_5} vs js={expected_path_first_5}")

    assert not mismatches, f"Encountered {len(mismatches)} mismatches:\n" + "\n".join(mismatches[:10])
