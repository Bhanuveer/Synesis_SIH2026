# Deploying SYNESIS

Two pieces, deployed separately (both have generous free tiers and both support
the WebSocket connection the live simulation needs):

- **Backend** (FastAPI + WebSocket) → **Render**
- **Frontend** (React static build) → **Vercel**

Total time: ~10 minutes, no credit card required for either free tier.

---

## 1. Backend on Render

### Option A — Blueprint (fastest)

1. Go to [render.com](https://render.com) and sign up / log in with your GitHub account.
2. Click **New +** → **Blueprint**.
3. Connect your GitHub account if asked, then pick the `Synesis_SIH2026` repo.
4. Render will detect `render.yaml` in the repo root and pre-fill everything
   (name `synesis-backend`, Python env, build/start commands, free plan).
5. Click **Apply** / **Create**. First build takes 3-5 minutes (installing
   pandas/scikit-learn/PyMuPDF etc).
6. Once it's live, copy the URL Render gives you — it'll look like
   `https://synesis-backend.onrender.com`. **Save this**, you need it for step 2.
7. Sanity check: open `https://synesis-backend.onrender.com/api/health` in a
   browser — you should see a small JSON response with `"status":"ok"`.

### Option B — Manual (if the Blueprint doesn't pick up, or you want full control)

1. **New +** → **Web Service** → connect the repo.
2. Fill in:
   - **Name:** `synesis-backend` (or anything)
   - **Root Directory:** leave blank (repo root)
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend`
   - **Plan:** Free
3. Under **Environment**, add `PYTHON_VERSION` = `3.11.9` (keeps the build
   reproducible — some ML packages behave better on 3.11 than the newest Python).
4. Create the service, wait for the build, then check `/api/health` as above.

### What to expect from the free tier
- It **spins down after ~15 minutes of no traffic** and takes ~30-50 seconds to
  wake back up on the next request. Before showing judges the link, open it
  yourself a minute or two beforehand so it's already warm.
- Storage resets on every restart/redeploy — that's fine here, since the app
  automatically re-seeds its demo data and retrains the model on startup if
  they're missing. Nothing to do manually.

---

## 2. Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up / log in with GitHub.
2. **Add New** → **Project** → pick the `Synesis_SIH2026` repo.
3. Vercel will ask for project settings:
   - **Root Directory:** click **Edit** and set it to `frontend`
   - **Framework Preset:** should auto-detect **Vite**
   - **Build Command:** `npm run build` (default, leave as is)
   - **Output Directory:** `dist` (default, leave as is)
4. Open **Environment Variables** and add:
   - **Key:** `VITE_API_ORIGIN`
   - **Value:** the Render URL from step 1, e.g. `https://synesis-backend.onrender.com`
     (no trailing slash)
5. Click **Deploy**. Takes about a minute.
6. You'll get a URL like `https://synesis-sih2026.vercel.app` — **that's the
   link you give the judges.**

---

## 3. Before the judges look at it

- Open your Vercel link yourself 1-2 minutes beforehand so Render's free
  instance is already awake (avoids a 30-50s blank-looking first load).
- Click **Reset demo data** once so the simulation starts clean at depth 2600m.
- If you update the code later, both Render and Vercel auto-redeploy on every
  `git push` to `main` — no manual redeploy step needed.

---

## If something doesn't connect

- **Frontend loads but shows no data / network errors in console:** almost
  always means `VITE_API_ORIGIN` wasn't set (or was set after the build —
  Vercel env vars only apply to new builds, so redeploy after adding it).
- **WebSocket won't connect (Risk & Live page stuck on "reconnecting…"):**
  double-check the Render URL uses `https://` in the env var (the frontend
  code converts `https` → `wss` automatically) and that the Render service is
  awake (visit `/api/health` directly first).
- **CORS errors in browser console:** shouldn't happen — the backend already
  allows all origins (`backend/app/main.py`) — but if you see one anyway,
  confirm you're hitting the right Render URL with no typos.
