"""Knowledge repository writes + TF-IDF index rebuild trigger."""
from datetime import datetime, timezone

from .. import db
from .query_engine import engine


def add_entry(entry: dict) -> int:
    entry = dict(entry)
    entry.setdefault("added_at", datetime.now(timezone.utc).isoformat())
    doc_id = db.insert("knowledge_repository", entry)
    rebuild_index()
    return doc_id


def rebuild_index():
    wells = db.all_docs("wells")
    knowledge = db.all_docs("knowledge_repository")
    engine.rebuild(wells, knowledge)
