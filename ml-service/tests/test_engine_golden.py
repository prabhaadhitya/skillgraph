"""
Golden tests verifying parity between the Python engine implementation
and the JavaScript reference engine (shared/fixtures/engine_golden.json).
"""

import json
from pathlib import Path
import pytest
from app.engine_py import (
    build_career_models,
    compute_fit,
    compute_gap_items,
    get_next_skills,
    build_learning_path,
)

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
FIXTURES_DIR = ROOT_DIR / "shared" / "fixtures"
SEED_DIR = ROOT_DIR / "shared" / "seed"


@pytest.fixture(scope="module")
def golden_data():
    golden_path = FIXTURES_DIR / "engine_golden.json"
    with open(golden_path, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def career_models():
    return build_career_models(SEED_DIR)


def test_golden_contains_18_cases(golden_data):
    assert len(golden_data["cases"]) == 18


def test_golden_cases_parity(golden_data, career_models):
    """Verify all 18 cases match fit, summary, nextSkills, and path."""
    for case in golden_data["cases"]:
        case_id = case["id"]
        career_slug = case["career"]
        profile = case["profile"]
        model = career_models[career_slug]

        # 1. Fit score, coverage, readiness
        fit = compute_fit(model, profile)
        assert fit["fitScore"] == case["fitScore"], f"fitScore mismatch in {case_id}"
        assert fit["coverage"] == pytest.approx(case["coverage"], abs=1e-4), f"coverage mismatch in {case_id}"
        assert fit["readiness"] == pytest.approx(case["readiness"], abs=1e-4), f"readiness mismatch in {case_id}"

        # 2. Summary
        gap_result = compute_gap_items(model, profile)
        assert gap_result["summary"] == case["summary"], f"summary mismatch in {case_id}"

        # 3. Next skills (slugs in order, priorities to 2 decimals)
        next_skills = get_next_skills(model, profile, limit=3)
        simplified_next = [
            {"skill": item["skill"]["slug"], "priority": item["score"]}
            for item in next_skills
        ]
        assert simplified_next == case["nextSkills"], f"nextSkills mismatch in {case_id}"

        # 4. Learning path (entries for skill, fromLevel, toLevel, priority 2dp, effortPoints)
        path_result = build_learning_path(model, profile)
        simplified_path = [
            {
                "skill": step["skill"]["slug"],
                "fromLevel": step["fromLevel"],
                "toLevel": step["toLevel"],
                "priority": step["priority"],
                "effortPoints": step["effortPoints"],
            }
            for step in path_result["steps"]
        ]
        assert simplified_path == case["path"], f"path mismatch in {case_id}"


def test_next_skill_equals_path_step_1(golden_data, career_models):
    """Next skill #1 equals path step 1 for every golden case with at least one gap (E11b)."""
    for case in golden_data["cases"]:
        career_slug = case["career"]
        profile = case["profile"]
        model = career_models[career_slug]

        gap_result = compute_gap_items(model, profile)
        has_gaps = any(item["gap"] > 0 for item in gap_result["items"])

        if has_gaps:
            next_skills = get_next_skills(model, profile, limit=3)
            path_result = build_learning_path(model, profile)

            assert len(next_skills) > 0, f"Expected next skills for {case['id']}"
            assert len(path_result["steps"]) > 0, f"Expected path steps for {case['id']}"
            assert next_skills[0]["skill"]["slug"] == path_result["steps"][0]["skill"]["slug"], (
                f"E11b violation in {case['id']}: next skill #1 ({next_skills[0]['skill']['slug']}) "
                f"!= path step 1 ({path_result['steps'][0]['skill']['slug']})"
            )
