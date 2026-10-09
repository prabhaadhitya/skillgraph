"""
Python reference implementation of the SkillGraph engine.
Matches docs/ARCHITECTURE.md section 5 and backend/src/services/engine/*.
"""

import json
from pathlib import Path
from typing import Dict, List, Set, Any, Optional, Tuple


FIT_WEIGHTS = {
    "coverage": 0.85,
    "readiness": 0.15,
}

PRIORITY_WEIGHTS = {
    "importance": 0.30,
    "gap": 0.25,
    "dependencyImpact": 0.30,
    "ready": 0.15,
}


def get_gap_status(gap: int) -> str:
    """Return status classification for a gap value."""
    if gap <= 0:
        return "strong"
    if gap == 1:
        return "developing"
    if gap == 2:
        return "major"
    return "critical"


class CareerSkillRequirement:
    def __init__(self, skill_slug: str, importance: float, required_level: int):
        self.skill_slug = skill_slug
        self.importance = importance
        self.required_level = required_level


class CareerModel:
    def __init__(
        self,
        career_slug: str,
        skills_map: Dict[str, Dict[str, Any]],
        career_skills_list: List[CareerSkillRequirement],
        edges: List[Dict[str, Any]],
    ):
        self.career_slug = career_slug
        self.skills = skills_map
        self.career_skills_list = career_skills_list
        self.career_skill_map: Dict[str, CareerSkillRequirement] = {
            cs.skill_slug: cs for cs in career_skills_list
        }
        self.career_slugs: Set[str] = set(self.career_skill_map.keys())
        self.total_importance: float = sum(cs.importance for cs in career_skills_list)

        self.direct_prereqs: Dict[str, List[str]] = {s: [] for s in self.career_slugs}
        self.direct_dependents: Dict[str, List[str]] = {s: [] for s in self.career_slugs}

        for edge in edges:
            if edge.get("type") == "PREREQUISITE":
                src = edge.get("source")
                tgt = edge.get("target")
                if src in self.career_slugs and tgt in self.career_slugs:
                    self.direct_prereqs[tgt].append(src)
                    self.direct_dependents[src].append(tgt)

        # Transitive closure of descendants within the career (preserves BFS insertion order matching JS Set)
        self.descendants: Dict[str, List[str]] = {}
        for s in self.career_slugs:
            visited: Dict[str, None] = {}
            queue = list(self.direct_dependents[s])
            while queue:
                curr = queue.pop(0)
                if curr not in visited:
                    visited[curr] = None
                    queue.extend(self.direct_dependents.get(curr, []))
            self.descendants[s] = list(visited.keys())


def load_seed_data(seed_dir: Optional[Path] = None) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Load skills.json, relationships.json, and career-skills.json."""
    if seed_dir is None:
        # Default relative to this file: ml-service/app/engine_py.py -> ../../shared/seed
        seed_dir = Path(__file__).resolve().parent.parent.parent / "shared" / "seed"

    with open(seed_dir / "skills.json", "r", encoding="utf-8") as f:
        skills = json.load(f)
    with open(seed_dir / "relationships.json", "r", encoding="utf-8") as f:
        relationships = json.load(f)
    with open(seed_dir / "career-skills.json", "r", encoding="utf-8") as f:
        career_skills = json.load(f)

    return skills, relationships, career_skills


def build_career_models(seed_dir: Optional[Path] = None) -> Dict[str, CareerModel]:
    """Build precomputed CareerModel instances for all careers in seed data."""
    skills, relationships, career_skills = load_seed_data(seed_dir)
    skills_map = {s["slug"]: s for s in skills}

    careers = sorted(list({cs["career"] for cs in career_skills}))
    models = {}

    for c_slug in careers:
        c_reqs = [
            CareerSkillRequirement(
                skill_slug=cs.get("skill") or cs.get("skillSlug"),
                importance=cs["importance"],
                required_level=cs["requiredLevel"],
            )
            for cs in career_skills
            if cs["career"] == c_slug
        ]
        models[c_slug] = CareerModel(
            career_slug=c_slug,
            skills_map=skills_map,
            career_skills_list=c_reqs,
            edges=relationships,
        )

    return models


def is_ready(model: CareerModel, profile: Dict[str, int], slug: str) -> bool:
    """
    Check whether all direct prerequisites for a skill within the career subgraph are satisfied.
    ready(s) = every direct PREREQUISITE p of s within the career has gap(p) == 0,
               i.e. proficiency(p) >= requiredLevel(p).
    Skills with no direct prerequisites are always ready.
    """
    prereqs = model.direct_prereqs.get(slug, [])
    if not prereqs:
        return True
    for p_slug in prereqs:
        prof = profile.get(p_slug, 0)
        req = model.career_skill_map[p_slug].required_level
        if prof < req:
            return False
    return True


def compute_fit(model: CareerModel, profile: Dict[str, int]) -> Dict[str, Any]:
    """
    Compute career fit (estimated career alignment) for a student's profile.
    coverage  = sum(importance(s) * min(proficiency(s), requiredLevel(s)) / requiredLevel(s)) / totalImportance
    readiness = sum(importance(s) * (1 if ready(s) else 0)) / totalImportance
    fitScore  = round(100 * (0.85 * coverage + 0.15 * readiness))
    """
    if not model.career_skills_list or model.total_importance <= 0:
        return {
            "fitScore": 0,
            "coverage": 0.0,
            "readiness": 0.0,
            "band": "early",
        }

    weighted_coverage_sum = 0.0
    weighted_readiness_sum = 0.0

    for cs in model.career_skills_list:
        slug = cs.skill_slug
        prof = profile.get(slug, 0)
        req = cs.required_level
        imp = cs.importance

        satisfied_ratio = min(prof, req) / req
        weighted_coverage_sum += imp * satisfied_ratio

        if is_ready(model, profile, slug):
            weighted_readiness_sum += imp

    raw_coverage = weighted_coverage_sum / model.total_importance
    raw_readiness = weighted_readiness_sum / model.total_importance

    # Round to 4 decimals matching JS implementation
    coverage = round(raw_coverage, 4)
    readiness = round(raw_readiness, 4)

    fit_score = round(100.0 * (FIT_WEIGHTS["coverage"] * coverage + FIT_WEIGHTS["readiness"] * readiness))

    if fit_score < 40:
        band = "early"
    elif fit_score < 70:
        band = "developing"
    else:
        band = "strong"

    return {
        "fitScore": fit_score,
        "coverage": coverage,
        "readiness": readiness,
        "band": band,
    }


def compute_priorities(model: CareerModel, profile: Dict[str, int]) -> Dict[str, float]:
    """
    Compute unrounded priority scores for career skills that have gap > 0.
    gapNorm          = gap(s) / 5
    dependencyImpact = sum(importance(d) for d in descendants(s) with gap(d) > 0) / maxRaw (0 if maxRaw == 0)
    readyBonus       = 1.0 if is_ready(s) else 0.0
    priority         = 0.30 * importance + 0.25 * gapNorm + 0.30 * dependencyImpact + 0.15 * readyBonus
    """
    gaps: Dict[str, int] = {}
    for cs in model.career_skills_list:
        slug = cs.skill_slug
        prof = profile.get(slug, 0)
        gap = max(0, cs.required_level - prof)
        if gap > 0:
            gaps[slug] = gap

    if not gaps:
        return {}

    raw_impacts: Dict[str, float] = {}
    max_raw = 0.0

    for slug in gaps:
        sum_imp = 0.0
        descendants = model.descendants.get(slug, [])
        for desc_slug in descendants:
            if desc_slug in gaps:
                sum_imp += model.career_skill_map[desc_slug].importance
        raw_impacts[slug] = sum_imp
        if sum_imp > max_raw:
            max_raw = sum_imp

    priorities: Dict[str, float] = {}
    w = PRIORITY_WEIGHTS

    for slug, gap in gaps.items():
        cs = model.career_skill_map[slug]
        importance = cs.importance
        gap_norm = gap / 5.0
        dep_impact = (raw_impacts[slug] / max_raw) if max_raw > 0 else 0.0
        ready_bonus = 1.0 if is_ready(model, profile, slug) else 0.0

        p = (
            w["importance"] * importance
            + w["gap"] * gap_norm
            + w["dependencyImpact"] * dep_impact
            + w["ready"] * ready_bonus
        )
        priorities[slug] = p

    return priorities


def compare_candidates_key(slug: str, priorities: Dict[str, float], model: CareerModel) -> Tuple[float, int, str]:
    """
    Key function for tie-breaking candidates.
    We sort by:
    1. priority desc (-priority)
    2. difficulty asc (+difficulty)
    3. name asc (+name)
    """
    p = priorities.get(slug, 0.0)
    skill_info = model.skills.get(slug, {})
    difficulty = skill_info.get("difficulty", 1)
    name = skill_info.get("name", slug)

    # In Python, we want priority descending (higher is better), so we return -round(p, 9)
    # difficulty ascending (lower is better) -> difficulty
    # name ascending (alphabetical) -> name
    return (-round(p, 9), difficulty, name)


def compute_gap_items(model: CareerModel, profile: Dict[str, int]) -> Dict[str, Any]:
    """Compute gap summary and items list."""
    strong = 0
    developing = 0
    missing = 0

    priorities = compute_priorities(model, profile)
    gap_items = []
    no_gap_items = []

    for cs in model.career_skills_list:
        slug = cs.skill_slug
        skill = model.skills.get(slug, {})
        prof = profile.get(slug, 0)
        req = cs.required_level
        gap = max(0, req - prof)
        imp = cs.importance

        if prof == 0:
            missing += 1
        elif gap == 0:
            strong += 1
        else:
            developing += 1

        p_score = round(priorities[slug], 2) if gap > 0 and slug in priorities else 0.0

        item = {
            "skill": {
                "slug": slug,
                "name": skill.get("name", slug),
                "category": skill.get("category", ""),
            },
            "proficiency": prof,
            "requiredLevel": req,
            "gap": gap,
            "importance": imp,
            "status": get_gap_status(gap),
            "isMissing": prof == 0,
            "isReady": is_ready(model, profile, slug),
            "priority": p_score,
        }

        if gap > 0:
            gap_items.append(item)
        else:
            no_gap_items.append(item)

    # Sort gap items by tie-break
    gap_items.sort(key=lambda x: compare_candidates_key(x["skill"]["slug"], priorities, model))

    # Sort no-gap items by importance desc, then name asc
    no_gap_items.sort(
        key=lambda x: (-round(x["importance"], 9), x["skill"]["name"])
    )

    return {
        "summary": {
            "strong": strong,
            "developing": developing,
            "missing": missing,
            "total": len(model.career_skills_list),
        },
        "items": gap_items + no_gap_items,
    }


def get_next_skills(model: CareerModel, profile: Dict[str, int], limit: int = 3) -> List[Dict[str, Any]]:
    """
    Get top ready skills recommended next for the student's profile.
    - Must have gap > 0
    - Must be ready under current profile (every direct prerequisite has gap 0)
    - Sorted by priority desc (tie-break: difficulty asc, then name asc)
    - Score rounded to 2 decimal places
    """
    priorities = compute_priorities(model, profile)
    ready_candidates = [
        slug for slug in priorities if is_ready(model, profile, slug)
    ]

    ready_candidates.sort(key=lambda s: compare_candidates_key(s, priorities, model))

    results = []
    for slug in ready_candidates[:limit]:
        skill = model.skills.get(slug, {})
        p_val = priorities[slug]
        results.append({
            "skill": {
                "slug": slug,
                "name": skill.get("name", slug),
                "category": skill.get("category", ""),
            },
            "score": round(p_val, 2),
            "isReadyNow": True,
        })
    return results


def build_learning_path(model: CareerModel, profile: Dict[str, int]) -> Dict[str, Any]:
    """
    Build a greedy, prerequisite-aware learning path for the career goal.
    Each iteration picks the top ready candidate by priority and tie-breakers,
    marks it completed, and recomputes priorities.
    """
    state = dict(profile)
    steps = []

    while True:
        priorities = compute_priorities(model, state)
        if not priorities:
            break

        ready_candidates = [
            slug for slug in priorities if is_ready(model, state, slug)
        ]

        if not ready_candidates:
            raise RuntimeError("Deadlock: No ready skills remaining despite open gaps.")

        ready_candidates.sort(key=lambda s: compare_candidates_key(s, priorities, model))
        pick = ready_candidates[0]

        skill = model.skills.get(pick, {})
        cs = model.career_skill_map[pick]
        from_level = state.get(pick, 0)
        to_level = cs.required_level
        difficulty = skill.get("difficulty", 1)
        effort_points = (to_level - from_level) * difficulty
        unrounded_p = priorities[pick]
        p_rounded = round(unrounded_p, 2)

        steps.append({
            "order": len(steps) + 1,
            "skill": {
                "slug": pick,
                "name": skill.get("name", pick),
                "category": skill.get("category", ""),
                "difficulty": difficulty,
            },
            "fromLevel": from_level,
            "toLevel": to_level,
            "priority": p_rounded,
            "effortPoints": effort_points,
        })

        state[pick] = to_level

    total_steps = len(steps)
    total_effort_points = sum(s["effortPoints"] for s in steps)

    return {
        "totalSteps": total_steps,
        "totalEffortPoints": total_effort_points,
        "steps": steps,
    }
