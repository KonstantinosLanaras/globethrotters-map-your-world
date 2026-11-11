#!/usr/bin/env python3
"""Merge Overture place matches with OSM route/geographic confirmation.

The editorial list owns catalogue membership. This step only decides whether
the proposed identity/geometry is sufficiently confirmed for automatic import.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any
from route_quality import named_hike, route_hold_reasons


def flags(value: str | None) -> list[str]:
    return [item.strip() for item in (value or "").split("|") if item.strip()]


def join_flags(values: list[str]) -> str:
    return " | ".join(dict.fromkeys(value for value in values if value))


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def key(row: dict[str, str]) -> tuple[str, str, str, str]:
    return (
        row.get("city_slug") or row.get("destination_slug") or "",
        row.get("category") or "",
        str(row.get("rank") or ""),
        row.get("display_name") or "",
    )


def official_route_status(suggestions: dict[str, Any], osm: dict[str, str]) -> dict[str, Any]:
    checks = suggestions.get("official_status_checks") or {}
    routes = checks.get("routes") or {}
    ref = (osm.get("route_ref") or "").strip()
    result = dict(routes.get(ref) or {})
    result["checked_at"] = result.get("checked_at") or checks.get("checked_at") or ""
    result["source_url"] = result.get("source_url") or checks.get("source_url") or ""
    result["reservation_required"] = bool(checks.get("reservation_required"))
    result["reservation_url"] = checks.get("reservation_url") or ""
    return result


def merge_rows(
    suggestions: dict[str, Any], overture_rows: list[dict[str, str]], osm_rows: list[dict[str, str]], today=None
) -> list[dict[str, str]]:
    osm_by_key = {key(row): row for row in osm_rows}
    merged: list[dict[str, str]] = []
    for source in overture_rows:
        row = dict(source)
        overture_auto_match = row.get("match_status") in {"auto_match", "manual_match"}
        row["matched_source"] = row.get("matched_source") or ("overture" if overture_auto_match else (
            "curated" if row.get("match_status") == "editorial_only" else ""
        ))
        row["matched_source_id"] = row.get("matched_source_id") or row.get("overture_id") or ""
        # Preserve existing venue closure evidence while adding route evidence.
        for field in ["official_status","official_status_checked_at","official_conditions","reservation_required","reservation_url"]:
            row.setdefault(field,"")
        osm = osm_by_key.get(key(row))
        route = row.get("match_strategy") or ""
        if not osm or "osm" not in route:
            if named_hike(row):
                row["match_status"]="review"
                row["risk_flags"]=join_flags([*flags(row.get("risk_flags")),"osm_confirmation_pending"])
            merged.append(row)
            continue

        row["osm_match_status"] = osm.get("osm_match_status") or ""
        row["osm_id"] = osm.get("osm_id") or ""
        row["osm_type"] = osm.get("osm_type") or ""
        row["osm_name"] = osm.get("matched_name") or ""
        row["osm_tags"] = osm.get("osm_tags") or "{}"
        row["osm_candidate_alternatives"]=osm.get("osm_candidate_alternatives") or "[]"
        row["route_ref"] = osm.get("route_ref") or ""
        row["osm_access"] = osm.get("access") or ""
        combined_flags = flags(row.get("risk_flags")) + flags(osm.get("risk_flags"))
        restricted = "access_restricted" in combined_flags or osm.get("access") in {"no", "private"}
        if restricted:
            combined_flags.append("access_restricted")

        official = official_route_status(suggestions, osm)
        if row.get("content_kind") == "route_experience":
            row["official_status"] = official.get("status") or ""
            row["official_status_checked_at"] = official.get("checked_at") or ""
            row["official_source_url"] = official.get("source_url") or row.get("official_source_url") or ""
            row["official_conditions"] = official.get("conditions") or ""
            row["reservation_required"] = "true" if official.get("reservation_required") else "false"
            row["reservation_url"] = official.get("reservation_url") or ""
            if official.get("status") == "open_with_conditions":
                combined_flags.append("official_conditions_apply")
            if not official.get("status"):
                combined_flags.append("official_status_pending")

        official_ok = row.get("content_kind") != "route_experience" or row["official_status"] in {
            "open", "open_with_conditions"
        }
        fallback_needed = route == "overture_then_osm_fallback" and not overture_auto_match
        # OSM is authoritative for route identity and geometry. For a named
        # geographic feature it is corroborating/fallback evidence: an exact
        # Overture identity must not be downgraded merely because OSM contains
        # several representations or a shortened label for the same feature.
        osm_feature_fallback = route == "overture_and_osm_feature" and not overture_auto_match
        osm_primary = route == "osm_route_then_official" or fallback_needed or osm_feature_fallback
        if restricted and route in {"osm_route_then_official", "overture_and_osm_feature"}:
            row["match_status"] = "review"
            row["matched_source"] = ""
            row["matched_source_id"] = ""
            combined_flags.append("osm_confirmation_pending")
        elif osm_primary and osm.get("osm_match_status") == "auto_match" and official_ok:
            row["match_status"] = "auto_match"
            row["matched_source"] = "osm"
            row["matched_source_id"] = f"osm:{osm.get('osm_type')}:{osm.get('osm_id')}"
            row["matched_name"] = osm.get("matched_name") or row.get("display_name") or ""
            row["match_score"] = osm.get("match_score") or row.get("match_score") or ""
            row["latitude"] = osm.get("latitude") or row.get("latitude") or ""
            row["longitude"] = osm.get("longitude") or row.get("longitude") or ""
            row["geometry_status"] = "osm_anchor"
            row["website"] = osm.get("website") or row.get("website") or ""
        elif route == "osm_route_then_official" or osm_feature_fallback:
            row["match_status"] = "review"
            row["matched_source"] = ""
            row["matched_source_id"] = ""
            combined_flags.append("osm_confirmation_pending")

        row["risk_flags"] = join_flags(combined_flags)
        if named_hike(row):
            row["route_identity_required"]="True"
            row["official_verification_required"]="True"
            row["route_identity_confirmed"]=str(osm.get("route_identity_confirmed") or "False")
            row["route_source_url"]=f"https://www.openstreetmap.org/{osm.get('osm_type')}/{osm.get('osm_id')}" if osm.get("osm_id") else ""
            row["geometry_geojson"]=osm.get("geometry_geojson") or ""
            row["geometry_type"]="line"
            row["route_geometry_status"]=osm.get("route_geometry_status") or "not_available"
            row["route_attributes"]=osm.get("route_attributes") or "{}"
            # Source centres/bounds are not trailheads. Keep the route as a card
            # and optionally a source line, without publishing an invented pin.
            row["latitude"]=row["longitude"]=""
            row["geometry_status"]="source_route_segments" if row["geometry_geojson"] else "route_card_without_pin"
            holds=route_hold_reasons(row,today=today)
            if holds:
                row["match_status"]="review"
                row["risk_flags"]=join_flags([*flags(row.get("risk_flags")),*holds])
        merged.append(row)
    return merged


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--suggestions", type=Path, required=True)
    parser.add_argument("--overture-csv", type=Path, required=True)
    parser.add_argument("--osm-csv", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    suggestions = json.loads(args.suggestions.read_text(encoding="utf-8"))
    rows = merge_rows(suggestions, read_csv(args.overture_csv), read_csv(args.osm_csv))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        columns = list(dict.fromkeys(column for row in rows for column in row))
        writer = csv.DictWriter(handle, fieldnames=columns)
        if rows:
            writer.writeheader()
            writer.writerows(rows)
    counts = {status: sum(row.get("match_status") == status for row in rows) for status in (
        "auto_match", "manual_match", "review", "unmatched", "editorial_only"
    )}
    print(json.dumps({"rows": len(rows), **counts, "output": str(args.output)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
