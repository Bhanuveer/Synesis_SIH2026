"""Document ingestion: PyMuPDF text extraction + regex/keyword field extraction.

No LLM. Extraction is deliberately simple and always goes through a human
review step (editable form) before anything is written to the knowledge
repository.
"""
import re

import pymupdf as fitz  # PyMuPDF

from ..config import FORMATIONS

KEYWORD_MAP = {
    "loss": "Mud Loss",
    "losses": "Mud Loss",
    "partial returns": "Mud Loss",
    "lc": "Mud Loss",
    "lost circulation": "Mud Loss",
    "flow increase": "Kick",
    "gain": "Kick",
    "pit gain": "Kick",
    "kick": "Kick",
    "stuck": "Stuck Pipe",
    "pipe stuck": "Stuck Pipe",
    "stuck pipe": "Stuck Pipe",
    "torque spike": "Torque Spike",
    "high torque": "Torque Spike",
    "overpressure": "Overpressure",
    "pressure kick": "Overpressure",
    "cementing": "Cementing Issue",
    "cement job": "Cementing Issue",
    "poor bond": "Cementing Issue",
}

WELL_RE = re.compile(r"\b((?:ACTIVE|WELL)-\d{1,3})\b", re.IGNORECASE)
DEPTH_RE = re.compile(r"(\d{3,5}(?:\.\d+)?)\s?m\b", re.IGNORECASE)


def extract_text_from_pdf(path: str) -> str:
    text_parts = []
    with fitz.open(path) as doc:
        for page in doc:
            text_parts.append(page.get_text())
    text = "\n".join(text_parts).strip()
    if text:
        return text

    # Fallback OCR path (optional dependency; only used if PDF has no text layer)
    try:
        import pytesseract
        from pdf2image import convert_from_path

        images = convert_from_path(path)
        ocr_text = "\n".join(pytesseract.image_to_string(img) for img in images)
        return ocr_text.strip()
    except Exception:
        return ""


def extract_fields(text: str) -> dict:
    lower = text.lower()

    well_match = WELL_RE.search(text)
    well = well_match.group(1).upper() if well_match else ""

    depth_match = DEPTH_RE.search(text)
    depth = float(depth_match.group(1)) if depth_match else None

    formation = ""
    for f in FORMATIONS:
        if f.lower() in lower:
            formation = f
            break

    event_type = ""
    for kw, etype in KEYWORD_MAP.items():
        if kw in lower:
            event_type = etype
            break

    mitigation = ""
    mit_match = re.search(r"(mitigat\w*[:\s]*)([^\n\.]{5,200})", text, re.IGNORECASE)
    if mit_match:
        mitigation = mit_match.group(2).strip()

    return {
        "well": well,
        "depth": depth,
        "formation": formation,
        "event_type": event_type,
        "mitigation": mitigation,
        "raw_excerpt": text[:600],
    }
