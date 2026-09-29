from fastapi import APIRouter, HTTPException, Query

from .. import db
from ..config import ACTIVE_WELL_NAME
from ..services.geo import nearby_wells, formation_at_depth
from ..services import sim_manager

router = APIRouter(prefix="/api/wells", tags=["wells"])


@router.get("")
def list_wells():
    return db.all_docs("wells")


@router.get("/active")
def get_active():
    active = db.get_one("wells", db.Q.name == ACTIVE_WELL_NAME)
    if not active:
        raise HTTPException(404, "Active well not found — run seed_data.py")
    state = sim_manager.get_latest_state()
    return {"well": active, "depth": state["depth"], "formation": state["formation"], "params": state["params"]}


@router.get("/nearby")
def get_nearby(radius_km: float = Query(25.0, gt=0)):
    active = db.get_one("wells", db.Q.name == ACTIVE_WELL_NAME)
    all_wells = db.all_docs("wells")
    return nearby_wells(active, all_wells, radius_km)


@router.get("/{name}")
def get_well(name: str):
    well = db.get_one("wells", db.Q.name == name.upper())
    if not well:
        raise HTTPException(404, f"Well {name} not found")
    return well


@router.get("/correlation/data")
def correlation(names: str = Query(..., description="Comma-separated well names, e.g. WELL-04,WELL-07,WELL-09")):
    active = db.get_one("wells", db.Q.name == ACTIVE_WELL_NAME)
    selected_names = [n.strip().upper() for n in names.split(",") if n.strip()]
    wells = [active] + [db.get_one("wells", db.Q.name == n) for n in selected_names]
    wells = [w for w in wells if w]
    state = sim_manager.get_latest_state()
    return {
        "active_depth": state["depth"],
        "active_formation": state["formation"],
        "wells": [
            {
                "name": w["name"],
                "formation_tops": w["formation_tops"],
                "total_depth": w["total_depth"],
                "historical_events": w.get("historical_events", []),
                "is_active": w["name"] == ACTIVE_WELL_NAME,
            }
            for w in wells
        ],
    }
