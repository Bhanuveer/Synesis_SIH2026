import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .routers import alerts, documents, query, simulation_ws, validation, wells
from .services import knowledge, sim_manager

SCRIPTS_DIR = Path(__file__).resolve().parent.parent.parent / "scripts"

app = FastAPI(title="SYNESIS eRTMAC-NWIS", description="Nearby Wells Intelligence System — hackathon prototype")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    if not db.all_docs("wells"):
        sys.path.insert(0, str(SCRIPTS_DIR))
        import seed_data
        seed_data.seed()

    from .services.risk_engine import get_model  # trains model if missing
    get_model()

    knowledge.rebuild_index()


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "SYNESIS eRTMAC-NWIS", "mode": "PROTOTYPE / DEMO DATA / SIMULATED eRTMAC"}


@app.post("/api/reset")
def reset_demo():
    sys.path.insert(0, str(SCRIPTS_DIR))
    import seed_data
    import importlib
    importlib.reload(seed_data)
    seed_data.seed()
    sim_manager.reset_simulator()
    knowledge.rebuild_index()
    return {"status": "reset complete"}


app.include_router(wells.router)
app.include_router(documents.router)
app.include_router(query.router)
app.include_router(alerts.router)
app.include_router(validation.router)
app.include_router(simulation_ws.router)
