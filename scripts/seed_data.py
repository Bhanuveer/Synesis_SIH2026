"""SYNESIS demo data seeder.

Generates 15+ synthetic wells (offset-well knowledge base), formation tops,
historical drilling events, lessons, mitigation measures, and clears the
alert/feedback tables. Deterministic (seeded) so the demo is reproducible.

Run: python scripts/seed_data.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import numpy as np

from app import db
from app.config import FORMATIONS, ACTIVE_WELL_NAME, RANDOM_SEED

rng = np.random.default_rng(RANDOM_SEED)

# Center of synthetic field (Upper Assam basin style coordinates, PROTOTYPE DATA)
CENTER_LAT, CENTER_LON = 27.10, 95.30
RESERVOIRS = ["Lakwa Sand", "Lakadong Sand", "Barail Sand", "Tipam Sand"]

EVENT_LIBRARY = ["Mud Loss", "Kick", "Stuck Pipe", "Overpressure", "Torque Spike", "Cementing Issue"]

MITIGATIONS = {
    "Mud Loss": "Pump LCM pill, reduce ECD, monitor pit volume continuously.",
    "Kick": "Shut in well, monitor SIDPP/SICP, increase mud weight per kill sheet.",
    "Stuck Pipe": "Work string, circulate bottoms up, consider spotting pill if no movement.",
    "Overpressure": "Increase mud weight incrementally, monitor gas readings, flow-check frequently.",
    "Torque Spike": "Reduce WOB/RPM, back-ream section, check hole cleaning.",
    "Cementing Issue": "Re-evaluate slurry design, run temperature log, consider remedial squeeze.",
}

LESSON_LIBRARY = [
    "Watch for early ROP break before formation change as a leading indicator.",
    "Historically this interval shows tight pore-pressure margins; keep mud weight windows narrow.",
    "Losses in this reservoir respond well to graded LCM applied early rather than after full loss.",
    "Torque trends should be reviewed every stand in this formation due to reactive shale.",
    "Offset wells suggest connection gas is a reliable overpressure precursor here.",
]


def make_formation_tops(total_depth, jitter):
    """Split total_depth into 4 formation tops with small per-well jitter."""
    base_fracs = [0.20, 0.55, 0.78, 1.0]  # cumulative fraction of total depth
    fracs = [min(1.0, max(0.05, f + rng.uniform(-jitter, jitter))) for f in base_fracs[:-1]]
    fracs = sorted(fracs) + [1.0]
    tops = []
    prev = 0.0
    for name, frac in zip(FORMATIONS, fracs):
        bottom = round(total_depth * frac, 0)
        tops.append({"formation": name, "top": round(prev, 0), "bottom": bottom})
        prev = bottom
    return tops


def formation_at(formation_tops, depth):
    for ft in formation_tops:
        if ft["top"] <= depth <= ft["bottom"]:
            return ft["formation"]
    return formation_tops[-1]["formation"]


def make_events(well_name, formation_tops, n_events):
    events = []
    for i in range(n_events):
        ft = formation_tops[rng.integers(0, len(formation_tops))]
        depth = round(rng.uniform(ft["top"] + 20, max(ft["top"] + 21, ft["bottom"] - 20)), 0)
        etype = EVENT_LIBRARY[rng.integers(0, len(EVENT_LIBRARY))]
        events.append({
            "event_type": etype,
            "formation": ft["formation"],
            "depth": depth,
            "description": f"{etype} observed in {well_name} at {int(depth)} m ({ft['formation']}).",
            "mitigation": MITIGATIONS[etype],
        })
    return events


def build_wells():
    wells = []

    # ACTIVE-01: the well currently being drilled. Boundaries tuned so that
    # 2800-2900 m sits inside Tipam, matching the fixed demo scenario.
    active_tops = [
        {"formation": "Girujan", "top": 0, "bottom": 600},
        {"formation": "Tipam", "top": 600, "bottom": 2900},
        {"formation": "Barail", "top": 2900, "bottom": 3400},
        {"formation": "Kopili", "top": 3400, "bottom": 4000},
    ]
    wells.append({
        "name": ACTIVE_WELL_NAME,
        "is_active": True,
        "lat": CENTER_LAT,
        "lon": CENTER_LON,
        "total_depth": 4000,
        "reservoir": "Lakwa Sand",
        "formation_tops": active_tops,
        "drilling_parameters": {
            "rop": 12.0, "wob": 18.0, "torque": 14.0, "mud_pressure": 3200.0,
            "flow_out": 650.0, "pit_volume": 450.0, "hookload": 180.0,
        },
        "historical_events": [],
        "lessons": [LESSON_LIBRARY[0]],
        "mitigation_measures": [{"event_type": "Mud Loss", "measure": MITIGATIONS["Mud Loss"]}],
    })

    # Wells specifically crafted so WELL-04, WELL-07, WELL-09 support the
    # scripted demo: Mud Loss in Tipam near 2800-2900 m, within radius of ACTIVE-01.
    scripted = {
        "WELL-04": {"offset_km": 8.0, "bearing_deg": 40, "event_depth": 2810, "event": "Mud Loss"},
        "WELL-07": {"offset_km": 15.0, "bearing_deg": 120, "event_depth": 2860, "event": "Mud Loss"},
        "WELL-09": {"offset_km": 22.0, "bearing_deg": 250, "event_depth": 2830, "event": "Torque Spike"},
    }

    def offset_latlon(km, bearing_deg):
        # crude flat-earth offset, fine for a small-radius prototype
        dlat = (km / 111.0) * np.cos(np.radians(bearing_deg))
        dlon = (km / (111.0 * np.cos(np.radians(CENTER_LAT)))) * np.sin(np.radians(bearing_deg))
        return CENTER_LAT + dlat, CENTER_LON + dlon

    for name, cfg in scripted.items():
        lat, lon = offset_latlon(cfg["offset_km"], cfg["bearing_deg"])
        total_depth = int(rng.uniform(3400, 4200))
        tops = [
            {"formation": "Girujan", "top": 0, "bottom": 550 + int(rng.uniform(-50, 50))},
            {"formation": "Tipam", "top": 0, "bottom": 0},  # placeholder, fixed below
            {"formation": "Barail", "top": 0, "bottom": 0},
            {"formation": "Kopili", "top": 0, "bottom": total_depth},
        ]
        girujan_bottom = tops[0]["bottom"]
        tipam_bottom = cfg["event_depth"] + int(rng.uniform(80, 200))  # ensure event falls inside Tipam
        barail_bottom = tipam_bottom + int(rng.uniform(400, 600))
        tops[1] = {"formation": "Tipam", "top": girujan_bottom, "bottom": tipam_bottom}
        tops[2] = {"formation": "Barail", "top": tipam_bottom, "bottom": barail_bottom}
        tops[3] = {"formation": "Kopili", "top": barail_bottom, "bottom": total_depth}

        events = make_events(name, tops, n_events=int(rng.integers(2, 4)))
        events.append({
            "event_type": cfg["event"],
            "formation": "Tipam",
            "depth": float(cfg["event_depth"]),
            "description": f"{cfg['event']} observed in {name} at {cfg['event_depth']} m (Tipam).",
            "mitigation": MITIGATIONS[cfg["event"]],
        })

        wells.append({
            "name": name,
            "is_active": False,
            "lat": round(lat, 5),
            "lon": round(lon, 5),
            "total_depth": total_depth,
            "reservoir": RESERVOIRS[rng.integers(0, len(RESERVOIRS))],
            "formation_tops": tops,
            "drilling_parameters": {
                "rop": round(rng.uniform(8, 16), 1), "wob": round(rng.uniform(12, 22), 1),
                "torque": round(rng.uniform(10, 18), 1), "mud_pressure": round(rng.uniform(2800, 3600), 0),
                "flow_out": round(rng.uniform(550, 700), 0), "pit_volume": round(rng.uniform(380, 500), 0),
                "hookload": round(rng.uniform(150, 220), 0),
            },
            "historical_events": events,
            "lessons": [LESSON_LIBRARY[rng.integers(0, len(LESSON_LIBRARY))]],
            "mitigation_measures": [{"event_type": e["event_type"], "measure": e["mitigation"]} for e in events[:2]],
        })

    # Remaining wells scattered within ~50 km, random formations/events
    n_remaining = 15
    for i in range(1, n_remaining + 1):
        name = f"WELL-{i:02d}"
        if name in ("WELL-04", "WELL-07", "WELL-09"):
            continue
        km = rng.uniform(3, 55)
        bearing = rng.uniform(0, 360)
        lat, lon = offset_latlon(km, bearing)
        total_depth = int(rng.uniform(2800, 4300))
        tops = make_formation_tops(total_depth, jitter=0.06)
        n_events = int(rng.integers(1, 4))
        events = make_events(name, tops, n_events)
        wells.append({
            "name": name,
            "is_active": False,
            "lat": round(lat, 5),
            "lon": round(lon, 5),
            "total_depth": total_depth,
            "reservoir": RESERVOIRS[rng.integers(0, len(RESERVOIRS))],
            "formation_tops": tops,
            "drilling_parameters": {
                "rop": round(rng.uniform(8, 16), 1), "wob": round(rng.uniform(12, 22), 1),
                "torque": round(rng.uniform(10, 18), 1), "mud_pressure": round(rng.uniform(2800, 3600), 0),
                "flow_out": round(rng.uniform(550, 700), 0), "pit_volume": round(rng.uniform(380, 500), 0),
                "hookload": round(rng.uniform(150, 220), 0),
            },
            "historical_events": events,
            "lessons": [LESSON_LIBRARY[rng.integers(0, len(LESSON_LIBRARY))]],
            "mitigation_measures": [{"event_type": e["event_type"], "measure": e["mitigation"]} for e in events[:2]],
        })
        # keep going until we have >=15 total non-active wells + active = 16+
    return wells


def seed():
    db.reset_database_file()
    wells = build_wells()
    db.insert_multiple("wells", wells)
    db.truncate("alerts")
    db.truncate("feedback")
    db.truncate("documents")
    db.truncate("knowledge_repository")
    db.truncate("simulation_state")
    db.insert("simulation_state", {"id": "main", "depth": 2600.0, "running": False, "speed": 1, "tick": 0})
    print(f"Seeded {len(wells)} wells into {db.DB_PATH}")


if __name__ == "__main__":
    seed()
