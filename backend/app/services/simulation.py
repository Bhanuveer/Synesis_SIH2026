"""Deterministic simulated eRTMAC drilling data stream.

Not a real rig feed — a seeded, reproducible synthetic scenario so the same
demo plays out identically every run. Depth advances every tick; parameters
drift according to a scripted mud-loss scenario around 2800-2900 m so the
hybrid risk engine reliably reaches HIGH RISK at the point described in the
demo script.
"""
import numpy as np

from ..config import RANDOM_SEED

STEP_M = 4.0  # depth advance per tick
BASE_INTERVAL_S = 1.0  # seconds per tick at 1x speed
RESET_DEPTH = 2600.0
SCENARIO_START = 2750.0
SCENARIO_END = 2900.0


class DrillingSimulator:
    def __init__(self, baseline_params: dict, total_depth: float):
        self.baseline = dict(baseline_params)
        self.total_depth = total_depth
        self.reset()

    def reset(self):
        self.depth = RESET_DEPTH
        self.tick = 0
        self.running = False
        self.speed = 1

    def start(self):
        self.running = True

    def pause(self):
        self.running = False

    def set_speed(self, speed: int):
        self.speed = max(1, min(5, speed))

    def interval(self):
        return BASE_INTERVAL_S / self.speed

    def _scenario_progress(self):
        if self.depth < SCENARIO_START:
            return 0.0
        if self.depth > SCENARIO_END:
            return 1.0
        return (self.depth - SCENARIO_START) / (SCENARIO_END - SCENARIO_START)

    def advance(self):
        """Advance one tick, return the new (depth, params) snapshot."""
        self.tick += 1
        self.depth = min(self.total_depth, self.depth + STEP_M)

        rng = np.random.default_rng(RANDOM_SEED + self.tick)
        progress = self._scenario_progress()

        rop = self.baseline["rop"] + rng.normal(0, 0.6)
        wob = self.baseline["wob"] + rng.normal(0, 0.8)
        torque = self.baseline["torque"] + rng.normal(0, 0.5)
        mud_pressure = self.baseline["mud_pressure"] + rng.normal(0, 30)
        hookload = self.baseline["hookload"] + rng.normal(0, 3)

        # Scripted mud-loss scenario: Flow Out and Pit Volume trend down.
        flow_out = self.baseline["flow_out"] * (1 - 0.20 * progress) + rng.normal(0, 1.5)
        pit_volume = self.baseline["pit_volume"] * (1 - 0.14 * progress) + rng.normal(0, 1.0)

        params = {
            "rop": round(float(rop), 1),
            "wob": round(float(wob), 1),
            "torque": round(float(torque), 1),
            "mud_pressure": round(float(mud_pressure), 0),
            "flow_out": round(float(flow_out), 0),
            "pit_volume": round(float(pit_volume), 0),
            "hookload": round(float(hookload), 0),
        }
        return self.depth, params
