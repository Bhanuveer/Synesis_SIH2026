# SYNESIS — eRTMAC-NWIS

**Nearby Wells Intelligence System** — a hackathon prototype for drilling decision support.

**Live demo:** [synesis-sih-2026-qjam-nu.vercel.app](https://synesis-sih-2026-qjam-nu.vercel.app)
*(backend is on Render's free tier and sleeps after 15 min idle — first load may take 30-50s to wake up)*

> **PROTOTYPE / DEMO DATA / SIMULATED eRTMAC.** All wells, events, documents and
> the "live" drilling feed are synthetic. This project makes no claim to real
> OIL confidential data, and the risk model makes no claim of real-world
> accuracy — see the in-app Validation page.

SYNESIS combines historical offset-well knowledge, a simulated live eRTMAC
drilling feed, nearby-well correlation, a hybrid (ML + rules + offset
evidence) risk engine, and an engineer feedback loop into one decision-support
dashboard.

## Tech stack

- **Frontend:** React + Vite, Leaflet.js (with an offline grid-map fallback), Recharts
- **Backend:** Python, FastAPI, WebSocket
- **Database:** TinyDB (single service layer, thread-lock guarded)
- **Data/ML:** Pandas, NumPy, scikit-learn (Random Forest)
- **Documents:** PyMuPDF (+ optional Tesseract OCR fallback)
- **Search:** Regex + keyword dictionary + TF-IDF (no LLM anywhere)

Deliberately **not** used in V1 (but the code is structured so they could be
added later without a rewrite): Kafka, PostgreSQL/PostGIS/TimescaleDB, LSTM,
FAISS, SHAP, spaCy, large LLMs, multi-agent systems.

## Project structure

```
/backend      FastAPI app (routers, services, ML/risk engine, TinyDB layer)
/frontend     React + Vite app (8 pages, Leaflet map, Recharts)
/data         TinyDB database file (generated)
/documents    Sample + uploaded WCR/DDR PDF documents
/models       Trained risk_model.pkl + validation_metrics.json (generated)
/scripts      seed_data.py, train_model.py, generate_demo_documents.py
```

## Deploying (for judges to access via a link)

See [DEPLOY.md](DEPLOY.md) — backend on Render, frontend on Vercel, ~10 minutes, no credit card needed.

## Requirements

- Python 3.10+ (tested on 3.13)
- Node.js 18+ (tested on 20/24) and npm

## Quick start

```bash
./run.sh        # macOS/Linux
run.bat         # Windows
```

This installs dependencies, seeds demo data, trains the risk model, generates
sample PDFs, and starts both servers:

- Backend: http://127.0.0.1:8000 (docs at `/docs`)
- Frontend: http://127.0.0.1:5173

### Manual steps (if you'd rather run each one yourself)

1. **Install backend deps**
   ```bash
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Seed demo data** (16 synthetic wells, events, lessons, mitigations)
   ```bash
   python scripts/seed_data.py
   ```
3. **Train the risk model** (auto-trains on first backend startup if skipped)
   ```bash
   python scripts/train_model.py
   ```
4. **Generate sample PDF documents** for the Knowledge & Documents page
   ```bash
   python scripts/generate_demo_documents.py
   ```
5. **Start the backend**
   ```bash
   cd backend && uvicorn app.main:app --port 8000
   ```
6. **Install + start the frontend**
   ```bash
   cd frontend && npm install && npm run dev
   ```
7. **Run the demo** — see the scripted walkthrough below.
8. **Reset the demo** any time from the top-right "RESET DEMO DATA" button, or:
   ```bash
   curl -X POST http://127.0.0.1:8000/api/reset
   ```

## The 8 pages

1. **Decision Support** — landing page: active well, depth, formation, nearby
   wells, current risk, historical evidence, recommendation, recent alerts.
2. **Nearby Wells** — Leaflet map (offline grid fallback if tiles fail),
   radius presets (10/25/50 km) + custom radius, click a well for details.
3. **Well Correlation** — active well + 3–5 offset wells side by side,
   formation tops aligned on a shared depth scale, historical events marked.
4. **Knowledge & Documents** — upload a PDF, review extracted fields in an
   editable form, then explicitly commit to the knowledge repository
   (human-in-the-loop — nothing is auto-saved).
5. **Risk & Live eRTMAC** — deterministic simulated drilling feed with
   START/PAUSE/RESET/SPEED controls; hybrid risk engine (ML + offset evidence
   + engineering rules) with full "why" explanation.
6. **Alerts & Feedback** — alert history, Acknowledge/Useful/Not
   Useful/feedback capture; feeds new lessons back into the knowledge
   repository and rebuilds the TF-IDF index immediately.
7. **Query** — ask things like *"What happened in nearby wells around this
   depth?"* using regex + keyword dictionary + TF-IDF (no LLM).
8. **Validation** — training/validation/held-out well lists and real metrics
   from the last training run (or "Validation pending" if none exist).

## Main demo scenario (deterministic — same every run)

1. Open **Decision Support** — ACTIVE-01, depth ~2600 m, Normal risk.
2. Open **Nearby Wells**, set radius to **25 km**, click **WELL-07** — see its
   Tipam Mud Loss event and mitigation.
3. Open **Well Correlation**, compare ACTIVE-01 / WELL-04 / WELL-07 / WELL-09 —
   formation tops align, historical events appear at depth.
4. Open **Risk & Live eRTMAC**, click **START** (try 5x speed). Flow Out and
   Pit Volume trend down as the well drills into ~2800 m. Risk escalates
   Normal → Warning (~2800 m) → Medium (~2825 m) → **HIGH RISK** (~2850 m),
   with a full ML + rule + offset-evidence explanation and a recommendation.
5. Open **Alerts & Feedback** — three deduplicated alerts (one per risk
   change), each explained. Click **Useful**, then **Add Feedback** with an
   actual event/lesson/mitigation — the knowledge repository updates and the
   TF-IDF index rebuilds immediately.
6. Open **Query**, ask *"What happened in nearby wells around this depth?"* —
   the new feedback is now searchable.

## Database safety

All TinyDB reads/writes go through a single service layer
(`backend/app/db.py`) guarded by a threading lock, since the WebSocket
simulation loop and human feedback/document writes can happen concurrently.

## Notes on the risk model

The Random Forest in `models/risk_model.pkl` is trained entirely on
synthetic, seeded data (`scripts/train_model.py`) and is labeled
**"Prototype Risk Model"** everywhere it's surfaced. The engine never uses ML
alone — every risk output combines the ML signal, offset-well evidence
(same formation, ±100 m, within the selected radius), and engineering rule
checks (e.g. Flow Out ↓ + Pit Volume ↓ → Mud Loss). See the Validation page
for actual precision/recall/F1 on a held-out synthetic split — this is not a
claim of real-world accuracy.
