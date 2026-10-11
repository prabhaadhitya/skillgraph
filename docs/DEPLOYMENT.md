# SkillGraph — Production Deployment Guide (Render + Vercel)

This guide provides step-by-step instructions to deploy the complete SkillGraph platform:
- **Frontend (React 19 + Vite):** Deployed on **Vercel**
- **Backend API (Node.js / Express):** Deployed as a Web Service on **Render**
- **ML Microservice (FastAPI / Python):** Deployed as a Web Service on **Render**
- **Database:** **MongoDB Atlas**

---

## 1. Architecture in Production

```
                                      +---------------------------------------------+
                                      |            Frontend (Vercel)                |
                                      |       https://<your-app>.vercel.app         |
                                      +---------------------------------------------+
                                                             |
                                                             | HTTPS (Cookies / REST)
                                                             v
+------------------------------------+        +---------------------------------------------+
|        MongoDB Atlas               | <===== |         Backend API (Render)                |
|  (Users, Skills, Careers, Chat)    |        |    https://<backend-service>.onrender.com   |
+------------------------------------+        +---------------------------------------------+
                                                             |
                                                             | Internal HTTP (X-Internal-Key)
                                                             v
                                              +---------------------------------------------+
                                              |          ML Service (Render)                |
                                              |      https://<ml-service>.onrender.com      |
                                              +---------------------------------------------+
```

---

## 2. Pre-Deployment Checklist

1. **GitHub Repository:** Ensure your repository is pushed to GitHub with all current files.
2. **MongoDB Atlas Account:** Active cluster with a connection string URI.
3. **Render Account:** Free tier account at [render.com](https://render.com).
4. **Vercel Account:** Free tier account at [vercel.com](https://vercel.com).
5. **OpenRouter API Key (Optional):** Fallback key for demo users from [openrouter.ai](https://openrouter.ai).

---

## 3. Step 1: Configure MongoDB Atlas

Before deploying servers, ensure MongoDB Atlas accepts connections from Render:

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com).
2. Go to **Security** $\rightarrow$ **Network Access**.
3. Click **Add IP Address** $\rightarrow$ Select **Allow Access from Anywhere** (`0.0.0.0/0`) $\rightarrow$ Confirm.  
   *(Render free tier uses dynamic IP addresses, so `0.0.0.0/0` is required).*
4. Go to **Database Access** and verify you have a user with `Read and write to any database` permissions.
5. Go to **Database** $\rightarrow$ **Connect** $\rightarrow$ **Drivers** $\rightarrow$ Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/skillgraph?retryWrites=true&w=majority
   ```

---

## 4. Step 2: Deploy the ML Service on Render

> **Tip:** Deploy the ML service **first** so you have its URL ready when configuring the backend.

1. Log in to the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository: `skillgraph`.
4. Configure the service settings:
   - **Name:** `skillgraph-ml`
   - **Region:** Any (e.g., *Oregon (US West)* or *Frankfurt (EU)*)
   - **Branch:** `main` (or your active release branch)
   - **Root Directory:** `ml-service`
   - **Runtime:** `Python 3`
   - **Build Command:**
     ```bash
     pip install -r requirements.txt && python -m data.generate_synthetic && python -m training.train && python -m app.verify_model
     ```
     > **Why this build command?** `models/*.joblib` is gitignored. Running synthetic generation and training creates `models/model.joblib` and `models/model_info.json` automatically on Render before server start. The script `python -m app.verify_model` verifies that the artifact exists and exposes a valid predictor interface.
   - **Start Command:**
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type:** `Free`
5. Click **Advanced** $\rightarrow$ Add Environment Variables:
   | Key | Value | Notes |
   |---|---|---|
   | `INTERNAL_KEY` | `<strong-random-secret-min-16-chars>` | Strong secret token for internal auth (e.g. `openssl rand -hex 16`). **Required in production** (fails startup if missing, weak, or placeholder). |
   | `HOST` | `0.0.0.0` | Bind to all interfaces |
   | `PYTHON_VERSION` | `3.11.9` | Or any 3.10+ version |
6. Set **Health Check Path** to `/health`.
7. Click **Create Web Service**.
8. Once deployed (green checkmark), copy your service URL (e.g., `https://skillgraph-ml.onrender.com`).  
   Verify by visiting `https://skillgraph-ml.onrender.com/health` in your browser. It should respond:
   ```json
   { "status": "ok", "modelLoaded": true }
   ```

---

## 5. Step 3: Deploy the Backend API on Render

1. On the Render Dashboard, click **New +** $\rightarrow$ **Web Service**.
2. Connect the same repository: `skillgraph`.
3. Configure the service settings:
   - **Name:** `skillgraph-backend`
   - **Region:** Same region as your ML service
   - **Branch:** `main` (or your active release branch)
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm install
     ```
   - **Start Command:**
     ```bash
     npm start
     ```
   - **Instance Type:** `Free`
4. Click **Advanced** $\rightarrow$ Add Environment Variables:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `MONGODB_URI` | `mongodb+srv://<user>:<pwd>@.../skillgraph?retryWrites=true&w=majority` | Atlas URI with credentials |
   | `JWT_SECRET` | `<32-char-random-secret>` | Min 32 characters (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
   | `JWT_EXPIRES_IN` | `7d` | Token expiry |
   | `CLIENT_ORIGIN` | `https://<your-app>.vercel.app` | Your Vercel frontend URL (HTTPS required in production) |
   | `COOKIE_SECURE` | `true` | Secure httpOnly cookies over HTTPS |
   | `ENABLE_USER_API_KEYS` | `true` | Enables student BYOK API key storage |
   | `LLM_KEY_ENCRYPTION_SECRET` | `<32-byte-base64-secret>` | 32-byte base64 secret for AES-256-GCM BYOK encryption (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). Required when user keys are enabled. |
   | `ML_SERVICE_URL` | `https://skillgraph-ml.onrender.com` | URL from Step 2 |
   | `ML_INTERNAL_KEY` | `<same-secret-as-INTERNAL_KEY>` | Must match `INTERNAL_KEY` from Step 2 (min 16 chars). Required in production when `ML_SERVICE_URL` is set. |
   | `ML_TIMEOUT_MS` | `5000` | Microservice timeout |
   | `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | OpenRouter gateway |
   | `OPENROUTER_API_KEY` | `<your-openrouter-key>` | Optional server fallback key |
   | `OPENROUTER_DEFAULT_MODEL` | `google/gemini-2.0-flash-exp:free` | Default free tier model |
   | `SERVER_KEY_DAILY_LIMIT` | `30` | Daily cap per user |
   | `ADMIN_EMAIL` | `admin@skillgraph.dev` | Seed admin account |
   | `ADMIN_PASSWORD` | `<secure-admin-password>` | Seed admin password |
5. Set **Health Check Path** to `/health`.
6. Click **Create Web Service**.

> **Important:** Demo persona seeding (`npm run seed:demo`) and frontend mock mode (`VITE_USE_MOCKS=true`) are strictly blocked in production. Startup validation rejects weak placeholder secrets and ensures production safety.

### Seed the Database in Atlas
Once the backend service is deployed, populate the knowledge base (71 skills, 5 careers, relationships) and initial admin account:

**Option A (Using Render Shell - Easiest):**
1. In the Render Dashboard, go to your `skillgraph-backend` service.
2. Click the **Shell** tab on the left menu.
3. Run:
   ```bash
   npm run seed
   ```
   You will see the seeder output:
   ```
   ✓ Loaded 71 skills
   ✓ Loaded 101 relationships
   ✓ Loaded 5 careers
   ✓ Created admin: admin@skillgraph.dev
   ```

**Option B (From your local terminal):**
```bash
MONGODB_URI="<your-atlas-uri>" npm run seed --prefix backend
```

Verify backend health by opening `https://<your-backend>.onrender.com/health`. It should report:
```json
{
  "status": "ok",
  "db": "up",
  "ml": "up"
}
```

---

## 6. Step 4: Deploy the Frontend on Vercel

### Architecture Options for Authentication & Cookies

When deploying React/Vite on Vercel and Express on Render, you have two production architectures:

#### Option A: Zero-CORS Same-Origin Proxy (Recommended)
By proxying `/api/*` through Vercel rewrites to Render, the frontend makes **first-party same-origin requests**. This completely eliminates third-party cookie blocking in Safari (ITP), Chrome, and Brave.
1. `frontend/vercel.json` configures reverse proxy rewrites:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://<your-backend>.onrender.com/api/:path*"
       },
       {
         "source": "/health",
         "destination": "https://<your-backend>.onrender.com/health"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
2. Frontend environment variable on Vercel:
   - `VITE_API_BASE_URL`: `/api` (or omitted, defaults to `/api`)
3. Backend environment variables on Render:
   - `COOKIE_SAME_SITE`: `lax`
   - `COOKIE_SECURE`: `true`

#### Option B: Direct Cross-Site Hosting (with CSRF Protection)
If you prefer the frontend to call Render directly without proxying:
1. Frontend environment variable on Vercel:
   - `VITE_API_BASE_URL`: `https://<your-backend>.onrender.com/api`
2. Backend environment variables on Render:
   - `COOKIE_SAME_SITE`: `none` (mandatory for cross-site fetch with credentials)
   - `COOKIE_SECURE`: `true` (mandatory when `SameSite=none`)
   - `CLIENT_ORIGIN`: `https://<your-app>.vercel.app`
3. CSRF Protection:
   - Handled automatically via `csrfProtection` middleware. State-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) require Origin verification and double-submit `x-csrf-token` header matching the `sg_csrf` cookie.

### Deploying the Frontend on Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your GitHub repository: `skillgraph`.
4. Configure the Project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** and select `frontend`.
   - **Build and Output Settings:**
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`
5. Add Environment Variables:
   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_BASE_URL` | `/api` (Option A) or `https://<your-backend>.onrender.com/api` (Option B) | API target |
   | `VITE_USE_MOCKS` | `false` | Disable local mocks in production |
6. Click **Deploy**.

### Update Backend CORS on Render
Once Vercel finishes deploying, copy your production frontend URL (e.g., `https://skillgraph-seven.vercel.app`).
1. Go to Render $\rightarrow$ `skillgraph-backend` $\rightarrow$ **Environment**.
2. Update `CLIENT_ORIGIN` to your exact Vercel URL (or comma-separated list including custom domains):
   ```
   CLIENT_ORIGIN=https://skillgraph-seven.vercel.app
   ```
3. Click **Save Changes**.

---

## 7. Alternative: 1-Click Render Blueprint (`render.yaml`)

Both backend and ML microservices can be deployed simultaneously to Render using the repository's `render.yaml` Blueprint:

1. In Render Dashboard, click **New +** $\rightarrow$ **Blueprint**.
2. Connect your `skillgraph` repository.
3. Render reads `render.yaml` and lists both `skillgraph-backend` and `skillgraph-ml`.
4. Fill in the prompted secret variables:
   - `MONGODB_URI`
   - `CLIENT_ORIGIN`
   - `OPENROUTER_API_KEY` (optional)
5. Click **Apply**. Render handles linking, environment keys, and parallel builds automatically.

---

## 8. Verification & Acceptance Testing

Verify your live production deployment using these tests:

| Test Case | How to Verify | Expected Result |
|---|---|---|
| **1. ML Service Health** | Visit `https://<ml-url>/health` | Status: `healthy` |
| **2. Backend Health** | Visit `https://<backend-url>/health` | `{ "status": "ok", "db": "up", "ml": "up" }` |
| **3. Landing Page** | Visit `https://<vercel-url>` | Hero section, neo-brutalist styling, Call to Action buttons |
| **4. Student Login** | Log in with `prabha@demo.skillgraph.dev` / `DemoPassword123!` | Lands on `/app/dashboard` with avatar and ML Engineer career |
| **5. Interactive Graph** | Navigate to `/app/graph` | Dagre L-to-R DAG renders with zoom/pan, node inspection drawer opens |
| **6. Learning Pathway** | Navigate to `/app/learning-path` | Topologically ordered steps with effort estimates |
| **7. Grounded Assistant** | Open Assistant (`/app/assistant`) and ask: *"Why should I learn SQL?"* | Grounded response referencing career requirements and prerequisites |
| **8. Admin Panel** | Log in with `admin@skillgraph.dev` / `AdminSecurePass2026!` | Access `/admin/skills`, `/admin/careers`, and aggregate analytics |

---

## 9. Troubleshooting & Common Pitfalls

### 1. Render Free Tier "Cold Start" Delays
- **Behavior:** Free-tier Render instances spin down after 15 minutes of inactivity. The first request after sleep may take 30–50 seconds to respond while the instance starts up.
- **Remedy:** During live demonstrations, open `https://<backend-url>/health` and `https://<ml-url>/health` 2 minutes beforehand to warm up instances.

### 2. MongoDB Connection Timeout (`MongoServerSelectionError`)
- **Cause:** MongoDB Atlas Network Access is blocking the incoming connection from Render.
- **Fix:** In MongoDB Atlas, go to **Network Access** and verify that IP `0.0.0.0/0` is active and not expired.

### 3. Login Cookie Not Preserved (`401 UNAUTHENTICATED` on refresh)
- **Cause:** Cross-origin cookie policies between `vercel.app` and `onrender.com`.
- **Fix:** Ensure backend has `COOKIE_SECURE=true` and `CLIENT_ORIGIN=https://<your-exact-app>.vercel.app` without a trailing slash. If Safari blocks cross-site cookies, use a custom domain on both (e.g., `app.yourdomain.com` and `api.yourdomain.com`) or configure Vercel proxy rewrites.

### 4. ML Microservice Returning 401 / Fallback to Rule-Based
- **Cause:** Mismatched secret keys, missing secret, or unauthorized requests between backend and ML service.
- **Behavior:** The backend automatically and safely falls back to the deterministic rule-based engine (`strategy: "rule"`, `fallbackReason: "ML_UNAVAILABLE"`) so student pages never crash.
- **Fix:** Check that `ML_INTERNAL_KEY` on `skillgraph-backend` exactly matches `INTERNAL_KEY` on `skillgraph-ml`. In production, both services require a strong secret ($\ge 16$ characters, not a placeholder like `dev-internal-key`). If missing in production, service startup fails with a clear validation error.

