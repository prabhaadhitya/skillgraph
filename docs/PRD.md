# SkillGraph — Product Requirements Document (PRD)

| | |
|---|---|
| **Product** | SkillGraph — AI-Powered Student Skill Graph and Career Pathway Platform |
| **Version** | 1.0 (locked for build) |
| **Viva / final demo** | Tuesday, 13 October 2026 |
| **Team** | 5 members (Member 1 – Member 5) |
| **Evaluated on** | Working demo, documentation, viva |
| **Companion docs** | `DESIGN_SYSTEM.md`, `UX_FLOWS.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `SECURITY.md`, `CODE_STYLE.md`, `TESTING.md`, `AGENTS.md` |

---

## 1. Summary

SkillGraph is a web platform that models student skills and their relationships as an **interactive graph**. It compares a student's current skill levels with a target career, finds gaps, orders what to learn next using prerequisites, and explains the reasoning in plain language.

> **Golden rule.** The Skill Graph is the source of structured knowledge. The rule engine and ML layer personalise and analyse. The analytics layer gives measurable insight. The LLM explains and converses — it is never the source of truth. The graph plus the personalised pathway *is* the product.

**Innovation statement.** A personalised skill-intelligence platform that models skills as an interconnected graph rather than an independent checklist.

## 2. Problem

Students learn many technologies but do not know which skills a career needs, which they already have, which are missing, what to learn first, whether one skill is a prerequisite of another, or how far along they are. Existing platforms offer courses or generic career quizzes, not a connected model of:

`Student → Skills → Prerequisites → Career → Skill gaps → Learning path`

## 3. Goals and non-goals

### Goals
1. A student can see their skills as a graph tied to a target career and understand what is missing.
2. A student receives an **ordered, prerequisite-aware** learning path and an **interpretable** career alignment score.
3. A student can ask questions and get answers **grounded in their actual data**.
4. An admin can maintain the knowledge base and see aggregate analytics.
5. The project demonstrates a real ML component with an honest evaluation against a rule-based baseline.

### Non-goals (do not build, do not claim)
Mobile app, real-time chat, fine-tuning an LLM, job scraping, social features, mentor marketplace, payments, course marketplace, hundreds of careers, thousands of skills, microservices beyond the one ML service.

## 4. Users

| Role | Description | Key needs |
|---|---|---|
| **Student** (primary) | Engineering student, semester 1–8, unsure what to learn next | Clear gaps, clear next steps, trust in the reasoning |
| **Admin** | Project owner / faculty who curates the knowledge base | Edit skills, relationships, careers; see aggregate analytics |

**Persona — Aarav, 3rd-year CSE.** Knows Python and some web development. Wants to become an ML Engineer but does not know whether statistics or deep learning should come first. Wants one page that says "here is what to learn next and why".

## 5. Scope and priorities

Priority key: **P0** must work in the viva demo · **P1** should ship, cut only if behind schedule · **P2** stretch, schema reserved, do not start before P0/P1 are done.

| Area | Item | Priority |
|---|---|---|
| Auth | Register, login, logout, session, roles (student/admin) | P0 |
| Onboarding | Profile, target career, select skills, rate proficiency | P0 |
| Knowledge base | 60–80 skills, 5 careers, relationships, career requirements (seeded) | P0 |
| Skill graph | Career subgraph, node states, zoom/pan, click for detail, edit proficiency | P0 |
| Skill gap | Gap table per career with statuses and priority | P0 |
| Career fit | Interpretable "estimated career alignment" score | P0 |
| Learning path | Prerequisite-aware ordered path | P0 |
| Dashboard | Alignment, summary counts, next skills, progress, graph, assistant | P0 |
| ML | Next-skill recommendation (FastAPI), synthetic data, evaluation vs rule baseline | P0 (with automatic fallback to rule-based) |
| LLM assistant | Grounded chat with intent → data → explanation pipeline | P0 |
| LLM settings | Bring-your-own OpenRouter key, configurable model, server fallback key | P0 |
| Analytics | Student insights + admin aggregate analytics | P0 (basic) |
| Admin | Manage skills, relationships, careers, career requirements | P0 |
| Career Explorer | Compare two careers, common/unique skills, pathway length | P1 |
| What-If | Simulate switching target career | P1 |
| Alignment history | "Current vs previous" progress | P1 |
| Landing page | Full marketing page in the design system | P1 |
| Skill assessments | Quiz-based proficiency | P2 (schema reserved) |
| Learning resources | Links per skill | P2 (schema reserved) |
| Docker compose / deployment | One-command run / hosting | P2 |

## 6. Functional requirements

### 6.1 Authentication and profile
| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-A1 | Register with name, email, password | Duplicate email rejected (409). Password rules enforced. Role is always `student`. |
| FR-A2 | Login / logout | Valid credentials set an httpOnly cookie; logout clears it. |
| FR-A3 | Session restore | `GET /api/auth/me` returns the user or 401; frontend redirects to login. |
| FR-A4 | Role-based access | Student cannot reach `/admin` pages or `/api/admin/*` (403). |
| FR-A5 | Profile edit | Student can edit college, degree, branch, semester, target career. |

### 6.2 Onboarding
| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-O1 | Wizard: about you → target career → select skills → rate proficiency → review | Cannot finish without a target career. Skills rated 1–5 are saved; 0/unselected are not stored. |
| FR-O2 | Skills relevant to the chosen career are suggested first | Career skills are shown in a "Recommended for <career>" group. |
| FR-O3 | Completing onboarding marks `onboardingCompleted` and lands on the dashboard | A student with `onboardingCompleted=false` is always redirected to onboarding. |

### 6.3 Skill graph
| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-G1 | Show only the subgraph for the target career | Nodes = career skills (prerequisite closure guaranteed by seed rules). |
| FR-G2 | Node states: mastered, partial, missing, recommended, not relevant | State colour **and** icon **and** label (never colour alone). |
| FR-G3 | Zoom, pan, fit-to-view, click node | Click opens the skill detail panel. |
| FR-G4 | Skill detail panel | Shows category, user proficiency, status, required-for careers, prerequisites, unlocks, importance. |
| FR-G5 | Edit proficiency from the panel | Saving updates graph colours, fit score and path without a page reload. |

### 6.4 Analysis
| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-S1 | Skill gap per career | Items sorted by priority; statuses `strong / developing / major / critical`. |
| FR-S2 | Career fit | Integer 0–100, labelled "Estimated career alignment", with a visible explanation of how it is computed. |
| FR-S3 | Learning path | Ordered steps where no step appears before its unmet prerequisites. |
| FR-S4 | Next skills | Top 3 ready-now skills, from ML when available, else rule-based; response states which strategy was used. |
| FR-S5 | What-If | Switching target (without saving) returns old vs new alignment and new priority skills. |
| FR-S6 | Career compare | Two careers: fit for each, common skills, unique skills, pathway length. |

### 6.5 Assistant
| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-L1 | Grounded answers | Every answer is generated from backend-computed facts (see `ARCHITECTURE.md` §7). |
| FR-L2 | Supported intents | Explain a skill, explain a recommendation, time-boxed plan, what-if / compare, relationship question, progress summary. |
| FR-L3 | Bring your own key | Student saves an OpenRouter key and a model ID; key is encrypted, never shown again (last 4 characters only). |
| FR-L4 | Graceful degradation | If the LLM fails or no key/quota exists, the user still gets a deterministic template answer and a clear notice. |
| FR-L5 | Safety | Out-of-scope or injection attempts do not leak data or change behaviour (see `SECURITY.md`). |

### 6.6 Analytics and admin
| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-N1 | Student insights | Skill distribution by category, alignment history, top missing skills. |
| FR-N2 | Admin analytics | Overview counts, top skill gaps (% of students), career distribution, skill popularity, semester distribution. Aggregates only — no individual student data. |
| FR-N3 | Admin CRUD | Create/edit/delete skills, relationships, careers; edit career requirements. Invalid changes (cycles, broken prerequisite closure) are rejected with a clear message. |
| FR-N4 | Model transparency | Admin can see ML model info: algorithm, synthetic-data disclosure, metrics vs baseline. |

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Analysis endpoints respond in < 500 ms for the seeded data; graph renders smoothly with up to ~40 nodes. |
| Reliability | ML or LLM outage never breaks a page — fallbacks required (FR-S4, FR-L4). |
| Security | See `SECURITY.md`. No secrets in the repo; keys never reach the browser. |
| Accessibility | Keyboard-navigable, visible focus, WCAG AA contrast, state not conveyed by colour alone. |
| Responsiveness | Fully usable at laptop width (demo target), good at tablet, best-effort on phone. |
| Honesty | Wording rules in §9 are enforced in UI copy and LLM prompts. |
| Maintainability | MVC backend, thin controllers, pure testable engine (see `CODE_STYLE.md`). |

## 8. Core rules (summary — formulas live in `ARCHITECTURE.md` §5)

- Proficiency levels: `0 Not Started · 1 Beginner · 2 Basic · 3 Intermediate · 4 Advanced · 5 Expert`.
- Careers define, per skill, an **importance** (0–1) and a **required level** (1–5).
- Gap = `max(0, requiredLevel − proficiency)`. Status: `0 strong · 1 developing · 2 major · ≥3 critical`.
- Career alignment = `85% weighted skill coverage + 15% prerequisite readiness`, shown as an integer percent.
- Learning path = repeatedly pick the highest-priority **ready** skill (every prerequisite already at the level this career requires), assume it is completed, repeat.

## 9. Claims and wording rules

| Say | Never say |
|---|---|
| "Estimated career alignment: 61%" | "You have a 61% chance of becoming an ML Engineer" |
| "Recommended based on your profile and the skill graph" | "The AI decided your career" |
| "Trained on **synthetic** data for demonstration" | "Trained on real student data" |
| "Alignment, not a guarantee" | "Guaranteed placement" |

## 10. Success metrics

**Demo success (binary):** all 15 Definition-of-Done items below pass in the rehearsal on 12 Oct.

**Definition of Done — a student can:**
1. Register / log in. 2. Create their profile. 3. Select a target career. 4. Select current skills. 5. Set proficiency levels. 6. View their interactive skill graph. 7. See missing skills. 8. Understand prerequisite relationships. 9. Receive an ordered learning pathway. 10. See career alignment. 11. Ask the assistant about their pathway. 12. Receive explanations grounded in their actual profile. 13. Update their skills. 14. See the graph and recommendations change. 15. View basic analytics.

**ML success:** documented comparison of the ML recommender vs the rule-based baseline on held-out synthetic profiles (Precision@3, Recall@3, Hit Rate@3, MRR), including an honest limitations paragraph.

## 11. Constraints and assumptions

- **Time:** 7 calendar days, Wed 7 Oct → Tue 13 Oct (viva day is not a build day).
- **Stack (locked):** React + Vite + JavaScript, Node + Express (MVC) + JavaScript, MongoDB Atlas, Python FastAPI, one monorepo.
- **LLM:** OpenRouter, free tier only; model name is configuration, never hard-coded.
- **No real student data:** training data is synthetic and disclosed as such.
- **Demo runs locally** against Atlas (three terminals). Hosting is P2.
- **Light theme only** (no dark mode) to save time.

## 12. Team and ownership

| Member | Role | Primary ownership |
|---|---|---|
| **Member 1** | Frontend Core | Design-system components, app shell, routing, auth pages, onboarding, dashboard, profile, settings page, landing page |
| **Member 2** | Backend Core | Express/MVC skeleton, config, middleware, models, auth, users, catalog (skills/careers), admin CRUD APIs, then admin management UI |
| **Member 3** | Knowledge Base, Engine & ML | Seed data + validator, rule-based engine (gap, fit, priority, path, what-if, compare), analysis endpoints, synthetic dataset, ML model + FastAPI service |
| **Member 4** | Visualization & Analytics | Skill graph UI, skill detail panel, learning path UI, career explorer UI, student + admin analytics (UI and endpoints) |
| **Member 5** | LLM & Integration | OpenRouter client, intent/context/explanation pipeline, key encryption + settings API, chat UI, API-key modal, ML client + recommendations endpoint, integration glue |

Exact file ownership is in `AGENTS.md`. Cross-boundary changes go through a PR with the owner as reviewer.

## 13. Timeline

| Day | Date | Focus | Gate |
|---|---|---|---|
| 1 | Wed 7 Oct | Repo + scaffolds, docs committed, Atlas connected, seed data reviewed and approved, design tokens + UI kit start | — |
| 2 | Thu 8 Oct | Auth end-to-end, seed loaded, catalog APIs, engine pure functions + unit tests, landing + login/register | **Gate A:** register/login works; seed in Atlas; engine tests green |
| 3 | Fri 9 Oct | Onboarding + user-skills APIs, analysis endpoints, graph UI v1, dashboard v1, synthetic dataset generated | — |
| 4 | Sat 10 Oct | Learning path UI, ML training + FastAPI, LLM backend pipeline | **Gate B:** full vertical slice, rule-based only (DoD 1–10, 13–14) |
| 5 | Sun 11 Oct | ML integration, chat UI + API-key modal, career explorer + what-if, analytics, admin UI | **Gate C:** ML + LLM + analytics + admin integrated |
| 6 | Mon 12 Oct | **Feature freeze at 12:00.** Bug bash, tests, demo rehearsal, report/docs, seed demo personas | **Gate D:** all 15 DoD items pass |
| 7 | Tue 13 Oct | Viva. No new code. Final smoke test only. | — |

If a gate is missed, cut P1 items first (explorer polish, alignment history, landing details), never P0.

## 14. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Seed data quality (wrong prerequisites) | Wrong graph, wrong paths | Validator script (`DATABASE.md` §6); user reviews seed before it is loaded |
| Free-tier LLM rate limits / model removal | Chat fails during viva | Model is config; 3-step degradation ladder; per-user BYO key; template fallback |
| ML adds little over the baseline | Weak report | Report honestly; the comparison itself is the deliverable. Fallback to rule-based is automatic |
| Merge conflicts across 5 people | Lost time | Directory ownership, branch-per-member, daily merge to `main` |
| Frontend blocked on backend | Idle time | Build against `API.md` response shapes using local fixtures |
| Late integration | Broken demo | Gates A–D; integration day is Day 4, not Day 6 |
| Atlas network issues at viva | No data | Keep a local `mongodump`/seed script; demo personas reseedable in one command |

## 15. Decisions log

| # | Decision |
|---|---|
| D1 | Monorepo: `/frontend`, `/backend`, `/ml-service`, plus `/shared/seed` and `/docs` |
| D2 | JavaScript everywhere except the ML service (Python) |
| D3 | React + Vite (no SSR), Tailwind, React Router, TanStack Query, React Flow (`@xyflow/react`), Recharts |
| D4 | Express MVC: models = Mongoose, views = JSON responses consumed by the React app, controllers thin, logic in services |
| D5 | JWT in an httpOnly cookie (SameSite=Lax); Vite dev proxy keeps dev same-origin |
| D6 | Relationship types: `PREREQUISITE`, `RELATED_TO`. `REQUIRED_FOR` is modelled by `careerSkills` (single source of truth) |
| D7 | Graph shows only the target-career subgraph |
| D8 | Primary ML task: next-skill recommendation vs rule-based baseline, trained on documented synthetic data |
| D9 | LLM via OpenRouter; user-supplied key stored AES-256-GCM encrypted server-side; server fallback key with daily cap |
| D10 | Admin role is in the MVP; the first admin is created by the seed script |
| D11 | Brand: violet on warm paper, neo-brutalist (changeable by editing tokens only) |
| D12 | Scope restored vs earlier 4-person plan: Career Explorer, What-If and alignment history are P1 (team is 5) |

**Deviations from the original spec (intentional):** React + Vite instead of Next.js; JavaScript instead of TypeScript; `REQUIRED_FOR` via `careerSkills`; added collections `alignmentSnapshots` and `chatMessages`; `userProgress` is an append-only change log; assessments, resources and `learningResources` deferred to P2.

## 16. Inputs still needed from the team lead

1. Approval of the seed data (skills, relationships, careers) — delivered separately for review.
2. MongoDB Atlas connection string (database name `skillgraph`) and an OpenRouter server fallback key.
3. Confirmation of the brand palette in `DESIGN_SYSTEM.md` §2.
4. Member names (optional) and who acts as the integrator on `main`.

## 17. Glossary

**Skill** a learnable ability. **Career** a target role defined by weighted skill requirements. **Proficiency** student's level 0–5 in a skill. **Importance** how much a skill matters to a career (0–1). **Required level** level a career expects (1–5). **Gap** required − current. **Ready skill** a skill whose direct prerequisites have all reached the level the career requires. **Subgraph** the skills of one career and the prerequisite edges between them. **Fit / alignment** the interpretable 0–100 score. **Baseline** the rule-based recommender used to evaluate ML.
