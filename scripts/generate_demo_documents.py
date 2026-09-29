"""Generate 4-5 synthetic WCR/DDR-style PDF documents for the Knowledge &
Documents page demo (upload -> extract -> human review -> save).

Run: python scripts/generate_demo_documents.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import pymupdf as fitz  # PyMuPDF

from app.config import DOCS_DIR

REPORTS = [
    {
        "title": "Daily Drilling Report (DDR) — WELL-04",
        "body": (
            "Well: WELL-04\n"
            "Date: 2024-02-11\n"
            "Formation: Tipam\n"
            "Depth: 2810 m\n\n"
            "Summary:\n"
            "While drilling ahead in the Tipam sand, partial returns were observed "
            "at surface. Flow Out dropped and pit volume showed a steady decrease, "
            "consistent with mud losses (LC) into a permeable interval.\n\n"
            "Mitigation: Pumped LCM pill, reduced ECD, monitored pit volume every "
            "15 minutes until returns stabilized.\n"
        ),
    },
    {
        "title": "Well Completion Report (WCR) — WELL-07",
        "body": (
            "Well: WELL-07\n"
            "Formation: Tipam\n"
            "Depth: 2860 m\n\n"
            "Events: A significant loss event (mud loss) occurred during the "
            "Tipam interval. Partial returns were noted before full losses "
            "developed.\n\n"
            "Mitigation applied: graded LCM pill, monitored pit gain, reduced mud "
            "weight window narrowed based on offset data.\n"
        ),
    },
    {
        "title": "Daily Drilling Report (DDR) — WELL-09",
        "body": (
            "Well: WELL-09\n"
            "Formation: Tipam\n"
            "Depth: 2830 m\n\n"
            "Summary: High torque observed while drilling, torque spike noted on "
            "connection. Reactive shale suspected.\n\n"
            "Mitigation: Reduced WOB and RPM, back-reamed section, increased "
            "hole-cleaning circulation.\n"
        ),
    },
    {
        "title": "Well Completion Report (WCR) — WELL-02",
        "body": (
            "Well: WELL-02\n"
            "Formation: Barail\n"
            "Depth: 3050 m\n\n"
            "Events: Pit gain observed with a corresponding flow increase, "
            "indicating a kick. Well was shut in per procedure.\n\n"
            "Mitigation: SIDPP/SICP monitored, mud weight increased per kill "
            "sheet, well controlled successfully.\n"
        ),
    },
    {
        "title": "Daily Drilling Report (DDR) — WELL-11",
        "body": (
            "Well: WELL-11\n"
            "Formation: Kopili\n"
            "Depth: 3600 m\n\n"
            "Summary: Cementing job showed poor bond on evaluation log; "
            "remedial squeeze recommended for zonal isolation.\n\n"
            "Mitigation: Re-evaluated slurry design, ran temperature log, "
            "planned remedial cement squeeze.\n"
        ),
    },
]


def generate():
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    for i, report in enumerate(REPORTS, start=1):
        doc = fitz.open()
        page = doc.new_page()
        text = f"{report['title']}\n\n{report['body']}\n\n[PROTOTYPE / SYNTHETIC DEMO DOCUMENT — NOT REAL FIELD DATA]"
        page.insert_text((50, 72), text, fontsize=11)
        out_path = DOCS_DIR / f"demo_doc_{i:02d}.pdf"
        doc.save(out_path)
        doc.close()
        print(f"Wrote {out_path}")


if __name__ == "__main__":
    generate()
