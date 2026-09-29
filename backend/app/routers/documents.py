import shutil
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from .. import db
from ..config import DOCS_DIR
from ..services import knowledge
from ..services.document_processor import extract_fields, extract_text_from_pdf

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("")
def list_documents():
    return db.all_docs("documents")


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported in this prototype")

    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    dest_name = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    dest_path = DOCS_DIR / dest_name
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    text = extract_text_from_pdf(str(dest_path))
    fields = extract_fields(text)

    doc_id = db.insert("documents", {
        "filename": file.filename,
        "stored_as": dest_name,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "extracted": fields,
        "reviewed": False,
    })

    return {"document_id": doc_id, "extracted": fields}


class ReviewedEntry(BaseModel):
    document_id: int | None = None
    well: str = ""
    depth: float | None = None
    formation: str = ""
    event_type: str = ""
    mitigation: str = ""
    notes: str = ""


@router.post("/confirm")
def confirm_entry(entry: ReviewedEntry):
    """Human-reviewed fields get committed to the knowledge repository.
    Nothing from extraction is auto-saved before this step."""
    data = entry.dict()
    doc_id = data.pop("document_id", None)
    kb_id = knowledge.add_entry(data)
    if doc_id is not None:
        db.update_by_id("documents", doc_id, {"reviewed": True})
    return {"knowledge_id": kb_id, "message": "Knowledge Repository Updated"}
