# SkillGraph — Live Demo Script & Acceptance Walkthrough

This document outlines the step-by-step viva walkthrough for the SkillGraph platform, adapted from [`docs/TESTING.md`](file:///c:/Users/mypc/Desktop/skillgraph/docs/TESTING.md) section 6.

## Pre-requisites & Setup
Ensure the fresh environment is seeded and all services are running:
```bash
npm run seed
npm run dev
```
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/health (reports `db: up`, `ml: up`)
- **ML Service**: http://localhost:8000

### Demo Credentials
> All student demo accounts share the password defined by `DEMO_PASSWORD` in `backend/.env` (default: `DemoPassword123!`).

| Account | Email | Role / State |
|---|---|---|
| **Prabha** | `prabha@demo.skillgraph.dev` | ML Engineer target, fit 26%, 6 skills rated |
| **Asha** | `asha@demo.skillgraph.dev` | Data Scientist target |
| **Ravi** | `ravi@demo.skillgraph.dev` | Backend Developer target |
| **Newbie** | `newbie@demo.skillgraph.dev` | Fresh student, onboarding incomplete |
| **Admin** | `admin@skillgraph.dev` | Administrator (`ADMIN_PASSWORD`) |

---

## Acceptance Walkthrough (16 Steps)

| Step | Action | Credentials / Input | Pass Criteria (DoD #) |
|:---:|---|---|---|
| **1** | Register a new user | `/register` with new email and password | Cookie `sg_token` set, redirects to onboarding wizard (1) |
| **2** | Complete onboarding | Select **Machine Learning Engineer**, rate 6 skills | Profile saved, redirects to dashboard with personalized fit (2, 3, 4, 5) |
| **3** | Dashboard overview | Log in as `prabha@demo.skillgraph.dev` | Alignment % (26%), summary counts (6/5/24/35), next skills, ML strategy badge (10) |
| **4** | Open **Skill Graph** | Navigate to `/app/graph` | Only ML Engineer subgraph displayed; 5 state colors, icons, and legend rendered (6) |
| **5** | Inspect Node Details | Click on `Statistics` node | Drawer shows category, proficiency, prerequisites, unlocks, and importance (7, 8) |
| **6** | Update Skill Level | Change Statistics from Level 1 → 3 | Node recolors immediately, alignment score increases, next skills refresh (13, 14) |
| **7** | Open **Learning Path** | Navigate to `/app/path` | Ordered steps; no step placed before its prerequisites (9) |
| **8** | Ask Assistant: Prerequisite explanation | Open Assistant: *"Why should I learn SQL?"* | Grounded reply explains student's target career and real prerequisite relations (11, 12) |
| **9** | Ask Assistant: Time-boxed plan | Assistant prompt: *"I only have 2 months, what should I focus on?"* | Time-boxed plan constrained to ~8 weeks of effort points (12) |
| **10** | Career Exploration & What-If | Navigate to `/app/careers`, compare Data Scientist vs ML Engineer, run What-If | Three-column comparison; shows current vs projected alignment without mutating target |
| **11** | Settings: BYOK Key Modal | Open `/app/settings`, add test OpenRouter key, click Test Key, remove key | Graceful error/success handling, raw key never displayed or leaked in JSON |
| **12** | ML Fallback Test | Stop the ML service (`Ctrl+C` on port 8000), reload dashboard | Strategy badge switches to `RULES`; dashboard continues functioning seamlessly |
| **13** | LLM Fallback Test | Ask question with invalid LLM key configured | Instant "Quick answer" fallback template answer provided without crashing |
| **14** | Analytics Page | Navigate to `/app/analytics` | Category distribution, progress line chart, and top missing skills charts render (15) |
| **15** | Admin Knowledge Base & Rules | Log in as `admin@skillgraph.dev`, add skill, add prerequisite, attempt circular dependency | Cycle rule enforced with readable error; admin analytics and model benchmarks visible |
| **16** | Role Guard Security | Log in as `prabha@demo.skillgraph.dev`, attempt to access `/admin` | Access denied with 403 Forbidden page and envelope |

---

## Viva Verification Checkpoints
1. `GET /health` returns `{ "success": true, "data": { "status": "ok", "db": "up", "ml": "up" } }`.
2. Graph pans and zooms smoothly at 60 fps.
3. No secrets exist in browser LocalStorage or git logs.
