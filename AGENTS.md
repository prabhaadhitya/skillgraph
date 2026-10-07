# AGENTS.md — SkillGraph

Instructions for AI coding agents (Antigravity or any other) working in this repository. **Read this file first, then the docs listed for your task.**

## 1. What this project is
SkillGraph is a web platform that models a student's skills as a **graph**, compares them with a target career, finds gaps, orders a **prerequisite-aware learning path**, and explains it through a **grounded** LLM assistant.

**Golden rule:** the skill graph + rule engine are the source of truth; ML personalises; analytics measures; the LLM only explains. Never make the LLM decide facts, scores or recommendations. Never call it a "probability of success" — it is an **"estimated career alignment"**.

## 2. Stack (locked — do not change without approval)
| Part | Tech |
|---|---|
| Frontend | React + Vite, **JavaScript**, Tailwind v4, React Router, TanStack Query, `@xyflow/react`, `@dagrejs/dagre`, Recharts, `lucide-react` |
| Backend | Node (latest LTS+) + Express, **JavaScript (ES modules)**, MVC, Mongoose, zod, bcryptjs, jsonwebtoken, helmet, cors, express-rate-limit |
| Database | MongoDB Atlas |
| ML | Python + FastAPI + scikit-learn + pandas + numpy |
| LLM | OpenRouter (free tier, user-supplied key supported), called only from the backend |
| Tests | Vitest (+ Supertest, React Testing Library), pytest |

Ports: frontend `5173`, backend `5000`, ML `8000`.

## 3. Read these docs (in `docs/`)
| Task type | Read |
|---|---|
| Any task | `PRD.md` (scope), `CODE_STYLE.md` |
| Backend / API | `API.md`, `DATABASE.md`, `ARCHITECTURE.md`, `SECURITY.md` |
| Engine / ML | `ARCHITECTURE.md` §5–6, `DATABASE.md` §5–6 |
| LLM | `ARCHITECTURE.md` §7, `SECURITY.md` §5–6, `API.md` §10–11 |
| Frontend | `DESIGN_SYSTEM.md`, `UX_FLOWS.md`, `API.md` |
| Tests | `TESTING.md` |

If the docs are ambiguous or conflict, **stop and ask**; do not guess. If you must change a contract, update the doc in the same change and say so.

## 4. Ownership map (stay inside your folders)
| Member | Role | Owns |
|---|---|---|
| **1** | Frontend Core | `frontend/src/{styles,routes,context,services/api.js,components/ui,components/layout}`, pages `Landing, Login, Register, Onboarding, Dashboard, Profile, Settings`, `hooks` for those pages |
| **2** | Backend Core | `backend/src/{app.js,server.js,config,middleware,utils,models,validators}`, auth/users/skills/careers/admin-CRUD controllers+routes+services, root tooling, `frontend/src/pages/admin/{Skills,Relationships,Careers}.jsx` |
| **3** | KB, Engine & ML | `shared/seed`, `shared/fixtures`, `backend/seed`, `backend/src/services/engine`, analysis controllers/routes (`skill-gap, career-fit, learning-path, graph, dashboard, what-if, career-compare`), `ml-service/**` |
| **4** | Visualization & Analytics | `frontend/src/components/{graph,charts}`, pages `SkillGraph, LearningPath, CareerExplorer, Analytics, admin/Overview`, `backend/src/services/analytics`, `/analysis/insights`, `/admin/analytics/*` |
| **5** | LLM & Integration | `backend/src/services/{llm,ml}`, ai/settings/recommendations controllers+routes, `backend/src/utils/crypto.js`, `frontend/src/components/{chat,settings}`, page `Assistant` |

Touching another member's folder: open a PR and request their review. Shared files (`package.json` root, `docs/*`, `.env.example`, `constants.js`, `tokens.css`, `shared/seed/*`) change only through PRs announced to the team.

## 5. Non-negotiable rules
1. **Respect the contract.** Endpoint paths, request/response shapes, field names, enums, error codes come from `API.md` and `DATABASE.md`. Do not invent endpoints, fields, statuses or colours.
2. **Response envelope** on every route: `{ success, data, meta? }` / `{ success: false, error: { code, message, details? } }`.
3. **Ownership comes from the token.** Student routes use `req.user.id`; never accept a user id or role from the client.
4. **Validate everything** with zod (`.strict()`); never pass request objects into Mongo filters.
5. **Secrets:** nothing sensitive in code, logs, responses, or the frontend. LLM keys are encrypted at rest and never returned.
6. **MVC:** controllers thin, logic in services, **engine is pure** (no DB/HTTP/env/time).
7. **Fallbacks are features:** ML down → rule-based; LLM down → template answer. Pages must never crash because of them.
8. **Design tokens only** in the frontend (`bg-brand`, `border-ink`, `shadow-md`…). No hex colours, no new fonts. State = colour + icon + label.
9. **Every data view** has loading, empty and error states.
10. **No scope creep.** Build only the task. P2 items (assessments, resources, deployment) are off-limits until P0/P1 are done.
11. **Small diffs.** One focused change; no drive-by refactors; no unrelated formatting churn.
12. **New dependencies** only when necessary; state which and why.
13. **No mocking of production behaviour in committed code** except `frontend/src/mocks/` fixtures that mirror `API.md` and are clearly marked.
14. **Never run destructive commands** (dropping databases, `git push --force`, deleting folders outside your task) unless explicitly told. `seed --reset` is dev-only.

## 6. Commands
```bash
# root
npm run dev                        # frontend + backend
# backend
cd backend && npm run dev          # nodemon / node --watch
npm test · npm run seed · npm run seed:demo · npm run seed:validate
# frontend
cd frontend && npm run dev · npm test · npm run lint
# ml-service
cd ml-service && python -m venv .venv && pip install -r requirements.txt
python -m data.generate_synthetic && python -m training.train
uvicorn app.main:app --reload --port 8000 && pytest
```

## 7. Environment
Copy `.env.example` to `.env` in each package. Variable list in `docs/ARCHITECTURE.md` §9. Never commit `.env`. If a variable is missing, fail fast with a clear message.

## 8. Working agreement for each prompt
1. Restate the task in one or two lines and list the docs you read.
2. Plan briefly, then implement **only** that task inside your owned folders.
3. Run lint and the relevant tests; fix what you broke.
4. Commit on branch `m<N>/<area>-<description>` using Conventional Commits.
5. End with a short report:
   - **Done:** what now works and how to verify it (commands/URLs)
   - **Changed contracts:** none / list
   - **Not done / assumptions / questions**
   - **Files touched**

## 9. Definition of done (task level)
Works against the real endpoint or the documented mock shape · matches docs · lint clean · tests for logic · states handled · no secrets · docs updated if contracts changed · PR ready for review.

## 10. Common pitfalls (avoid)
- Returning `_id`/`__v`; use `id` (toJSON transform).
- Putting business logic in controllers or JSX.
- Hard-coding the LLM model name or colours.
- Using `localStorage` for tokens or keys.
- Recomputing scores in the frontend — always use the API values.
- Treating level `0` as a stored row — level 0 means *no document* in `userSkills`.
- Editing skill/career **slugs** (immutable) or reseeding with new ObjectIds (seed upserts by slug).
- Showing probabilities or guarantees in UI copy.
