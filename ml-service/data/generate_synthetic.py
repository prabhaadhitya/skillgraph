"""
Synthetic dataset generator for SkillGraph ML next-skill recommendation.
Simulates ~5,000 student profiles across 5 careers with realistic progress,
interest bias, and simulated next-skill learning choices.

Deterministic when run with the same seed.
"""

import os
import sys
import random
import json
from pathlib import Path

# Ensure ml-service root is on sys.path for both module and direct script execution
ML_SERVICE_ROOT = Path(__file__).resolve().parent.parent
if str(ML_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_ROOT))

from typing import Dict, List, Set, Any, Optional
import numpy as np
import pandas as pd

from app.config import SEED_DIR, DATA_DIR
from app.engine_py import (
    build_career_models,
    compute_fit,
    is_ready,
    CareerModel,
)


def set_seed(seed: int = 42) -> None:
    """Set random seed for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)


def get_topological_order(model: CareerModel) -> List[str]:
    """
    Return a topological ordering of skills in the career based on PREREQUISITE edges.
    Prerequisites come before dependents.
    """
    in_degree = {s: len(model.direct_prereqs.get(s, [])) for s in model.career_slugs}
    queue = [s for s, deg in in_degree.items() if deg == 0]
    # Sort for determinism
    queue.sort(key=lambda s: model.skills.get(s, {}).get("name", s))

    order = []
    while queue:
        curr = queue.pop(0)
        order.append(curr)
        for dep in sorted(model.direct_dependents.get(curr, [])):
            in_degree[dep] -= 1
            if in_degree[dep] == 0:
                queue.append(dep)

    # In case of any disconnected/remaining nodes
    for s in sorted(model.career_slugs):
        if s not in order:
            order.append(s)

    return order


def simulate_student_profile(
    model: CareerModel,
    all_skills: List[Dict[str, Any]],
    topo_order: List[str],
    career_slug: str,
    categories: List[str],
) -> Dict[str, Any]:
    """
    Simulate a single student's profile:
    - semester (1-8)
    - progress fraction along career
    - hidden interest bias toward a category
    - realistic proficiencies along prerequisite chain
    - a few off-career elective skills
    """
    semester = random.randint(1, 8)
    # Target progress roughly 10% to 85% based on semester with noise
    progress_mean = 0.08 + (semester / 8.0) * 0.70
    progress_frac = float(np.clip(np.random.normal(progress_mean, 0.12), 0.05, 0.85))

    interest_category = random.choice(categories)

    profile: Dict[str, int] = {}
    total_career_skills = len(topo_order)
    num_to_learn = max(1, int(total_career_skills * progress_frac))

    # Fill skills in topological order
    for idx, slug in enumerate(topo_order):
        if idx >= num_to_learn and random.random() > 0.15:
            continue

        req = model.career_skill_map[slug].required_level
        skill_info = model.skills.get(slug, {})
        cat = skill_info.get("category", "")

        # Check direct prerequisites
        prereqs = model.direct_prereqs.get(slug, [])
        all_prereqs_met = all(profile.get(p, 0) >= 1 for p in prereqs)

        if not all_prereqs_met and random.random() > 0.10:
            # Most students don't jump ahead without prerequisites
            continue

        # If student has interest in this category, slightly higher proficiency
        boost = 1 if cat == interest_category and random.random() < 0.6 else 0

        # Proficiency level (1 to req, capped at 5)
        base_level = random.randint(1, req)
        prof = int(np.clip(base_level + boost, 1, 5))
        profile[slug] = prof

    # Add 1-3 random off-career skills
    career_slugs_set = model.career_slugs
    off_career_skills = [s for s in all_skills if s["slug"] not in career_slugs_set]
    if off_career_skills:
        num_off = random.randint(1, 3)
        for s in random.sample(off_career_skills, min(num_off, len(off_career_skills))):
            profile[s["slug"]] = random.randint(1, 2)

    return {
        "semester": semester,
        "interest_category": interest_category,
        "profile": profile,
    }


def simulate_next_skill_choice(
    model: CareerModel,
    profile: Dict[str, int],
    interest_category: str,
    semester: int,
) -> str:
    """
    Behaviour simulator picks which skill the student learned next.
    Sampled from ready candidates with gap > 0.
    Probability ∝ exp(logits), where coefficients differ from baseline priority weights:
    - Higher weight on easiness (low difficulty)
    - Higher weight on unlocked skills count
    - Interest bias
    - Realistic noise
    """
    # Find ready skills with gap > 0
    ready_candidates = []
    for cs in model.career_skills_list:
        slug = cs.skill_slug
        prof = profile.get(slug, 0)
        gap = max(0, cs.required_level - prof)
        if gap > 0 and is_ready(model, profile, slug):
            ready_candidates.append((slug, gap, cs.importance, cs.required_level))

    # If no candidates are ready (e.g. edge cases), pick any candidate with gap > 0
    if not ready_candidates:
        for cs in model.career_skills_list:
            slug = cs.skill_slug
            prof = profile.get(slug, 0)
            gap = max(0, cs.required_level - prof)
            if gap > 0:
                ready_candidates.append((slug, gap, cs.importance, cs.required_level))

    if not ready_candidates:
        # If all closed, pick the highest importance career skill
        return model.career_skills_list[0].skill_slug

    logits = []
    for slug, gap, importance, req_level in ready_candidates:
        skill_info = model.skills.get(slug, {})
        difficulty = skill_info.get("difficulty", 3)
        cat = skill_info.get("category", "")

        # Behavioral coefficients differing from engine baseline:
        # Engine baseline: 0.30 imp + 0.25 gap/5 + 0.30 depImpact + 0.15 ready
        # Simulator:
        # - Strong preference for lower difficulty (easiness): weight +1.2
        # - Unlocked dependents count: weight +0.8
        # - Interest category alignment: weight +1.0
        # - Moderate importance: weight +0.6
        # - Gap size preference: smaller gap preferred for quick wins (weight -0.4)
        easiness = (6.0 - difficulty) / 5.0
        descendants_count = len([d for d in model.descendants.get(slug, set()) if profile.get(d, 0) < model.career_skill_map[d].required_level])
        unlocked_norm = min(1.0, descendants_count / 5.0)
        interest_match = 1.0 if cat == interest_category else 0.0
        gap_norm = gap / 5.0

        # Semester effect: later semesters tackle harder skills more readily
        semester_factor = (semester / 8.0) * (difficulty / 5.0)

        logit = (
            0.60 * importance
            + 1.20 * easiness
            + 0.80 * unlocked_norm
            + 1.00 * interest_match
            - 0.40 * gap_norm
            + 0.30 * semester_factor
            + np.random.normal(0, 0.15)
        )
        logits.append(logit)

    # Softmax probabilities
    logits_arr = np.array(logits) - np.max(logits)
    exp_logits = np.exp(logits_arr)
    probs = exp_logits / np.sum(exp_logits)

    chosen_idx = np.random.choice(len(ready_candidates), p=probs)
    return ready_candidates[chosen_idx][0]


def generate_dataset(
    num_profiles: int = 5000,
    seed: int = 42,
    output_dir: Optional[Path] = None,
) -> pd.DataFrame:
    """
    Generate synthetic dataset of student profiles and simulated chosen next skills.
    Saves full dataset to profiles.csv and first 50 rows to sample.csv.
    """
    set_seed(seed)
    if output_dir is None:
        output_dir = DATA_DIR

    output_dir.mkdir(parents=True, exist_ok=True)

    with open(SEED_DIR / "skills.json", "r", encoding="utf-8") as f:
        all_skills = json.load(f)

    all_skill_slugs = sorted([s["slug"] for s in all_skills])
    all_categories = sorted(list({s["category"] for s in all_skills}))

    career_models = build_career_models(SEED_DIR)
    careers = sorted(list(career_models.keys()))

    topo_orders = {c: get_topological_order(career_models[c]) for c in careers}

    records = []
    profiles_per_career = num_profiles // len(careers)
    profile_counter = 0

    for career_slug in careers:
        model = career_models[career_slug]
        topo = topo_orders[career_slug]

        for _ in range(profiles_per_career):
            profile_counter += 1
            prof_id = f"prof_{profile_counter:04d}"

            sim_result = simulate_student_profile(
                model=model,
                all_skills=all_skills,
                topo_order=topo,
                career_slug=career_slug,
                categories=all_categories,
            )

            semester = sim_result["semester"]
            interest_cat = sim_result["interest_category"]
            profile = sim_result["profile"]

            fit_info = compute_fit(model, profile)

            chosen_next_skill = simulate_next_skill_choice(
                model=model,
                profile=profile,
                interest_category=interest_cat,
                semester=semester,
            )

            # Build record row
            row: Dict[str, Any] = {
                "profile_id": prof_id,
                "career": career_slug,
                "semester": semester,
                "fit_score": fit_info["fitScore"],
                "coverage": fit_info["coverage"],
                "readiness": fit_info["readiness"],
                "interest_category": interest_cat,
            }

            # Skill features: proficiency level 0..5 for each skill
            for s_slug in all_skill_slugs:
                row[f"skill_{s_slug}"] = profile.get(s_slug, 0)

            # Target label: chosen next skill
            row["chosen_next_skill"] = chosen_next_skill

            records.append(row)

    df = pd.DataFrame(records)

    full_path = output_dir / "profiles.csv"
    sample_path = output_dir / "sample.csv"

    df.to_csv(full_path, index=False)
    df.head(50).to_csv(sample_path, index=False)

    print(f"Generated {len(df)} profiles across {len(careers)} careers.")
    print(f"Saved full dataset to: {full_path}")
    print(f"Saved 50-row sample to: {sample_path}")

    return df


if __name__ == "__main__":
    env_seed = int(os.getenv("SEED", "42"))
    generate_dataset(num_profiles=5000, seed=env_seed)
