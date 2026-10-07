# SkillGraph — Testing Strategy

Seven days, five people: we test **what would embarrass us in the viva** and **what is cheap to automate**. The engine and the API contracts get real tests; the UI gets a few component tests plus a scripted manual walkthrough.

## 1. Test pyramid and priorities
| Level | Tool | Scope | Priority |
|---|---|---|---|
| Unit — **engine** | Vitest | gap, fit, priority, path, what-if, compare, graph utils | **P0** |
| Unit — seed validator | Vitest | rules V1–V11 on good and bad fixtures | **P0** |
| API integration | Vitest + Supertest + `mongodb-memory-server` | auth, roles, users/skills, analysis, admin rules, settings | **P0** |
| ML | pytest | feature builder, parity with golden fixtures, API contract, metrics file exists | **P0** |
| LLM pipeline | Vitest with mocked OpenRouter client | intent validation, fallbacks, key never leaks | **P0** |
| Frontend components | Vitest + React Testing Library | `LevelPicker`, `Button`, onboarding validation, `ProtectedRoute` | P1 |
| E2E | Manual script (§6) | Definition of Done 1–15 | **P0** |
| Browser E2E automation | Playwright (optional) | one smoke test: login → graph → update skill | P2 |

Tests never hit Atlas or OpenRouter. API tests use an in-memory MongoDB (fallback: separate DB `skillgraph_test` via `TEST_MONGODB_URI`). LLM tests inject a fake client.

## 2. Commands
| Package | Command |
|---|---|
| backend | `npm test` (all) · `npm run test:engine` · `npm run seed:validate` |
| frontend | `npm test` |
| ml-service | `pytest` · `python -m training.evaluate` |

## 3. Engine unit tests (the most important suite — Member 3)
Use small hand-built graphs so expected numbers can be verified by hand, plus golden fixtures in `shared/fixtures/engine_golden.json` (also asserted by Python).

| # | Case | Expected |
|---|---|---|
| E1 | `gap`: proficiency ≥ required | gap 0, status `strong` |
| E2 | `gap` 1 / 2 / 3 / 5 | `developing / major / critical / critical` |
| E3 | Fit with empty profile | `coverage = 0`; score = `round(100 × 0.15 × readiness)` (only root skills are ready) |
| E4 | Fit with every skill at required level | 100 |
| E5 | Fit is monotonic: raising any proficiency never lowers the score | property test over random profiles |
| E6 | Fit ignores levels above required (`min` cap) | same score for 4 and 5 when required = 4 |
| E7 | `ready`: prerequisite one level below its `requiredLevel` → not ready; at `requiredLevel` → ready; skill with no prerequisites → always ready | |
| E8 | `dependencyImpact` = raw ÷ max raw; result in [0,1]; the maximum skill = 1; all-zero case → 0 (no divide-by-zero) | |
| E9 | Priority increases with importance and with gap (others equal) | |
| E10 | **Path respects prerequisites:** for every step, every direct prerequisite that had a gap appears **earlier**; the rest already had gap 0 | property test on seeded careers |
| E11 | Path never deadlocks and ends with all gaps closed | all 5 careers × 20 random profiles |
| E11b | **Next skill #1 equals path step 1** | all golden cases |
| E11c | Reproduces every case in `shared/fixtures/engine_golden.json` (fit, summary, next skills, path order, priorities to 2 dp) | golden file |
| E12 | Path with no gaps | empty steps, `totalSteps = 0` |
| E13 | `effortPoints = (to − from) × difficulty` | |
| E14 | Node state: top-3 ready skills → `recommended`; others by gap/proficiency | |
| E15 | What-if does not mutate input profile/target | deep-equality before/after |
| E16 | Compare: `common ∪ uniqueToA = careerA skills`, `common ∪ uniqueToB = careerB skills` | |
| E17 | Cycle detection rejects A→B→A | |
| E18 | Closure checker reports missing prerequisites | |

## 4. API tests (Member 2 / owners of each endpoint)
| # | Case | Expected |
|---|---|---|
| A1 | Register valid user | 201, cookie set, no `passwordHash` in body |
| A2 | Register duplicate email | 409 `CONFLICT` |
| A3 | Register with `role: "admin"` | 400 `VALIDATION_ERROR` |
| A4 | Login wrong password / unknown email | 401 with identical message |
| A5 | `GET /auth/me` without cookie | 401 |
| A6 | Student calls `/admin/skills` | 403 |
| A7 | Student updates own skill; other user's data unaffected | ownership via token |
| A8 | `PATCH` skill proficiency 6 / −1 / "3" | 400 |
| A9 | `PUT /users/me/skills` replaces profile; 0 removes | rows match |
| A10 | Update skill without target career | 422 |
| A11 | Admin creates PREREQUISITE cycle | 422 with readable message |
| A12 | Admin saves career skills missing a prerequisite | 422 with `details` list |
| A13 | `GET /analysis/skill-gap` for seeded persona | summary counts add up (`strong + developing + missing = total`) |
| A14 | After `PATCH` skill, `GET /analysis/dashboard` shows new score and `previousScore` | |
| A15 | `GET /settings/llm` after saving key | `hasKey: true`, `keyLast4`, **no** raw key anywhere in JSON |
| A16 | Rate limit on login | 429 after threshold |
| A17 | Response envelope on every route | `success` boolean, `data` or `error` |

## 5. ML and LLM tests
**ML (Member 3):** feature builder returns fixed-length vectors; unseen skill slug handled; `/recommend` returns only skills with gap > 0; scores sorted; `X-Internal-Key` required; `reports/metrics.json` contains `ml` and `baseline` blocks; baseline in Python equals engine golden results; training is deterministic with the stored seed.

**LLM / integration (Member 5):**
| # | Case | Expected |
|---|---|---|
| L1 | Intent model returns invalid JSON | keyword router used, answer still returned |
| L2 | Intent with unknown skill slug | `out_of_scope` / clarification, no crash |
| L3 | Compose call times out | `degraded: true` template answer |
| L4 | No user key and daily cap reached | template answer + `notice` about Settings |
| L5 | Prompt contains only the caller's data | assert no other user's ids/skills in the built prompt |
| L6 | Logs and error bodies never contain the key | assert on captured logger output |
| L7 | ML service down | `/recommendations` returns `strategy: "rule"`, `fallbackReason: "ML_UNAVAILABLE"` |
| L8 | Injection string in message | normal behaviour, system prompt not echoed |

**Manual prompt set (run on 11–12 Oct, record results in the report):** 12 questions covering the 6 intents (see §6 step 13). Mark each *grounded / partly / ungrounded*.

## 6. Manual acceptance script (viva rehearsal — owner: integrator, everyone present)
Environment: fresh seed (`npm run seed && npm run seed:demo`), all three services running.

| Step | Action | Pass criteria (DoD #) |
|---|---|---|
| 1 | Register a new user | cookie set, lands in onboarding (1) |
| 2 | Complete onboarding as *Machine Learning Engineer* with 6 skills rated | profile saved (2, 3, 4, 5) |
| 3 | Dashboard | alignment %, summary counts, next skills, strategy badge (10) |
| 4 | Open **Skill Graph** | only ML-engineer subgraph, five state colours + icons + legend (6) |
| 5 | Click `Statistics` | panel shows category, proficiency, prerequisites, unlocks, importance (7, 8) |
| 6 | Set Statistics 1 → 3 | node recolours, alignment rises, next skills change (13, 14) |
| 7 | Open **Learning Path** | ordered steps; no step before its prerequisites (9) |
| 8 | Ask "Why should I learn SQL?" | answer mentions the student's career and real prerequisite relations (11, 12) |
| 9 | Ask "I only have 2 months, what should I focus on?" | plan limited to ~8 weeks of effort (12) |
| 10 | Careers → compare Data Scientist vs ML Engineer; run What-If | three-column compare; old vs new alignment |
| 11 | Settings → add a (fake) key → Test → see error handled; remove key | no crash, key never displayed |
| 12 | Stop the ML service, reload dashboard | badge switches to `RULES`; app still works |
| 13 | Ask with LLM unavailable (bad key) | "Quick answer" degraded response |
| 14 | Analytics page | charts render (15) |
| 15 | Log in as `admin` → add a skill, add a prerequisite, try a cycle | rule enforced; analytics + model panel visible |
| 16 | Log in as student, open `/admin` | 403 page |

## 7. Non-functional checks
- **Performance:** `GET /analysis/*` < 500 ms locally (log durations); graph with ~30 nodes pans at 60 fps on a laptop.
- **Accessibility:** tab through login, onboarding, graph; run Lighthouse accessibility on landing + dashboard (target ≥ 90).
- **Cross-browser:** latest Chrome and Edge (demo machine); Firefox smoke check.
- **Responsive:** 1366×768, 1024×768, 390×844 spot-check.
- **Security:** checklist in `SECURITY.md` §12.

## 8. ML evaluation report (deliverable for the documentation)
`ml-service/reports/metrics.md` contains: data generation summary, split (by profile), model comparison table (LogReg / RandomForest / GradientBoosting), final ML vs baseline table (Precision@3, Recall@3, Hit Rate@3, MRR), a short error analysis, and the **honesty paragraph** (synthetic labels ⇒ results show simulator recovery, not real-world efficacy).

## 9. Bug workflow
1. Reproduce → write the failing test when it is logic (otherwise note steps).
2. Label with area (`m1`…`m5`) and severity: **blocker** (breaks DoD), **major**, **minor**.
3. Blockers are fixed by the owner immediately; majors before the freeze; minors only if time remains.
4. After Day 6 noon: **only blocker fixes** are merged into `main`.

## 10. Test data
- Seed + demo personas (`DATABASE.md` §7).
- Fixtures for UI mocks mirror `API.md` examples exactly.
- Engine tests use tiny synthetic graphs defined inline plus the golden file.
