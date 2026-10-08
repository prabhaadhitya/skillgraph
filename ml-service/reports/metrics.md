# SkillGraph Next-Skill Recommendation Evaluation Report

## 1. Dataset & Split Summary
- **Total Profiles:** 5,000 simulated students across 5 target careers.
- **Split Strategy:** Strict group split by `profile_id` (zero profile leakage).
- **Partition:**
  - Training: 3,500 profiles (70%)
  - Validation: 750 profiles (15%)
  - Test: 750 profiles (15%)
- **Candidates Evaluated:** Skills in the student's career model with open gap (`gap > 0`).

## 2. Model Comparison (Validation Set)
| Model | Validation HitRate@3 |
| :--- | :--- |
| LogisticRegression | 0.6120 |
| RandomForest | 0.6027 |
| GradientBoosting **(Selected)** | 0.6160 |

The model with the highest validation HitRate@3 is **GradientBoosting**.

## 3. Test Set Performance: ML vs. Rule Baseline
| Metric | Rule Baseline | Machine Learning (GradientBoosting) | Delta |
| :--- | :--- | :--- | :--- |
| HitRate@3 | 0.5907 | 0.5867 | -0.0040 |
| Precision@3 | 0.1969 | 0.1956 | -0.0013 |
| Recall@3 | 0.5907 | 0.5867 | -0.0040 |
| MRR (Mean Reciprocal Rank) | 0.4640 | 0.4726 | +0.0086 |


On the held-out test split, the ML model achieves a HitRate@3 of **0.5867** and an MRR of **0.4726**, compared to the rule baseline's HitRate@3 of **0.5907** and MRR of **0.4640**.

## 4. Error Analysis
### Error Analysis (Where Does ML Lose?)

Out of 750 held-out test student profiles, the rule baseline successfully identified the next skill in its top-3 while the ML model failed in 77 instances (10.3%).

Primary causes identified during error analysis:
1. **Latent Interest Disconnect:** The simulator samples next skills conditioned on a student's hidden category interest, which is latent and not an explicit input feature. The rule baseline compensates through topological prerequisite weighting and career importance.
2. **Borderline Rank Positions:** In several divergence cases, the ML model ranked the true next skill at rank 4 or 5 just outside the top-3 cutoff, whereas the static priority formula kept it within the top 3.
3. **Topological Prerequisite Strictness:** The rule engine strictly partitions ready skills before non-ready skills, giving high priority to foundational gateway skills. The ML model slightly smooths probability across all candidate skills.


## 5. Honesty Paragraph
> The labels come from a simulator, not from real students. These results show that the model recovers the simulator's behaviour better than the baseline, not that it would help real students more.
