"""Single database service layer for SYNESIS.

Everything that touches TinyDB goes through this module. A threading lock
guards access because WebSocket simulation ticks and human feedback/document
writes can happen concurrently.
"""
import threading
from tinydb import TinyDB, Query

from .config import DATA_DIR, DB_PATH

_lock = threading.Lock()
_db = None


def get_db() -> TinyDB:
    global _db
    if _db is None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        _db = TinyDB(DB_PATH, indent=2)
    return _db


def table(name: str):
    return get_db().table(name)


# ---- generic helpers, all lock-guarded ----

def all_docs(table_name: str):
    with _lock:
        return table(table_name).all()


def insert(table_name: str, doc: dict):
    with _lock:
        return table(table_name).insert(doc)


def insert_multiple(table_name: str, docs: list):
    with _lock:
        return table(table_name).insert_multiple(docs)


def update_by_id(table_name: str, doc_id: int, fields: dict):
    with _lock:
        return table(table_name).update(fields, doc_ids=[doc_id])


def search(table_name: str, cond):
    with _lock:
        return table(table_name).search(cond)


def get_one(table_name: str, cond):
    with _lock:
        return table(table_name).get(cond)


def truncate(table_name: str):
    with _lock:
        table(table_name).truncate()


def truncate_all():
    with _lock:
        get_db().drop_tables()


def reset_database_file():
    """Hard reset: close and delete the underlying TinyDB json file."""
    global _db
    with _lock:
        if _db is not None:
            _db.close()
            _db = None
        if DB_PATH.exists():
            DB_PATH.unlink()


Q = Query()
