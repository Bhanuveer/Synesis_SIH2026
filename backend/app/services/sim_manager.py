"""Process-wide singleton tying the simulator, risk engine and alert dedup
together, so both the WebSocket loop and plain REST reads (e.g. Decision
Support on page load) see the same live state.
"""
from datetime import datetime, timezone

from .. import db
from ..config import ACTIVE_WELL_NAME
from .geo import nearby_wells as compute_nearby, formation_at_depth
from .simulation import DrillingSimulator
from . import risk_engine

_simulator = None
_last_risk_signature = None
_latest_state = None


def _get_active_well():
    return db.get_one("wells", db.Q.name == ACTIVE_WELL_NAME)


def get_simulator() -> DrillingSimulator:
    global _simulator
    if _simulator is None:
        active = _get_active_well()
        _simulator = DrillingSimulator(active["drilling_parameters"], active["total_depth"])
    return _simulator


def reset_simulator():
    global _simulator, _last_risk_signature, _latest_state
    _simulator = None
    _last_risk_signature = None
    _latest_state = None
    get_simulator()


def _default_radius_km():
    return 25.0


def compute_snapshot(depth=None, params=None, radius_km=None):
    """Build the full live snapshot: formation, nearby evidence, hybrid risk."""
    active = _get_active_well()
    sim = get_simulator()
    if depth is None:
        depth = sim.depth
    if params is None:
        params = sim.baseline
    radius_km = radius_km or _default_radius_km()

    formation = formation_at_depth(active["formation_tops"], depth)
    all_wells = db.all_docs("wells")
    nearby = compute_nearby(active, all_wells, radius_km)

    risk = risk_engine.hybrid_risk(
        active_well=active, params=params, baseline=active["drilling_parameters"],
        depth=depth, total_depth=active["total_depth"], current_formation=formation,
        nearby_wells=nearby,
    )

    snapshot = {
        "active_well": active["name"],
        "depth": depth,
        "formation": formation,
        "params": params,
        "nearby_wells": [{"name": w["name"], "distance_km": w["distance_km"]} for w in nearby],
        "risk": risk,
        "running": sim.running,
        "speed": sim.speed,
        "tick": sim.tick,
    }
    global _latest_state
    _latest_state = snapshot
    return snapshot


def get_latest_state(radius_km=None):
    if _latest_state is None:
        return compute_snapshot(radius_km=radius_km)
    return _latest_state


def maybe_create_alert(snapshot):
    """Alert only on risk TYPE or LEVEL change — never on every tick."""
    global _last_risk_signature
    risk = snapshot["risk"]
    signature = (risk["risk_type"], risk["level"])
    if risk["level"] == "Normal":
        _last_risk_signature = signature
        return None
    if signature == _last_risk_signature:
        return None
    _last_risk_signature = signature

    alert = {
        "risk_type": risk["risk_type"],
        "level": risk["level"],
        "depth": snapshot["depth"],
        "formation": snapshot["formation"],
        "ml": risk["ml"],
        "rules": risk["rules"],
        "offset_evidence": risk["offset_evidence"],
        "deltas": risk["deltas"],
        "recommendation": risk["recommendation"],
        "status": "New",
        "feedback": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    doc_id = db.insert("alerts", alert)
    alert["id"] = doc_id
    return alert
