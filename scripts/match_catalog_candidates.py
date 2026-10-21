#!/usr/bin/env python3
"""Match an OSM candidate JSON file against Overture rows and write a review report.

Input shape: {"osm": [...], "overture": [...]}. Output preserves every OSM
representation and records the match method, score, Overture ID and alternatives.
Nothing is inserted into or published from Supabase by this command.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from catalog_match import group_osm_features, match_candidate


def build_report(data: dict[str, Any]) -> dict[str, Any]:
    overture = data.get("overture", [])
    if not isinstance(overture, list) or not isinstance(data.get("osm", []), list):
        raise ValueError("Input must contain 'osm' and 'overture' arrays")
    decisions = []
    for group in group_osm_features(data.get("osm", [])):
        representative = group[0]
        result = match_candidate(representative, overture)
        selected = result.get("record")
        decisions.append({
            "status": result["status"],
            "method": result["method"],
            "score": round(float(result["score"]), 4),
            "osm_source_ids": [row.get("source_id") or row.get("osm_id") for row in group],
            "osm_representations": group,
            "overture_source_id": selected.get("source_id") if selected else None,
            "alternatives": [row.get("source_id") for row in result.get("alternatives", [])],
        })
    return {
        "schema_version": 1,
        "decision_policy": "catalog_match.py; exact identity then name+type+distance; ties reviewed",
        "candidate_count": len(data.get("osm", [])),
        "osm_feature_group_count": len(decisions),
        "decisions": decisions,
        "summary": {status: sum(1 for row in decisions if row["status"] == status)
                    for status in ("matched", "ambiguous", "unmatched")},
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="JSON file with osm and overture arrays")
    parser.add_argument("--output", required=True, help="Path for the review JSON report")
    args = parser.parse_args()
    data = json.loads(Path(args.input).read_text(encoding="utf-8"))
    report = build_report(data)
    Path(args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
