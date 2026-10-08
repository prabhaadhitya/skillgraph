# SkillGraph

AI-Powered Student Skill Graph and Career Pathway Platform — models skills as a graph, compares target careers, computes prerequisite-aware learning paths, and explains them via a grounded LLM assistant.

Start here: **[AGENTS.md](AGENTS.md)** (for coding agents), **[docs/PRD.md](docs/PRD.md)** (product requirements), and **[docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)** (viva acceptance walkthrough).

| Documentation | Purpose |
|---|---|
| [PRD](docs/PRD.md) | Scope, requirements, timeline, decisions |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | System design, pure engine formulas, ML & LLM pipelines |
| [DATABASE](docs/DATABASE.md) | Collections, indexes, seed specs, validator rules |
| [API](docs/API.md) | Endpoint contracts and standard response envelopes |
| [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) | Color tokens, graph styling, components |
| [SECURITY](docs/SECURITY.md) | Auth, encryption, rate limits, pre-viva checklist |
| [TESTING](docs/TESTING.md) | Testing strategy, integration tests, golden fixtures |
| [DEMO SCRIPT](docs/DEMO_SCRIPT.md) | 16-step live demonstration and rehearsal walkthrough |

---

## Getting Started

### Prerequisites
- **Node.js**: latest LTS (v20+) & `npm`
- **Python**: 3.11+ (tested on Python 3.11, 3.12, 3.13)
- **MongoDB Atlas**: URI string with read/write access

### Quickstart (5 Minutes)

```bash
# 1. Environment configuration
cp backend/.env.example backend/.env
# Edit backend/.env: provide MONGODB_URI and JWT_SECRET (32+ chars)

# 2. Install dependencies (root, backend, frontend, ml-service)
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd ml-service && python -m venv .venv
# Activate venv: source .venv/bin/activate (Linux/Mac) or .\.venv\Scripts\activate (Windows)
pip install -r requirements.txt && cd ..

# 3. Seed database (knowledge base + demo personas)
npm run seed

# 4. Launch entire platform (1 command)
npm run dev
```

Platform services start concurrently:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/health (reports `{ db: "up", ml: "up" }`)
- **ML Service**: http://localhost:8000

### Demo Logins
> Password for all accounts is `DEMO_PASSWORD` from `backend/.env` (default: `DemoPassword123!`).

- `prabha@demo.skillgraph.dev` — ML Engineer student (target career alignment: 26%)
- `asha@demo.skillgraph.dev` — Data Scientist student
- `ravi@demo.skillgraph.dev` — Backend Developer student
- `newbie@demo.skillgraph.dev` — Fresh student (onboarding wizard)
- `admin@skillgraph.dev` — Administrator (`ADMIN_PASSWORD` in `backend/.env`)

### Running Tests
```bash
npm test
```
Runs backend Vitest (293 tests), frontend Vitest (99 tests), and ML pytest (14 tests) sequentially.

### Troubleshooting
1. **MongoDB connection error**: Check your IP address allow-list in the MongoDB Atlas dashboard and verify `MONGODB_URI` in `backend/.env`.
2. **ML service status shows `down` on `/health`**: Verify Python 3.11+ virtual environment dependencies are installed (`pip install -r requirements.txt`) and that port 8000 is available.
3. **Port already in use (5000, 5173, 8000)**: Terminate background node/uvicorn processes or check running ports before running `npm run dev`.
