"""Hybrid risk engine: ML signal + offset-well evidence + engineering rules.

FINAL RISK = ML signal + Historical offset evidence + Engineering rules.
Never ML alone. Every output carries the evidence that produced it.
"""
import subprocess
import sys
from pathlib import Path

import joblib
import numpy as np

from ..config import RISK_MODEL_PATH, DEPTH_WINDOW_M, MODELS_DIR

_model_bundle = None


def _train_if_missing():
    script = Path(__file__).resolve().parent.parent.parent.parent / "scripts" / "train_model.py"
    subprocess.run([sys.executable, str(script)], check=True)


def get_model():
    global _model_bundle
    if _model_bundle is None:
        if not RISK_MODEL_PATH.exists():
            _train_if_missing()
        _model_bundle = joblib.load(RISK_MODEL_PATH)
    return _model_bundle


def pct_change(current, baseline):
    if baseline == 0:
        return 0.0
    return (current - baseline) / baseline * 100.0


def build_features(params: dict, baseline: dict, depth: float, total_depth: float):
    flow_pct = pct_change(params["flow_out"], baseline["flow_out"])
    pit_pct = pct_change(params["pit_volume"], baseline["pit_volume"])
    torque_pct = pct_change(params["torque"], baseline["torque"])
    hook_pct = pct_change(params["hookload"], baseline["hookload"])
    depth_norm = min(1.0, depth / total_depth) if total_depth else 0.0
    return [
        params["rop"], params["wob"], params["torque"], params["mud_pressure"],
        flow_pct, pit_pct, torque_pct, hook_pct, depth_norm,
    ], {
        "flow_out_pct_change": round(flow_pct, 1),
        "pit_volume_pct_change": round(pit_pct, 1),
        "torque_pct_change": round(torque_pct, 1),
        "hookload_pct_change": round(hook_pct, 1),
    }


def ml_predict(feature_vector):
    bundle = get_model()
    clf = bundle["model"]
    x = np.array([feature_vector])
    pred = clf.predict(x)[0]
    proba = clf.predict_proba(x)[0]
    classes = clf.classes_
    conf = float(max(proba))
    proba_map = {c: round(float(p), 3) for c, p in zip(classes, proba)}
    return pred, conf, proba_map


def rule_checks(deltas: dict):
    """Engineering rule checks. Returns list of {rule, event_type, detail}."""
    triggered = []
    flow = deltas["flow_out_pct_change"]
    pit = deltas["pit_volume_pct_change"]
    torque = deltas["torque_pct_change"]
    hook = deltas["hookload_pct_change"]

    if flow <= -8 and pit <= -6:
        triggered.append({
            "event_type": "Mud Loss",
            "detail": f"Flow Out down {abs(flow):.0f}%, Pit Volume down {abs(pit):.0f}%.",
        })
    if flow >= 8 and pit >= 6:
        triggered.append({
            "event_type": "Kick",
            "detail": f"Flow Out up {flow:.0f}%, Pit Volume up {pit:.0f}%.",
        })
    if torque >= 15 or abs(hook) >= 15:
        triggered.append({
            "event_type": "Stuck Pipe",
            "detail": f"Torque change {torque:.0f}%, Hookload change {hook:.0f}%.",
        })
    if torque >= 20:
        triggered.append({
            "event_type": "Torque Spike",
            "detail": f"Sudden torque increase of {torque:.0f}%.",
        })
    return triggered


def offset_evidence(active_well, current_depth, current_formation, nearby_wells, window_m=DEPTH_WINDOW_M):
    """Historical events from nearby wells in the same formation within +/- window_m."""
    evidence = []
    for w in nearby_wells:
        for ev in w.get("historical_events", []):
            if ev["formation"] != current_formation:
                continue
            if abs(ev["depth"] - current_depth) <= window_m:
                evidence.append({
                    "well": w["name"],
                    "distance_km": w.get("distance_km"),
                    "event_type": ev["event_type"],
                    "depth": ev["depth"],
                    "description": ev["description"],
                    "mitigation": ev.get("mitigation"),
                })
    return evidence


RECOMMENDATIONS = {
    "Mud Loss": "Review historical mitigation measures and increase monitoring. Consider LCM pill if losses continue.",
    "Kick": "Flow-check immediately, monitor pit gain trend, be ready to shut in per well control procedure.",
    "Stuck Pipe": "Work string and circulate; review offset mitigation for this formation.",
    "Overpressure": "Increase mud weight incrementally and monitor connection gas trend.",
    "Torque Spike": "Reduce WOB/RPM, back-ream, and review hole-cleaning parameters.",
    "Normal": "Continue normal monitoring cadence.",
}


def hybrid_risk(active_well, params, baseline, depth, total_depth, current_formation, nearby_wells):
    feature_vector, deltas = build_features(params, baseline, depth, total_depth)
    ml_label, ml_conf, ml_proba = ml_predict(feature_vector)
    rules = rule_checks(deltas)
    evidence = offset_evidence(active_well, depth, current_formation, nearby_wells)

    # candidate event type: prefer a rule hit, else an early directional trend,
    # else the ML label if it disagrees with Normal
    flow0 = deltas["flow_out_pct_change"]
    pit0 = deltas["pit_volume_pct_change"]
    if rules:
        candidate = rules[0]["event_type"]
    elif flow0 < -3 and pit0 < -2:
        candidate = "Mud Loss"
    elif ml_label != "Normal":
        candidate = ml_label
    else:
        candidate = None

    # Continuous engineering-rule severity from the actual parameter deltas —
    # this is the primary driver of the risk curve as the well drills ahead.
    # ML agreement and offset evidence each add a small, capped bonus so they
    # inform the picture without letting noise flip the risk tier early.
    flow = deltas["flow_out_pct_change"]
    pit = deltas["pit_volume_pct_change"]
    magnitude = 0.0
    if flow < 0 or pit < 0:
        magnitude += min(max(-flow, 0) / 20.0, 1.0)
        magnitude += min(max(-pit, 0) / 14.0, 1.0)
    magnitude = min(magnitude, 2.0)

    matching_evidence = [e for e in evidence if candidate and e["event_type"] == candidate] if candidate else []

    score = magnitude * 2.1
    if candidate is not None and ml_label == candidate:
        score += 0.1
    if candidate is not None and magnitude > 0.3 and matching_evidence:
        score += 0.1

    if score < 0.8:
        level = "Normal"
    elif score < 1.6:
        level = "Low"
    elif score < 2.4:
        level = "Medium"
    else:
        level = "High"

    risk_type = candidate if level != "Normal" else "Normal"

    return {
        "level": level,
        "risk_type": risk_type,
        "depth": depth,
        "formation": current_formation,
        "score": round(score, 2),
        "ml": {"label": ml_label, "confidence": round(ml_conf, 2), "probabilities": ml_proba},
        "rules": rules,
        "offset_evidence": matching_evidence,
        "deltas": deltas,
        "recommendation": RECOMMENDATIONS.get(risk_type, RECOMMENDATIONS["Normal"]),
    }
