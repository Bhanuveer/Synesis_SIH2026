"""Institutional-memory query engine: regex + keyword dictionary + TF-IDF.

No LLM required. Resolves context ("nearby", "around this depth", an explicit
"2800 m", a formation name, an event type, or a well name) against the active
well's state, then ranks matching historical events / knowledge-repository
entries with TF-IDF cosine similarity.
"""
import re
import threading

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ..config import FORMATIONS, EVENT_TYPES, DEPTH_WINDOW_M
from .geo import haversine_km

_lock = threading.Lock()

WELL_RE = re.compile(r"\b((?:ACTIVE|WELL)-\d{1,3})\b", re.IGNORECASE)
DEPTH_RE = re.compile(r"(\d{3,5}(?:\.\d+)?)\s?m\b", re.IGNORECASE)


class QueryEngine:
    """Holds a TF-IDF index over well historical events + knowledge repo entries."""

    def __init__(self):
        self._vectorizer = None
        self._matrix = None
        self._corpus_meta = []  # parallel list of dicts describing each row

    def build_corpus(self, wells: list, knowledge_entries: list):
        docs = []
        meta = []
        for w in wells:
            for ev in w.get("historical_events", []):
                text = f"{ev['event_type']} {ev['formation']} {ev.get('description','')} {ev.get('mitigation','')}"
                docs.append(text)
                meta.append({
                    "source": "well_event",
                    "well": w["name"], "lat": w["lat"], "lon": w["lon"],
                    "formation": ev["formation"], "depth": ev["depth"],
                    "event_type": ev["event_type"], "description": ev.get("description", ""),
                    "mitigation": ev.get("mitigation", ""),
                })
        for k in knowledge_entries:
            text = f"{k.get('event_type','')} {k.get('formation','')} {k.get('mitigation','')} {k.get('notes','')}"
            docs.append(text)
            meta.append({
                "source": "knowledge_repository",
                "well": k.get("well", ""), "lat": None, "lon": None,
                "formation": k.get("formation", ""), "depth": k.get("depth"),
                "event_type": k.get("event_type", ""), "description": k.get("notes", ""),
                "mitigation": k.get("mitigation", ""),
            })
        return docs, meta

    def rebuild(self, wells: list, knowledge_entries: list):
        with _lock:
            docs, meta = self.build_corpus(wells, knowledge_entries)
            self._corpus_meta = meta
            if not docs:
                self._vectorizer = None
                self._matrix = None
                return
            self._vectorizer = TfidfVectorizer(stop_words="english")
            self._matrix = self._vectorizer.fit_transform(docs)

    def _rank(self, query_text: str, candidate_idx: list, top_k=10):
        if self._vectorizer is None or not candidate_idx:
            return []
        q_vec = self._vectorizer.transform([query_text])
        sub_matrix = self._matrix[candidate_idx]
        sims = cosine_similarity(q_vec, sub_matrix)[0]
        ranked = sorted(zip(candidate_idx, sims), key=lambda t: -t[1])[:top_k]
        return [{**self._corpus_meta[i], "score": round(float(s), 3)} for i, s in ranked if s > 0]

    def search(self, query_text: str, active_well: dict, current_depth: float,
               current_formation: str, radius_km: float):
        text = query_text.lower()

        explicit_depth = None
        m = DEPTH_RE.search(text)
        if m:
            explicit_depth = float(m.group(1))

        well_match = WELL_RE.search(query_text)
        target_well = well_match.group(1).upper() if well_match else None

        target_formation = next((f for f in FORMATIONS if f.lower() in text), None)
        target_event = next((e for e in EVENT_TYPES if e.lower() in text), None)

        wants_nearby = "nearby" in text or "near" in text or "offset" in text
        wants_around_depth = "around this depth" in text or "current depth" in text or "here" in text

        if explicit_depth is not None:
            depth_center = explicit_depth
        elif wants_around_depth or (not target_well and not target_formation):
            depth_center = current_depth
        else:
            depth_center = None

        formation_filter = target_formation or (current_formation if wants_around_depth else None)

        candidate_idx = []
        for i, m_ in enumerate(self._corpus_meta):
            if target_well and m_["well"] != target_well:
                continue
            if target_event and m_["event_type"] != target_event:
                continue
            if formation_filter and m_["formation"] and m_["formation"] != formation_filter:
                continue
            if depth_center is not None and m_["depth"] is not None:
                if abs(m_["depth"] - depth_center) > DEPTH_WINDOW_M:
                    continue
            if (wants_nearby or radius_km) and m_["lat"] is not None and active_well:
                dist = haversine_km(active_well["lat"], active_well["lon"], m_["lat"], m_["lon"])
                if dist > radius_km:
                    continue
            candidate_idx.append(i)

        if not candidate_idx:
            candidate_idx = list(range(len(self._corpus_meta)))

        results = self._rank(query_text, candidate_idx)
        return {
            "resolved_context": {
                "target_well": target_well,
                "target_formation": formation_filter,
                "target_event": target_event,
                "depth_center": depth_center,
                "radius_km": radius_km,
            },
            "results": results,
        }


engine = QueryEngine()
