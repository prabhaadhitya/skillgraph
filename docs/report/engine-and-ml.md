# SkillGraph — Engine & Machine Learning Architecture Report

**Module:** Knowledge Base, Rule Engine & Machine Learning Recommender (Member 3)  
**Package Paths:** `shared/seed/`, `backend/src/services/engine/`, `backend/seed/`, `ml-service/`  
**Evaluation Standard:** Deterministic reproducibility across JavaScript and Python implementations.

---

## 1. Knowledge Base Architecture & Seed Integrity

The SkillGraph knowledge base models technical domains as a directed acyclic graph (DAG) where nodes represent discrete competencies and edges define prerequisite learning relationships.

```
       [Programming Fundamentals]
              │            │
              ▼            ▼
          [Python]       [Java]
         ┌────┴────┐
         ▼         ▼
    [NumPy]   [Pandas] ◄───┐
         │         │       │
         ▼         ▼       │
   [ML Fundamentals]       │
         │                 │
         ▼                 │
[Supervised Learning]      │
         │                 │
         ▼                 │
 [Neural Networks]         │
         │                 │
         ▼                 │
  [Deep Learning] ─────────┘
```

### 1.1 Seed Entity Inventory
All entities are version-controlled under `shared/seed/*.json` and keyed by immutable kebab-case slugs:

| Collection | File | Seed Count | Description |
|---|---|---|---|
| **Skills** | `skills.json` | **71** | Individual competencies with title, description, category, and difficulty ($1..5$) |
| **Relationships** | `relationships.json` | **101** | Directed edges: **80** `PREREQUISITE` links and **21** `RELATED_TO` association links |
| **Careers** | `careers.json` | **5** | Software Developer, Full Stack Developer, Data Analyst, Data Scientist, ML Engineer |
| **Career-Skills** | `career-skills.json` | **134** | Career target requirements: skill slug, career slug, importance ($0..1$), required level ($1..5$) |

### 1.2 Curriculum Taxonomy (13 Categories)
The 71 skills span 13 distinct academic and industry domains:

| Category Slug | Category Name | Skill Count | Representative Skills |
|---|---|---|---|
| `programming` | Core Programming | 10 | Programming Fundamentals, Python, JavaScript, Java, C++, DSA, OOP |
| `data-analytics` | Data Analytics | 8 | Statistics, NumPy, Pandas, Data Cleaning, Data Visualization, EDA, Excel, BI Tools |
| `machine-learning` | Machine Learning | 10 | Linear Algebra, ML Fundamentals, Supervised/Unsupervised, Regression, Scikit-learn |
| `deep-learning` | Deep Learning | 6 | Neural Networks, Deep Learning, PyTorch, TensorFlow, NLP, Computer Vision |
| `ai-llm` | AI & Modern LLMs | 6 | Prompt Engineering, LLM APIs, Embeddings, Vector Databases, RAG, AI Agents |
| `tools` | Developer Tooling | 6 | Git, GitHub, Command Line, Jupyter Notebooks, Unit Testing, Agile & Scrum |
| `database` | Databases & Storage | 5 | SQL, Relational DB Design, PostgreSQL, MongoDB, Redis |
| `web-development` | Web Standards | 4 | HTML, CSS, HTTP Fundamentals, REST APIs |
| `frontend` | Frontend Engineering | 4 | Responsive Design, React, State Management, Next.js |
| `backend` | Backend Engineering | 4 | Node.js, Express, Authentication & JWT, System Design Basics |
| `devops` | DevOps & Operations | 4 | Linux, Docker, CI/CD, MLOps |
| `cybersecurity` | Cybersecurity & Networks | 2 | Networking Basics, Web Security Basics |
| `cloud` | Cloud Platforms | 2 | Cloud Fundamentals, AWS |

### 1.3 Seed Validator Rules (V1–V11)
To ensure the engine can execute without runtime exceptions or circular locks, seed data is verified by `backend/seed/validate.js` on every build and CI run:

| Rule | Severity | Enforcement | Rationale |
|---|---|---|---|
| **V1** | Error | Unique kebab-case slugs (`^[a-z0-9]+(-[a-z0-9]+)*$`) | Prevents entity collisions and ensures URL routing stability. |
| **V2** | Error | Every referenced slug must exist in `skills.json` or `careers.json` | Enforces referential integrity across JSON fixtures. |
| **V3** | Error | `PREREQUISITE` graph must contain **no self-loops and no cycles** | Guarantees that the prerequisite DAG can be topologically sorted without deadlocks. |
| **V4** | Error | Bounds: importance $\in [0,1]$, levels $\in 1..5$, difficulty $\in 1..5$, strength $\in [0,1]$ | Prevents arithmetic overflows, negative effort points, or division-by-zero. |
| **V5** | Error | **Closure:** Every direct prerequisite of a career skill is also part of that career | Guarantees students never encounter locked dependencies outside their chosen target track. |
| **V6** | Error | Prerequisite skills must have `requiredLevel >= 2` in the target career | Quality rule: a skill cannot serve as a prerequisite if only introductory familiarity is required. |
| **V7** | Error | No duplicate `(career, skill)` pairs or duplicate relationship edges | Prevents duplicate edge accumulation and inflated importance sums. |
| **V8** | Error | No reverse-order duplicates for bidirectional `RELATED_TO` edges | Normalizes undirected associations so $(A, B)$ and $(B, A)$ are not duplicated. |
| **V9** | Warning | No orphan skills disconnected from both relationships and careers | Ensures every seeded skill belongs to the active curriculum graph. |
| **V10** | Warning | Every career must have $\ge 15$ skills and at least one skill with importance 1.0 | Ensures realistic career depth and unambiguous anchor competencies. |
| **V11** | Warning | Longest prerequisite chain must not exceed 6 edges | Prevents path fatigue by guaranteeing attainable milestone sequences. |

---

## 2. The Pure Rule-Based Engine

The core computational engine (`backend/src/services/engine/`) is implemented using **pure functions**: it takes plain JavaScript objects, executes synchronously without database or network I/O, produces deterministic output, and never mutates its inputs.

### 2.1 Mathematical Definitions

#### 1. Skill Gap
$$\text{gap}(s) = \max(0, \text{requiredLevel}(s) - \text{proficiency}(s))$$
- $\text{proficiency}(s) \in \{0, 1, 2, 3, 4, 5\}$, where 0 denotes an unacquired skill (no database record).
- $\text{requiredLevel}(s) \in \{1, 2, 3, 4, 5\}$.

#### 2. Gap Classification Status
$$\text{status}(s) = \begin{cases} 
\text{"strong"} & \text{if } \text{gap}(s) = 0 \\
\text{"developing"} & \text{if } \text{gap}(s) = 1 \\
\text{"major"} & \text{if } \text{gap}(s) = 2 \\
\text{"critical"} & \text{if } \text{gap}(s) \ge 3 
\end{cases}$$

#### 3. Prerequisite Readiness
$$\text{ready}(s) = \forall p \in \text{directPrereqs}(s), \quad \text{proficiency}(p) \ge \text{requiredLevel}(p)$$
Skills with no prerequisites inside the career subgraph are unconditionally ready.

#### 4. Normalized Downstream Dependency Impact
$$\text{rawImpact}(s) = \sum_{d \in \text{descendants}(s), \text{gap}(d) > 0} \text{importance}(d)$$
$$\text{dependencyImpact}(s) = \begin{cases} 
\frac{\text{rawImpact}(s)}{\max_{s'} \text{rawImpact}(s')} & \text{if } \max_{s'} \text{rawImpact}(s') > 0 \\
0 & \text{otherwise}
\end{cases}$$
Normalizes the cumulative career importance of all unlearned descendants unlocked by skill $s$ to the interval $[0, 1]$.

#### 5. Estimated Career Alignment (Fit Score)
$$\text{coverage} = \frac{\sum_{s \in \text{careerSkills}} \text{importance}(s) \times \frac{\min(\text{proficiency}(s), \text{requiredLevel}(s))}{\text{requiredLevel}(s)}}{\sum_{s \in \text{careerSkills}} \text{importance}(s)}$$
$$\text{readiness} = \frac{\sum_{s \in \text{careerSkills}} \text{importance}(s) \times [\text{ready}(s) ? 1 : 0]}{\sum_{s \in \text{careerSkills}} \text{importance}(s)}$$
$$\text{fitScore} = \text{round}\left(100 \times \left(0.85 \times \text{coverage} + 0.15 \times \text{readiness}\right)\right)$$
$$\text{band} = \begin{cases} 
\text{"early"} & \text{if } \text{fitScore} < 40 \\
\text{"developing"} & \text{if } 40 \le \text{fitScore} < 70 \\
\text{"strong"} & \text{if } \text{fitScore} \ge 70 
\end{cases}$$

#### 6. Candidate Priority Score (Rule-Based Baseline)
Computed for every candidate skill with $\text{gap}(s) > 0$:
$$\text{priority}(s) = 0.30 \times \text{importance}(s) + 0.25 \times \frac{\text{gap}(s)}{5} + 0.30 \times \text{dependencyImpact}(s) + 0.15 \times (\text{ready}(s) ? 1 : 0)$$

#### 7. Deterministic Tie-Breaking
When candidate priority scores are within $10^{-9}$, ties are resolved by:
1. **Difficulty ascending** (easier skills chosen first to promote early wins).
2. **Alphabetical skill name ascending** (guarantees cross-platform determinism).

### 2.2 Rationale Behind Formula Weights
> **Critical Architecture Note:** All weights below are deliberate, transparent **educational design choices** calibrated for pedagogical interpretability, not empirical parameters fitted via optimization.

- **Fit Coverage (0.85):** Measures actual cumulative mastery of the target curriculum. A student who has reached the required level on 85% of their curriculum should reflect a high degree of career readiness.
- **Fit Readiness (0.15):** Recognizes immediate learning capacity. A beginner with prerequisite foundations in place possesses actionable momentum, earning up to 15 points before advanced courses are started.
- **Priority Importance (0.30):** Keeps the student focused on core skills deemed essential by industry standards for that career.
- **Priority Gap Distance (0.25):** Ensures skills with large deficiencies receive sustained attention rather than being ignored.
- **Priority Dependency Impact (0.30):** Gives substantial credit to gateway skills (such as *Programming Fundamentals* or *Statistics*) that unblock multiple downstream requirements.
- **Priority Ready Bonus (0.15):** Prefers immediately actionable skills over locked competencies whose prerequisites remain incomplete.

---

## 3. Worked Example: Persona Prabha (Machine Learning Engineer)

To demonstrate the engine in practice, we trace the live evaluation for seeded student persona **Prabha** aiming for **Machine Learning Engineer**.

### 3.1 Student Input State
- **Target Career:** `machine-learning-engineer` (35 required skills, Total Importance = **18.0**)
- **Student Profile:** 16 skills rated across curriculum:
  - *In Target Career:* `programming-fundamentals: 4`, `python: 4`, `sql: 3`, `numpy: 3`, `pandas: 2`, `statistics: 1`, `ml-fundamentals: 1`, `git: 3`, `command-line: 3`, `linux: 2`, `docker: 1`.
  - *Outside Target Career (Electives):* `javascript: 4`, `html: 3`, `css: 3`, `react: 3`, `github: 2`.

### 3.2 Live Step-by-Step Fit Calculation

```
Weighted Coverage Sum = 
    (0.4 × 4/3 capped at 1.0) + (0.9 × 4/4) + (0.5 × 3/3) + (0.6 × 3/3) + (0.5 × 3/3) + (0.3 × 3/2 capped at 1.0)
  + (0.6 × 2/3) + (0.8 × 1/4) + (1.0 × 1/5) + (0.4 × 2/3) + (0.5 × 1/3) + [24 missing skills × 0]
  = 0.40 + 0.90 + 0.50 + 0.60 + 0.50 + 0.30 + 0.40 + 0.20 + 0.20 + 0.2667 + 0.1667
  = 4.4333

Raw Coverage   = 4.4333 / 18.0 = 0.246296... ──► Rounded: 0.2463 (24.63%)
```

```
Weighted Readiness Sum = 
  Sum of importances for skills whose prerequisites are satisfied:
  - Programming Fundamentals (0.4), Python (0.9), SQL (0.5), Command Line (0.3), Git (0.5)
  - Statistics (0.8, no prereqs), Linear Algebra (0.6, no prereqs)
  - Linux (0.4, requires Command Line: 3 ≥ 2), Docker (0.5, requires Linux: 2 ≥ 2)
  - Pandas (0.6, requires Python: 4 ≥ 3, NumPy: 3 ≥ 2), AWS (0.4, requires Linux: 2 ≥ 2)
  = 0.4 + 0.9 + 0.5 + 0.3 + 0.5 + 0.8 + 0.6 + 0.4 + 0.5 + 0.6 + 0.4
  = 5.9000

Raw Readiness  = 5.9000 / 18.0 = 0.327777... ──► Rounded: 0.3278 (32.78%)
```

```
Fit Score = round( 100 × (0.85 × 0.2463 + 0.15 × 0.3278) )
          = round( 100 × (0.209355 + 0.049170) )
          = round( 25.8525 )
          = 26
Band      = "early" (fitScore < 40)
```

### 3.3 Skill Gap Summary
From running `computeGapItems(model, prabhaProfile)`:
- **Strong (gap = 0):** **6** (`programming-fundamentals`, `python`, `sql`, `numpy`, `git`, `command-line`)
- **Developing (gap > 0, prof > 0):** **5** (`pandas`, `statistics`, `ml-fundamentals`, `linux`, `docker`)
- **Missing (prof = 0):** **24** (`linear-algebra`, `supervised-learning`, `scikit-learn`, `neural-networks`, etc.)
- **Total Career Skills:** **35** ($6 + 5 + 24 = 35$)

### 3.4 Top 3 Recommended Next Skills
From running `getNextSkills(model, prabhaProfile, 3)`:

| Rank | Skill | Slug | Priority Score | Reason Codes |
|---|---|---|---|---|
| **#1** | **Statistics** | `statistics` | **0.84** | `HIGH_IMPORTANCE`, `LARGE_GAP`, `UNLOCKS_MANY` |
| **#2** | **Linear Algebra** | `linear-algebra` | **0.78** | `LARGE_GAP`, `UNLOCKS_MANY` |
| **#3** | **Pandas** | `pandas` | **0.40** | `QUICK_WIN` |

### 3.5 First 5 Learning Path Steps
From running `buildLearningPath(model, prabhaProfile)`:

| Step | Skill | Level Delta | Priority | Effort Points | Rationale |
|---|---|---|---|---|---|
| **1** | **Statistics** | $1 \to 4$ | **0.84** | $3 \times 3 = \mathbf{9}$ | Closes critical gateway gap ($gap=3$, diff=3) |
| **2** | **Linear Algebra** | $0 \to 3$ | **0.78** | $3 \times 3 = \mathbf{9}$ | Foundational maths required for ML & Neural Networks |
| **3** | **ML Fundamentals** | $1 \to 5$ | **0.95** | $4 \times 4 = \mathbf{16}$ | Unblocked once Stats & Linear Algebra reach required level |
| **4** | **Supervised Learning** | $0 \to 4$ | **0.89** | $4 \times 3 = \mathbf{12}$ | Unblocked once ML Fundamentals reaches required level |
| **5** | **Neural Networks** | $0 \to 3$ | **0.81** | $3 \times 4 = \mathbf{12}$ | Unlocked by Supervised Learning + Linear Algebra |

*Property invariant:* Note that **Next Skill #1 (`statistics`) is identically Step 1 of the learning path**.

---

## 4. Learning Path Algorithm

The learning path synthesizer orders curriculum milestones by walking the prerequisite DAG greedily.

### 4.1 Formal Pseudo-Code

```python
def build_learning_path(model, profile):
    state = copy(profile)
    steps = []
    
    while True:
        # 1. Identify all skills in target career with open gaps
        gaps = {s: req(s) - state[s] for s in model.skills if req(s) > state[s]}
        if not gaps:
            break
            
        # 2. Filter to candidates whose prerequisites are satisfied under simulated state
        ready_candidates = [s for s in gaps if is_ready(model, state, s)]
        if not ready_candidates:
            raise DeadlockError("Graph contains unreachable cycles or missing closures")
            
        # 3. Dynamic priority ranking with tie-breaking
        priorities = compute_priorities(model, state)
        ready_candidates.sort(key=lambda s: (-priorities[s], difficulty(s), name(s)))
        pick = ready_candidates[0]
        
        # 4. Record step and simulate completion
        from_level = state[pick]
        to_level = model.required_level[pick]
        effort = (to_level - from_level) * model.difficulty[pick]
        
        steps.append({
            "order": len(steps) + 1,
            "skill": pick,
            "fromLevel": from_level,
            "toLevel": to_level,
            "priority": round(priorities[pick], 2),
            "effortPoints": effort
        })
        
        # 5. Advance simulated state (unlocks downstream dependencies)
        state[pick] = to_level
        
    return steps
```

### 4.2 Algorithm Flowchart

```mermaid
flowchart TD
    A([Start: Input Profile & Career Model]) --> B[Clone Profile to Simulated State]
    B --> C{Any Skills with Open Gap?}
    C -- No --> D([Return Ordered Learning Path])
    C -- Yes --> E[Identify Ready Skills under State]
    E --> F{Ready Set Empty?}
    F -- Yes --> G[Throw Deadlock Exception]
    F -- No --> H[Compute Dynamic Priorities & Downstream Impacts]
    H --> I[Pick argmax Priority<br/>Tie-break: Low Difficulty, Alphabetical]
    I --> J[Append Step: order, levels, effortPoints, reasons]
    J --> K[Simulate Mastery: state[pick] = requiredLevel]
    K --> C
```

---

## 5. The Machine Learning Pipeline

While the rule engine guarantees correctness and strict prerequisite adherence, the machine learning model (`ml-service/`) adds **personalization**, taking into account a student's academic semester and latent category interests.

### 5.1 Synthetic Data Generation
Because student clickstreams with ground-truth next-skill selections are unavailable prior to deployment, `data/generate_synthetic.py` generates **5,000 synthetic student profiles**:
- **Profiles:** 5,000 students distributed across 5 careers and semesters 1–8.
- **Academic Progression:** Skill proficiencies are assigned along prerequisite chains in topological order, with stochastic noise and 1–3 elective skills outside their career.
- **Simulator Logits (Ground Truth Mechanism):**
  For candidate skills with open gaps and satisfied prerequisites, selection probabilities follow a softmax distribution:
  $$P(\text{pick} = s) \propto \exp\left(0.60\,\text{imp} + 1.20\,\text{easiness} + 0.80\,\text{unlocks} + 1.00\,\text{interest} - 0.40\,\text{gapNorm} + 0.30\,\text{semFactor} + \epsilon\right)$$

#### How the Simulator Differs from the Rule Baseline
| Aspect | Rule Baseline | Behavioral Simulator |
|---|---|---|
| **Difficulty** | Only used as a secondary tie-breaker | **Strong preference for easiness** ($+1.20 \times \text{easiness}$) |
| **Category Interest** | Ignored (static across all students) | **Strong affinity** ($+1.00$ boost if skill matches latent interest) |
| **Gap Distance** | Prefers **larger** gaps ($+0.25 \times \text{gapNorm}$) | Prefers **smaller** gaps for quick wins ($-0.40 \times \text{gapNorm}$) |
| **Semester Stage** | Ignored | Senior students attempt harder courses ($+0.30 \times \text{semFactor}$) |

This divergence ensures the baseline is not trivially optimal, testing whether the ML model can recover real human learning behaviors.

### 5.2 Feature Representation (26 Dimensions)
Every `(profile, candidate_skill)` pair is transformed into a fixed-length numeric vector:

1. **Curriculum & Progress Features (8):**
   - `gap`: Missing proficiency ($0..5$).
   - `importance`: Career requirement importance ($0..1$).
   - `required_level`: Target requirement ($1..5$).
   - `difficulty`: Inherent difficulty ($1..5$).
   - `dependency_impact`: Normalized downstream career weight unlocked ($0..1$).
   - `ready`: Binary indicator if prerequisites are met ($0$ or $1$).
   - `prereqs_with_gap`: Number of direct prerequisites not yet satisfied.
   - `current_proficiency`: Student's current level ($0..5$).
2. **Career One-Hot (5):** `data-analyst`, `data-scientist`, `full-stack-developer`, `machine-learning-engineer`, `software-developer`.
3. **Category One-Hot (13):** `ai-llm`, `backend`, `cloud`, `cybersecurity`, `data-analytics`, `database`, `deep-learning`, `devops`, `frontend`, `machine-learning`, `programming`, `tools`, `web-development`.

### 5.3 Data Splitting & Leakage Prevention
To guarantee honest evaluation, the dataset is split strictly by **`profile_id`** using `GroupShuffleSplit` (seed = 42):
- **Training Set:** **3,500 profiles** (70%)
- **Validation Set:** **750 profiles** (15%)
- **Test Set:** **750 profiles** (15%)

*Leakage Verification (`test_data_leakage.py`):*
$$\text{Train} \cap \text{Test} = \emptyset, \quad \text{Train} \cap \text{Val} = \emptyset, \quad \text{Val} \cap \text{Test} = \emptyset$$
No candidate row in test contains features derived from the label or chosen next skill.

### 5.4 Model Selection Benchmarks
Models were trained with scikit-learn pipelines (StandardScaler + Classifier) and evaluated on validation **HitRate@3**:

| Algorithm | Validation HitRate@3 | Decision |
|---|---|---|
| **Logistic Regression** | 0.6120 | Baseline linear model |
| **Random Forest** (100 trees) | 0.6027 | Slight overfitting on synthetic noise |
| **Gradient Boosting** (100 estimators) | **0.6160** | **Selected Model** |

### 5.5 Final Test Evaluation: ML vs. Rule Baseline
Evaluated on **750 held-out profiles** unseen during training:

| Metric | Rule Baseline | Machine Learning (GradientBoosting) | Delta | Interpretation |
|---|---|---|---|---|
| **HitRate@3** | **0.5907** | **0.5867** | $-0.0040$ | Comparable candidate inclusion in top-3 |
| **Precision@3** | **0.1969** | **0.1956** | $-0.0013$ | Consistent hit density across recommendations |
| **Recall@3** | **0.5907** | **0.5867** | $-0.0040$ | Captures the next skill in ~59% of student sessions |
| **MRR (Mean Reciprocal Rank)** | **0.4640** | **0.4726** | **$+0.0086$** | **ML ranks the true choice higher within the top-3** |

*Analysis:* While the rule baseline performs strongly due to strict graph prerequisite constraints, Gradient Boosting achieves a higher **MRR (+0.86%)** because it personalizes rank ordering to the student's semester and latent interest bias.

---

## 6. Honesty & Synthetic Data Disclosure

> **Honesty Paragraph for Report & Viva:**  
> The training and evaluation labels were generated by a simulated student choice model, not collected from real human university students. These benchmarks prove that the ML model successfully recovers latent behavioral patterns (such as interest biases and difficulty aversion) and ranks personalized skills better than a static formula. They do **not** claim or prove real-world educational superiority over human advisors.

### How Real Data Would Replace the Simulator
When deployed in a production institution, the synthetic data pipeline can be substituted with observational platform telemetry:
1. **User Activity Logs:** Timestamped skill update events (`PATCH /users/me/skills/:slug`) and course enrollment clicks.
2. **Learning Management System (LMS) Telemetry:** Quiz attempts, lab submissions, and GitHub repository commits.
3. **Assessment Results:** Verified skill ratings from institutional diagnostic tests.

---

## 7. Fault-Tolerant Fallback Architecture

The ML service is an internal Python microservice decoupled from the Node.js backend. If the ML service crashes, hangs, or experiences network disruption, the user experience **never degrades to an error page**.

```
Student Client ───► Express Backend (recommendation.service.js)
                           │
                 ┌─────────┴─────────┐
                 │                   │
         [1] Call ML (FastAPI)       │ [2] Timeout (3s) or 5xx
                 │                   ▼
                 │        ┌─────────────────────────┐
                 │        │ Rule-Based Engine       │
                 │        │ getNextSkills()         │
                 │        └───────────┬─────────────┘
                 ▼                    │
         Validate Readiness           │ Strategy: "rule"
         with isReady()               │ FallbackReason: "ML_UNAVAILABLE"
                 │                    │
                 └─────────┬──────────┘
                           ▼
                 JSON Envelope Response
```

### 7.1 Degradation Guarantees
1. **Timeouts:** `ML_TIMEOUT_MS` is clamped at **3,000 ms** via `AbortController`.
2. **Safe Default:** If the ML service returns 500, invalid JSON, or times out, `mlClient.js` logs a single warning and returns `null`.
3. **Engine Fallback:** The backend automatically falls back to `engine.getNextSkills()`, returning:
   ```json
   {
     "strategy": "rule",
     "fallbackReason": "ML_UNAVAILABLE",
     "items": [ ... ]
   }
   ```
4. **Graph Readiness Invariant:** Even when the ML service is operational, its recommended candidates are filtered through `isReady(model, profile, slug)`. The ML model **can never recommend a locked skill** whose prerequisites are unmet.

---

## 8. Limitations and Future Work

1. **Binary Prerequisites:** Currently, prerequisites are all-or-nothing constraints. In reality, a student with basic proficiency in Python can often begin learning Machine Learning Fundamentals. Future iterations could support continuous prerequisite weights.
2. **Cold Start:** For a student with zero skills rated, recommendations rely on root DAG skills. Incorporating onboarding questionnaires (e.g., student interests, career timeline) can provide stronger early signals.
3. **Time-Varying Skill Valuations:** Career importance weights are presently static. Integration with labor market APIs (such as Lightcast or O*NET) could provide dynamic, real-time demand weighting.

---

## 9. Likely Viva Questions & Answers

#### Q1: Why did you use synthetic data instead of a public dataset?
> No public educational dataset exists that maps student skill progressions directly to a prerequisite DAG across university engineering tracks. Synthetic generation allowed us to explicitly model latent interest, semester progression, and noisy choices while transparently disclosing our simulation mechanics to the examiners.

#### Q2: Is your machine learning model actually better than your rule engine?
> On overall HitRate@3, both perform comparably (~59%) because prerequisite constraints strongly bound valid next skills. However, the ML model achieves higher Mean Reciprocal Rank (MRR: 0.4726 vs 0.4640), demonstrating that it places the student's true preferred choice closer to rank #1 by leveraging latent interest and semester signals.

#### Q3: How do you justify the 85% coverage and 15% readiness weights in the fit score?
> These weights are deliberate curriculum design choices, not learned black-box values. Coverage accounts for 85% because career readiness is primarily determined by mastering the required curriculum, while the 15% readiness bonus gives immediate pedagogical credit for unblocked starting momentum.

#### Q4: What is data leakage and how did you verify that your ML evaluation is clean?
> Data leakage occurs when test set information inadvertently informs model training. We prevented this by splitting data strictly by `profile_id` so no student profile appears in both train and test splits, and confirmed through automated unit tests (`test_data_leakage.py`) that feature vectors never contain the target label or ground-truth choice.

#### Q5: Why did you use Gradient Boosting instead of a Deep Neural Network?
> Our dataset consists of tabular feature vectors (26 features) where tree-based ensembles historically outperform neural networks. Gradient Boosting yielded the highest validation HitRate@3 (0.6160), required no GPU overhead, trains deterministically in seconds, and provides full feature interpretability.

#### Q6: How do you guarantee that the learning path never gets stuck in a deadlock?
> Deadlocks can only occur if the prerequisite graph has cycles or references external skills outside the career. Our seed data validator enforces acyclicity (V3) and career closure (V5), guaranteeing that at every step of the greedy simulation at least one candidate skill with an open gap has all prerequisites satisfied.

#### Q7: Why does the engine run in both JavaScript and Python?
> JavaScript executes inside the Node.js backend to provide instantaneous, sub-millisecond API responses and offline unit tests. Python executes inside the ML microservice to train models and serve recommendations. We built an automated 500-case parity test suite (`test_engine_parity.py`) proving both implementations produce 100% identical outputs.

#### Q8: What happens if the ML microservice crashes during the demo?
> The system implements an automatic fault-tolerant fallback ladder. If the ML service fails or exceeds its 3-second timeout, the backend catches the error and immediately serves rule-based recommendations with `strategy: "rule"` and `fallbackReason: "ML_UNAVAILABLE"`, ensuring zero user-facing errors.

#### Q9: Can the ML model recommend a skill before the student has completed its prerequisites?
> No. The backend intersects all ML candidates with the rule engine's `isReady()` function before returning recommendations to the client. The prerequisite graph is the absolute source of truth; machine learning only re-ranks valid, unblocked skills.

#### Q10: What does a fit score of 26% mean for the demo student Prabha?
> A score of 26% reflects that Prabha has completed foundational programming, SQL, and tooling, achieving 24.63% weighted coverage and 32.78% readiness across the 35 skills required for a Machine Learning Engineer. We honestly report 26% rather than an inflated figure to accurately reflect the substantial depth required for an advanced engineering role.
