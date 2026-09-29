from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import db
from ..services import knowledge

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
def list_alerts():
    alerts = db.all_docs("alerts")
    for a in alerts:
        a["id"] = a.doc_id
    return sorted(alerts, key=lambda a: a["created_at"], reverse=True)


class FeedbackRequest(BaseModel):
    status: str  # Acknowledged | Useful | Not Useful
    feedback_text: str = ""
    actual_event: str = ""
    lesson: str = ""
    mitigation: str = ""
    well: str = "ACTIVE-01"
    formation: str = ""
    depth: float | None = None


@router.post("/{alert_id}/feedback")
def add_feedback(alert_id: int, req: FeedbackRequest):
    alert = db.get_db().table("alerts").get(doc_id=alert_id)
    if not alert:
        raise HTTPException(404, "Alert not found")

    feedback_record = req.dict()
    db.update_by_id("alerts", alert_id, {"status": req.status, "feedback": feedback_record})
    db.insert("feedback", {**feedback_record, "alert_id": alert_id})

    message = None
    if req.actual_event or req.lesson or req.mitigation:
        knowledge.add_entry({
            "well": req.well,
            "depth": req.depth if req.depth is not None else alert.get("depth"),
            "formation": req.formation or alert.get("formation", ""),
            "event_type": req.actual_event or alert.get("risk_type", ""),
            "mitigation": req.mitigation,
            "notes": req.lesson,
        })
        message = "Knowledge Repository Updated"

    return {"status": "ok", "message": message}


@router.get("/feedback/all")
def list_feedback():
    return db.all_docs("feedback")
