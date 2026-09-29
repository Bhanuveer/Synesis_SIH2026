from fastapi import APIRouter
from pydantic import BaseModel

from .. import db
from ..config import ACTIVE_WELL_NAME
from ..services import sim_manager
from ..services.query_engine import engine

router = APIRouter(prefix="/api/query", tags=["query"])


class QueryRequest(BaseModel):
    text: str
    radius_km: float = 25.0


@router.post("")
def run_query(req: QueryRequest):
    active = db.get_one("wells", db.Q.name == ACTIVE_WELL_NAME)
    state = sim_manager.get_latest_state()
    return engine.search(
        query_text=req.text,
        active_well=active,
        current_depth=state["depth"],
        current_formation=state["formation"],
        radius_km=req.radius_km,
    )
