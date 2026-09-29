import json

from fastapi import APIRouter

from .. import db
from ..config import MODELS_DIR, ACTIVE_WELL_NAME

router = APIRouter(prefix="/api/validation", tags=["validation"])

METRICS_PATH = MODELS_DIR / "validation_metrics.json"


@router.get("")
def get_validation():
    wells = db.all_docs("wells")
    names = sorted(w["name"] for w in wells if w["name"] != ACTIVE_WELL_NAME)

    if not METRICS_PATH.exists():
        return {
            "status": "Validation pending",
            "training_wells": names[:11],
            "validation_wells": names[11:14],
            "held_out_wells": names[14:],
        }

    with open(METRICS_PATH) as f:
        metrics = json.load(f)

    return {
        "status": "Validated (prototype, synthetic data only)",
        "metrics": metrics,
        "training_wells": names[: metrics.get("n_training_wells", 11)],
        "validation_wells": names[metrics.get("n_training_wells", 11): metrics.get("n_training_wells", 11) + metrics.get("n_validation_wells", 3)],
        "held_out_wells": names[metrics.get("n_training_wells", 11) + metrics.get("n_validation_wells", 3):],
    }
