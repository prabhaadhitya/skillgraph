# SkillGraph ML Service — Synthetic Dataset Notes

## 1. Overview
The dataset (`data/profiles.csv`) contains 5,000 simulated student profiles distributed equally across the five seed careers (`software-developer`, `data-analyst`, `data-scientist`, `machine-learning-engineer`, and `cloud-devops-engineer`).

A committed 50-row preview is stored in `data/sample.csv`, while the full dataset is generated deterministically via `python data/generate_synthetic.py` (using random seed 42).

## 2. Generation Methodology
Each synthetic student profile is generated using the following procedure:
1. **Academic Semester & Progress:**
   - A student is assigned an academic semester $s \in \{1, \dots, 8\}$.
   - Learning progress fraction is sampled with a mean proportional to the semester ($\mu \approx 0.08 + (s / 8) \times 0.70$) with Gaussian noise, bounded in $[0.05, 0.85]$.
2. **Topological Skill Acquisition:**
   - Skills within the target career are ordered topologically by direct `PREREQUISITE` dependencies.
   - Skills are populated sequentially: a student cannot advance to higher-level dependencies without first acquiring foundational prerequisites, reflecting realistic curricular progression.
   - A small amount of noise (10%) allows occasional self-directed learners who study ahead.
   - Minor off-career elective skills (1–3 skills, levels 1–2) are added to reflect general curiosity and coursework outside the target career.
3. **Hidden Interest Bias:**
   - Each student is assigned a latent category interest (e.g. `ai-llm`, `database`, `web-development`, `devops`).
   - Skills matching the student's interest receive higher engagement and priority.

## 3. Ground-Truth Behaviour Simulator
To train and evaluate candidate ranking models, the ground-truth "next learned skill" is chosen by simulating student decision-making over all **ready** skills with an open gap ($gap > 0$ where all direct prerequisites have $gap = 0$):

$$\text{logit}(s) = 0.60 \times \text{importance} + 1.20 \times \text{easiness} + 0.80 \times \text{unlocked\_count} + 1.00 \times \text{interest\_match} - 0.40 \times \text{gap\_norm} + 0.30 \times \text{semester\_factor} + \epsilon$$

Where:
- $\text{easiness} = (6 - \text{difficulty}) / 5$ (students strongly prefer accessible, lower-difficulty skills for immediate wins).
- $\text{unlocked\_count} = \min(1.0, \text{dependents with gap} / 5)$ (students prefer skills that unblock downstream opportunities).
- $\text{interest\_match} = 1.0$ if the skill belongs to the student's hidden interest category, else $0.0$.
- $\epsilon \sim \mathcal{N}(0, 0.15)$ represents stochastic human choice.

The choice is sampled via softmax over ready candidates.

### Contrast with Baseline Rule Engine
The rule engine prioritizes purely by:
$$\text{Priority}_{\text{rule}} = 0.30 \times \text{importance} + 0.25 \times \frac{\text{gap}}{5} + 0.30 \times \text{dependencyImpact} + 0.15 \times \text{ready}$$

Because the simulator emphasizes low difficulty, immediate unblocking, and student interest, the ML model has distinctive behavioral patterns to learn that diverge from the static rule baseline.

## 4. Dataset Schema
- `profile_id`: Unique student identifier (`prof_0001` through `prof_5000`).
- `career`: Target career slug.
- `semester`: Academic semester (1–8).
- `fit_score`: Estimated career alignment score (0–100) calculated by `engine_py.py`.
- `coverage`: Weighted skill coverage ratio.
- `readiness`: Weighted prerequisite readiness ratio.
- `interest_category`: Latent category interest.
- `skill_<slug>`: Proficiencies (levels 0–5) for all 71 skills in the catalog.
- `chosen_next_skill`: Label indicating the skill the student chose to learn next.

## 5. Train / Validation / Test Split Rule
- Partitioning must be performed **strictly by profile** (using `GroupShuffleSplit` on `profile_id` or splitting profile IDs before expanding candidates).
- **Never split by candidate row**: candidate pairs from the same student must never appear across both training and evaluation splits to prevent feature leakage.

## 6. Real-World Efficacy Disclaimer
Labels come from a simulator, not from real students, so metrics show how well the model recovers the simulator, not real-world effectiveness.
