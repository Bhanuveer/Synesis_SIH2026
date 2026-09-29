import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..services import sim_manager

router = APIRouter()


@router.websocket("/ws/simulation")
async def simulation_ws(websocket: WebSocket):
    await websocket.accept()
    sim = sim_manager.get_simulator()

    try:
        # send current state immediately on connect
        snapshot = sim_manager.compute_snapshot()
        await websocket.send_json({"type": "state", **snapshot})

        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=sim.interval())
                msg = json.loads(raw)
                action = msg.get("action")
                if action == "start":
                    sim.start()
                elif action == "pause":
                    sim.pause()
                elif action == "reset":
                    sim.reset()
                    snapshot = sim_manager.compute_snapshot(depth=sim.depth, params=sim.baseline)
                    await websocket.send_json({"type": "state", **snapshot})
                    continue
                elif action == "speed":
                    sim.set_speed(int(msg.get("value", 1)))
            except asyncio.TimeoutError:
                pass

            if sim.running:
                depth, params = sim.advance()
                snapshot = sim_manager.compute_snapshot(depth=depth, params=params)
                alert = sim_manager.maybe_create_alert(snapshot)
                payload = {"type": "state", **snapshot}
                if alert:
                    payload["new_alert"] = alert
                await websocket.send_json(payload)

                if depth >= sim.total_depth:
                    sim.pause()
    except WebSocketDisconnect:
        pass
