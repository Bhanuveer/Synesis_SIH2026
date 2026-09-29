"""Central config: paths and static domain constants for SYNESIS prototype."""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DOCS_DIR = BASE_DIR / "documents"
MODELS_DIR = BASE_DIR / "models"

DB_PATH = DATA_DIR / "synesis_db.json"
RISK_MODEL_PATH = MODELS_DIR / "risk_model.pkl"

FORMATIONS = ["Girujan", "Tipam", "Barail", "Kopili"]

EVENT_TYPES = [
    "Mud Loss",
    "Kick",
    "Stuck Pipe",
    "Overpressure",
    "Torque Spike",
    "Cementing Issue",
]

# Live-predictable risk classes (Cementing Issue stays historical-only per spec)
RISK_CLASSES = [
    "Normal",
    "Mud Loss",
    "Kick",
    "Stuck Pipe",
    "Overpressure",
    "Torque Spike",
]

RANDOM_SEED = 42

# Correlation / evidence window
DEPTH_WINDOW_M = 100.0

ACTIVE_WELL_NAME = "ACTIVE-01"
