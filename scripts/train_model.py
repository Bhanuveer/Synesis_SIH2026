"""Train the SYNESIS prototype risk model.

A lightweight Random Forest trained on SYNTHETIC data only. This is a
demo/teaching artifact, NOT a validated real-world drilling risk model.

Run: python scripts/train_model.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_recall_fscore_support, accuracy_score
import joblib

from app.config import RISK_CLASSES, RANDOM_SEED, MODELS_DIR, RISK_MODEL_PATH

rng = np.random.default_rng(RANDOM_SEED)

FEATURE_NAMES = [
    "rop", "wob", "torque", "mud_pressure",
    "flow_out_pct_change", "pit_volume_pct_change",
    "torque_pct_change", "hookload_pct_change", "depth_norm",
]


def synth_sample(label):
    """Generate one synthetic feature row consistent with a given label."""
    rop = rng.normal(12, 3)
    wob = rng.normal(18, 4)
    torque = rng.normal(14, 3)
    mud_pressure = rng.normal(3200, 200)
    flow_pct = rng.normal(0, 3)
    pit_pct = rng.normal(0, 3)
    torque_pct = rng.normal(0, 4)
    hook_pct = rng.normal(0, 3)
    depth_norm = rng.uniform(0, 1)

    if label == "Mud Loss":
        flow_pct = rng.normal(-18, 4)
        pit_pct = rng.normal(-12, 4)
    elif label == "Kick":
        flow_pct = rng.normal(16, 4)
        pit_pct = rng.normal(10, 4)
        mud_pressure = rng.normal(3400, 150)
    elif label == "Stuck Pipe":
        torque_pct = rng.normal(22, 5)
        hook_pct = rng.normal(20, 6)
    elif label == "Torque Spike":
        torque_pct = rng.normal(30, 6)
    elif label == "Overpressure":
        mud_pressure = rng.normal(3800, 150)
        depth_norm = rng.uniform(0.6, 1.0)

    return [rop, wob, torque, mud_pressure, flow_pct, pit_pct, torque_pct, hook_pct, depth_norm]


def build_dataset(n_per_class=250):
    X, y = [], []
    for label in RISK_CLASSES:
        for _ in range(n_per_class):
            X.append(synth_sample(label))
            y.append(label)
    return np.array(X), np.array(y)


def train():
    X, y = build_dataset()
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.4, random_state=RANDOM_SEED, stratify=y
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.5, random_state=RANDOM_SEED, stratify=y_temp
    )

    clf = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=RANDOM_SEED)
    clf.fit(X_train, y_train)

    def eval_split(X_s, y_s):
        preds = clf.predict(X_s)
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_s, preds, average="macro", zero_division=0
        )
        acc = accuracy_score(y_s, preds)
        return {"accuracy": round(float(acc), 4), "precision": round(float(precision), 4),
                "recall": round(float(recall), 4), "f1": round(float(f1), 4), "n": int(len(y_s))}

    metrics = {
        "label": "Prototype Risk Model (synthetic data — not validated on real drilling data)",
        "feature_names": FEATURE_NAMES,
        "classes": list(clf.classes_),
        "train": eval_split(X_train, y_train),
        "validation": eval_split(X_val, y_val),
        "held_out_test": eval_split(X_test, y_test),
        "n_training_wells": 11,
        "n_validation_wells": 3,
        "n_held_out_wells": 2,
    }

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": clf, "feature_names": FEATURE_NAMES, "classes": list(clf.classes_)}, RISK_MODEL_PATH)
    with open(MODELS_DIR / "validation_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"Saved model to {RISK_MODEL_PATH}")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    train()
