# SkillGraph — API Reference (contract)

Base URL (dev): `http://localhost:5000/api` · frontend uses `/api` through the Vite proxy.
All bodies are JSON (`Content-Type: application/json`). Authentication is an httpOnly cookie named `sg_token`.

**Build against this document.** Frontend members mock responses with exactly these shapes until the backend endpoint exists.

## 1. Conventions

### 1.1 Response envelope
```jsonc
// success
{ "success": true, "data": { }, "meta": { } }            // meta optional
// failure
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Human readable", "details": [ { "field": "email", "message": "Invalid email" } ] } }
```

### 1.2 Error codes
| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body/query/params fail validation (`details` lists fields) |
| 401 | `UNAUTHENTICATED` | Missing/invalid/expired cookie, wrong credentials |
| 403 | `FORBIDDEN` | Role not allowed |
| 404 | `NOT_FOUND` | Unknown slug / resource |
| 409 | `CONFLICT` | Duplicate email / slug / relationship |
| 422 | `RULE_VIOLATION` | Business rule broken (prerequisite cycle, closure violation, onboarding incomplete) |
| 429 | `RATE_LIMITED` | Too many requests |
| 502 | `UPSTREAM_ERROR` | OpenRouter key test failed |
| 500 | `INTERNAL_ERROR` | Unexpected (no stack trace in production) |

### 1.3 Pagination, identifiers, formats
- Lists accept `?page=1&limit=20` (max 100) and return `meta: { page, limit, total, totalPages }`.
- Skills and careers are addressed by **slug** in URLs.
- Dates are ISO 8601 UTC strings. Scores: `fitScore` integer 0–100; `priority`/`score` numbers rounded to 2 decimals.

### 1.4 Shared object shapes
```jsonc
// SkillRef
{ "slug": "python", "name": "Python", "category": "programming" }
// CareerRef
{ "id": "…", "slug": "machine-learning-engineer", "name": "Machine Learning Engineer" }
// User
{ "id": "…", "name": "Prabha", "email": "prabha@demo.skillgraph.dev", "role": "student",
  "college": "Chaitanya", "degree": "B.Tech", "branch": "CSE", "semester": 5,
  "targetCareer": { "id": "…", "slug": "machine-learning-engineer", "name": "Machine Learning Engineer" },
  "onboardingCompleted": true, "createdAt": "2026-10-07T08:00:00.000Z" }
```
Levels: `0 Not Started · 1 Beginner · 2 Basic · 3 Intermediate · 4 Advanced · 5 Expert`.

### 1.5 Access and rate limits
| Group | Access | Limit |
|---|---|---|
| `/auth/register`, `/auth/login` | public | 10 requests / 15 min / IP |
| `/ai/*` | student/admin | 20 requests / min / user |
| everything else | per row below | 300 requests / 15 min / IP |

---

## 2. Meta
### `GET /meta` — public
Constants so the frontend never hard-codes them.
```jsonc
{ "levels": [ { "value": 0, "label": "Not Started" }, … { "value": 5, "label": "Expert" } ],
  "categories": [ { "slug": "programming", "name": "Programming" }, … ],
  "relationshipTypes": ["PREREQUISITE", "RELATED_TO"],
  "gapStatuses": ["strong", "developing", "major", "critical"],
  "nodeStates": ["mastered", "partial", "missing", "recommended", "not_relevant"],
  "counts": { "skills": 72, "careers": 5 } }
```

## 3. Auth
| Method & path | Access | Body | Success |
|---|---|---|---|
| `POST /auth/register` | public | `{ name, email, password }` | `201` `{ user }` + sets cookie |
| `POST /auth/login` | public | `{ email, password }` | `200` `{ user }` + sets cookie |
| `POST /auth/logout` | any | — | `200` `{ loggedOut: true }` + clears cookie |
| `GET /auth/me` | student/admin | — | `200` `{ user }` or `401` |

Password rules: ≥ 8 chars, at least one letter and one number. Login failure always returns the same generic message (`Invalid email or password`).

## 4. Users (own data only — there is no `:id` in student routes)
| Method & path | Access | Body | `data` |
|---|---|---|---|
| `GET /users/me` | student/admin | — | `{ user }` |
| `PATCH /users/me` | student/admin | any of `{ name, college, degree, branch, semester, targetCareerSlug, onboardingCompleted }` | `{ user }` (changing `targetCareerSlug` writes an alignment snapshot with trigger `target_change`) |
| `GET /users/me/skills` | student | — | `{ items: [ { skill: SkillRef, proficiency, levelLabel, source } ] }` |
| `PUT /users/me/skills` | student | `{ skills: [ { skillSlug, proficiency } ] }` — **replaces** the whole profile (used by onboarding); `proficiency` 0–5, 0 = remove | `{ items, fit: { score, band } }` |
| `PATCH /users/me/skills/:skillSlug` | student | `{ proficiency }` (0–5) | `{ skill, previousLevel, proficiency, fit: { score, previousScore, band } }` |
| `GET /users/me/progress` | student | — | `{ history: [ { skill: SkillRef, previousLevel, currentLevel, at } ], alignment: [ { at, fitScore, careerSlug } ] }` |

`PUT/PATCH` on skills return `422 RULE_VIOLATION` if no target career is set (the fit cannot be computed).

## 5. Catalog (read-only for students)
| Method & path | Access | Notes |
|---|---|---|
| `GET /skills?category=&q=&page=&limit=` | student/admin | list |
| `GET /skills/:slug` | student/admin | detail with relationships and the caller's status |
| `GET /careers` | student/admin | list (5) |
| `GET /careers/:slug` | student/admin | detail with required skills |

### `GET /skills/:slug`
```jsonc
{ "skill": { "id": "…", "slug": "statistics", "name": "Statistics", "description": "…", "category": "data-analytics", "difficulty": 3 },
  "prerequisites": [ { "slug": "python", "name": "Python", "category": "programming" } ],
  "unlocks":       [ { "slug": "machine-learning-fundamentals", "name": "Machine Learning Fundamentals", "category": "machine-learning" } ],
  "related":       [ { "slug": "pandas", "name": "Pandas", "category": "data-analytics" } ],
  "requiredFor":   [ { "career": { "slug": "data-scientist", "name": "Data Scientist" }, "importance": 0.8, "importanceLabel": "High", "requiredLevel": 4 } ],
  "you": { "proficiency": 1, "levelLabel": "Beginner", "status": "critical", "targetRequiredLevel": 4 } }   // `status`/`targetRequiredLevel` are null if the skill is not in the target career
```

### `GET /careers/:slug`
```jsonc
{ "career": { "id": "…", "slug": "machine-learning-engineer", "name": "Machine Learning Engineer", "description": "…", "category": "ai", "icon": "brain" },
  "skills": [ { "skill": { "slug": "machine-learning-fundamentals", "name": "Machine Learning Fundamentals", "category": "machine-learning", "difficulty": 4 },
                "importance": 1.0, "importanceLabel": "Very High", "requiredLevel": 5 } ] }
```

## 6. Analysis (rule engine) — query `?career=<slug>` is optional; default = the user's target career
### `GET /analysis/skill-gap`
```jsonc
{ "career": { "slug": "machine-learning-engineer", "name": "Machine Learning Engineer" },
  "summary": { "strong": 12, "developing": 7, "missing": 9, "total": 28 },     // strong + developing + missing = total
  "items": [ { "skill": { "slug": "statistics", "name": "Statistics", "category": "data-analytics" },
               "proficiency": 1, "requiredLevel": 4, "gap": 3, "importance": 0.8,
               "status": "critical", "isMissing": false, "isReady": true, "priority": 0.84 } ] }   // sorted by priority desc
```
### `GET /analysis/career-fit`
```jsonc
{ "career": { "slug": "machine-learning-engineer", "name": "Machine Learning Engineer" },
  "label": "Estimated career alignment", "fitScore": 61, "band": "developing",
  "breakdown": { "coverage": 0.58, "prerequisiteReadiness": 0.81 },
  "weights": { "coverage": 0.85, "prerequisiteReadiness": 0.15 } }
```
### `GET /analysis/learning-path`
```jsonc
{ "career": { "slug": "machine-learning-engineer", "name": "Machine Learning Engineer" },
  "totalSteps": 9, "totalEffortPoints": 61,
  "steps": [ { "order": 1,
               "skill": { "slug": "statistics", "name": "Statistics", "category": "data-analytics", "difficulty": 3 },
               "fromLevel": 1, "toLevel": 4, "priority": 0.84, "effortPoints": 9, "isReadyNow": true,
               "prerequisites": [ { "slug": "python", "name": "Python", "proficiency": 4 } ],
               "unlocks": [ { "slug": "machine-learning-fundamentals", "name": "Machine Learning Fundamentals" } ],
               "reasons": ["HIGH_IMPORTANCE", "LARGE_GAP", "UNLOCKS_MANY"] } ] }
```
Reason codes: `HIGH_IMPORTANCE`, `LARGE_GAP`, `UNLOCKS_MANY`, `QUICK_WIN`; when none of these apply the list is `["REQUIRED_BY_CAREER"]`. Every step and every next-skill item has at least one code.

### `GET /analysis/graph?career=&includeRelated=false`
Edges point from **prerequisite → dependent**. Layout is the client's job.
```jsonc
{ "career": { "slug": "machine-learning-engineer", "name": "Machine Learning Engineer" },
  "nodes": [ { "id": "python", "slug": "python", "name": "Python", "category": "programming", "difficulty": 2,
               "state": "mastered", "proficiency": 4, "requiredLevel": 4, "importance": 0.9, "isReadyNow": false } ],
  "edges": [ { "id": "python>statistics", "source": "python", "target": "statistics", "type": "PREREQUISITE" } ],
  "stats": { "nodes": 28, "edges": 41 } }
```
`state ∈ mastered | partial | missing | recommended | not_relevant` (rules in `ARCHITECTURE.md` §5.7).

### `GET /analysis/dashboard`
One call for the dashboard header, summary, next skills and progress.
```jsonc
{ "user": { "name": "Prabha" },
  "career": { "slug": "machine-learning-engineer", "name": "Machine Learning Engineer" },
  "fit": { "score": 61, "previousScore": 54, "delta": 7, "band": "developing" },    // previousScore null if no earlier snapshot
  "summary": { "strong": 12, "developing": 7, "missing": 9, "total": 28 },
  "nextSkills": [ { "skill": { "slug": "statistics", "name": "Statistics", "category": "data-analytics" }, "score": 0.84, "reasons": ["HIGH_IMPORTANCE"] } ],
  "strategy": "ml",                                // "ml" | "rule"
  "topGaps": [ { "skill": { "slug": "statistics", "name": "Statistics" }, "gap": 3, "status": "critical" } ],
  "updatedAt": "2026-10-08T10:30:00.000Z" }
```
### `GET /analysis/insights` (student analytics page)
```jsonc
{ "categoryDistribution": [ { "category": "programming", "name": "Programming", "skills": 4, "avgLevel": 3.8 } ],
  "alignmentHistory": [ { "at": "2026-10-07T09:00:00.000Z", "fitScore": 48 } ],
  "topMissing": [ { "skill": { "slug": "docker", "name": "Docker" }, "gap": 2, "importance": 0.5 } ] }
```
### `POST /analysis/what-if` — body `{ "careerSlug": "data-scientist" }` (does **not** change the target)
```jsonc
{ "current":     { "career": { "slug": "machine-learning-engineer", "name": "…" }, "fitScore": 61, "pathSteps": 9, "topPriority": [ { "slug": "statistics", "name": "Statistics" } ] },
  "alternative": { "career": { "slug": "data-scientist", "name": "…" },            "fitScore": 74, "pathSteps": 6, "topPriority": [ { "slug": "statistics", "name": "Statistics" } ] },
  "delta": 13, "newlyRequired": [ { "slug": "data-visualization", "name": "Data Visualization", "requiredLevel": 4 } ], "noLongerRequired": [ ] }
```
### `GET /analysis/career-compare?a=<slug>&b=<slug>`
```jsonc
{ "a": { "career": { "slug": "data-scientist", "name": "…" }, "fitScore": 74, "pathSteps": 6, "effortPoints": 40, "missingCount": 5 },
  "b": { "career": { "slug": "machine-learning-engineer", "name": "…" }, "fitScore": 61, "pathSteps": 9, "effortPoints": 61, "missingCount": 9 },
  "common":   [ { "skill": { "slug": "python", "name": "Python" }, "a": { "importance": 0.9, "requiredLevel": 4 }, "b": { "importance": 0.9, "requiredLevel": 4 } } ],
  "uniqueToA": [ { "skill": { "slug": "data-visualization", "name": "Data Visualization" }, "importance": 0.7, "requiredLevel": 4 } ],
  "uniqueToB": [ { "skill": { "slug": "docker", "name": "Docker" }, "importance": 0.5, "requiredLevel": 3 } ] }
```

## 7. Recommendations
### `GET /recommendations/next-skills?career=&limit=3&strategy=auto`
`strategy`: `auto` (ML if available, else rule) · `rule` · `ml`.
```jsonc
{ "strategy": "ml", "modelVersion": "v1", "fallbackReason": null,       // "ML_UNAVAILABLE" when strategy fell back to rule
  "items": [ { "skill": { "slug": "statistics", "name": "Statistics", "category": "data-analytics" },
               "score": 0.84, "isReadyNow": true, "reasons": ["HIGH_IMPORTANCE", "UNLOCKS_MANY"] } ] }
```

## 8. Analytics for admin (aggregates only)
All `admin` access. Never return emails or per-student rows.
| Path | `data` |
|---|---|
| `GET /admin/analytics/overview` | `{ totalStudents, onboardedStudents, avgFitScore, totalSkills, totalCareers }` |
| `GET /admin/analytics/skill-gaps?limit=10` | `{ items: [ { skill: SkillRef, percentWithGap: 68, avgGap: 1.9, studentsConsidered: 24 } ] }` — % of students whose **target career requires the skill** and who have gap > 0 |
| `GET /admin/analytics/career-distribution` | `{ items: [ { career: CareerRef, students: 12, percent: 40 } ] }` |
| `GET /admin/analytics/skill-popularity?limit=10` | `{ items: [ { skill: SkillRef, students: 18, avgProficiency: 3.2 } ] }` |
| `GET /admin/analytics/semester-distribution` | `{ items: [ { semester: 5, students: 9, avgFitScore: 58, avgSkillsPerStudent: 11.2 } ] }` |
| `GET /admin/ml/info` | proxied ML `model/info` (see §12) or `{ available: false }` |

## 9. Admin knowledge-base management
All `admin` access. Slugs are immutable after creation.
| Method & path | Body | Notes |
|---|---|---|
| `POST /admin/skills` | `{ name, slug, description, category, difficulty }` | `409` on duplicate slug |
| `PATCH /admin/skills/:slug` | any of `{ name, description, category, difficulty }` | |
| `DELETE /admin/skills/:slug` | — | `422` if the skill is used by a career or relationship (remove those first) |
| `GET /admin/relationships?skill=<slug>` | — | list edges touching a skill |
| `POST /admin/relationships` | `{ source, target, type, strength? }` | `422` if a PREREQUISITE would create a cycle, `409` if duplicate |
| `DELETE /admin/relationships/:id` | — | Always allowed (the engine tolerates missing edges) |
| `POST /admin/careers` | `{ name, slug, description, category, icon }` | |
| `PATCH /admin/careers/:slug` | any of `{ name, description, category, icon, isActive }` | |
| `PUT /admin/careers/:slug/skills` | `{ skills: [ { skillSlug, importance, requiredLevel } ] }` — replaces the list | `422` with `details` listing missing prerequisite skills (closure, V5) or levels (V6) |

## 10. Assistant (LLM)
Rate limit: 20 requests/min/user. Message max **500 characters**.

### `POST /ai/chat`
Request `{ "message": "I only have 2 months. What should I focus on?" }`
```jsonc
{ "reply": "With about 8 weeks, focus on …",
  "intent": "time_boxed_plan",
  "degraded": false,                       // true = deterministic template answer was used
  "keySource": "user",                     // "user" | "server" | "none"
  "model": "provider/model-id:free",
  "notice": null,                          // e.g. "Add your own OpenRouter key in Settings for unlimited chat"
  "grounding": { "skills": ["statistics", "machine-learning-fundamentals"], "careers": ["machine-learning-engineer"] } }
```
### `POST /ai/explain` — `{ "skillSlug": "statistics" }` → same shape as chat (`intent: "explain_recommendation"`). Used by the "Why this?" button.
### `GET /ai/history?limit=30` → `{ items: [ { id, role, content, intent, createdAt } ] }`
### `DELETE /ai/history` → `{ cleared: true }`

## 11. LLM settings (per user)
| Method & path | Body | `data` |
|---|---|---|
| `GET /settings/llm` | — | `{ provider: "openrouter", model, hasKey: true, keyLast4: "a1b2", serverKeyAvailable: true, serverKeyRemainingToday: 22 }` |
| `PUT /settings/llm` | `{ apiKey?, model? }` — `apiKey` only needs sending when changing it | same as GET |
| `DELETE /settings/llm/key` | — | same as GET (key removed) |
| `POST /settings/llm/test` | — | `{ ok: true, model }` or `502 UPSTREAM_ERROR` — makes a tiny test call with the effective key/model |
| `GET /settings/llm/suggested-models` | — | `{ items: [ { id, note } ] }` — a short curated list from config; free-text IDs are always allowed |

The raw key is **never** returned after saving. Validation: `apiKey` 20–200 chars, no whitespace; `model` ≤ 120 chars, `^[A-Za-z0-9._:/-]+$`.

## 12. ML service (internal — called only by the backend)
Header: `X-Internal-Key: <ML_INTERNAL_KEY>` on every call except `/health`.

| Method & path | Request | Response |
|---|---|---|
| `GET /health` | — | `{ status: "ok", modelLoaded: true }` |
| `GET /model/info` | — | `{ modelVersion: "v1", trainedAt, algorithm, trainingData: "synthetic", trainingProfiles: 5000, metrics: { ml: { precisionAt3, recallAt3, hitRateAt3, mrr }, baseline: { precisionAt3, recallAt3, hitRateAt3, mrr } } }` |
| `POST /recommend` | `{ careerSlug, proficiencies: { "python": 4, "statistics": 1 }, semester?: 5, topK?: 10 }` | `{ modelVersion, items: [ { skillSlug, score } ] }` sorted by score desc; only skills with gap > 0 for that career |

## 13. Endpoint ownership (who builds what)
| Group | Owner |
|---|---|
| `/meta`, `/auth`, `/users`, `/skills`, `/careers`, `/admin/skills|relationships|careers` | Member 2 |
| `/analysis/skill-gap|career-fit|learning-path|graph|dashboard|what-if|career-compare` and the engine | Member 3 |
| `/analysis/insights`, `/admin/analytics/*` | Member 4 |
| `/recommendations`, `/ai/*`, `/settings/llm*`, `/admin/ml/info`, ML client | Member 5 |
| ML service (`/health`, `/model/info`, `/recommend`) | Member 3 |

**Cross-member dependency:** `GET /analysis/dashboard` (Member 3) needs `nextSkills` + `strategy`. Member 5 exposes `recommendationService.getNextSkills(userId, careerSlug, { limit, strategy })` in `services/recommendation.service.js`. Until it exists, Member 3 calls the engine's rule-based `getNextSkills` directly and returns `strategy: "rule"`; switching to the service is a one-line change.
