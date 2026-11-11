#!/usr/bin/env python3
"""Match route/geographic suggestions to a bounded Overpass JSON export."""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Any
from route_quality import named_hike, valid_route_geometry

from match_llm_to_overture import (
    flatten,
    geographic_distance_km,
    infer_source_route,
    normalize,
    pair_score,
    parse_suggestion,
)


AUTO_THRESHOLD = 0.94
REVIEW_THRESHOLD = 0.80
AUTO_MARGIN = 0.04


def element_names(element: dict[str, Any]) -> list[str]:
    tags = element.get("tags") or {}
    values = [tags.get("name"), tags.get("name:en"), tags.get("alt_name"), tags.get("short_name"), tags.get("ref")]
    names: list[str] = []
    for value in values:
        for name in flatten(value):
            if name and name not in names:
                names.append(name)
    return names


def element_center(element: dict[str, Any]) -> tuple[float | None, float | None]:
    if element.get("lat") is not None and element.get("lon") is not None:
        return float(element["lat"]), float(element["lon"])
    center = element.get("center") or {}
    if center.get("lat") is not None and center.get("lon") is not None:
        return float(center["lat"]), float(center["lon"])
    bounds = element.get("bounds") or {}
    if all(bounds.get(key) is not None for key in ("minlat", "minlon", "maxlat", "maxlon")):
        return (
            (float(bounds["minlat"]) + float(bounds["maxlat"])) / 2,
            (float(bounds["minlon"]) + float(bounds["maxlon"])) / 2,
        )
    geometry = element.get("geometry") or []
    points = [(point.get("lat"), point.get("lon")) for point in geometry if point.get("lat") is not None and point.get("lon") is not None]
    if not points:
        return None, None
    return sum(point[0] for point in points) / len(points), sum(point[1] for point in points) / len(points)


def is_route(element: dict[str, Any]) -> bool:
    tags = element.get("tags") or {}
    return element.get("type") == "relation" and tags.get("route") in {"hiking", "foot", "bicycle"}


def equivalent_elements(left: dict[str, Any], right: dict[str, Any]) -> bool:
    left_tags, right_tags = left.get("tags") or {}, right.get("tags") or {}
    left_ref, right_ref = normalize(left_tags.get("ref")), normalize(right_tags.get("ref"))
    if left_ref and right_ref and left_ref != right_ref:
        return False
    left_names = {normalize(name) for name in element_names(left)}
    right_names = {normalize(name) for name in element_names(right)}
    if not left_names.intersection(right_names):
        return False
    left_lat, left_lon = element_center(left)
    right_lat, right_lon = element_center(right)
    if None in {left_lat, left_lon, right_lat, right_lon}:
        return False
    return geographic_distance_km(
        {"latitude": left_lat, "longitude": left_lon},
        {"latitude": right_lat, "longitude": right_lon},
    ) <= 0.25


def route_geometry(element):
    """Keep actual source segments; never join gaps or label a centre trailhead."""
    members=[m for m in element.get("members",[]) if m.get("type")=="way"]
    segments=[]
    for member in members:
        points=member.get("geometry") or []
        if any(p.get("lon") is None or p.get("lat") is None for p in points):continue
        segment=[[p["lon"],p["lat"]] for p in points]
        geometry={"type":"LineString","coordinates":segment}
        if valid_route_geometry(geometry):segments.append(segment)
    if not segments:return None,"not_available"
    complete=len(segments)==len(members) and not any(m.get("type")=="relation" for m in element.get("members",[]))
    return {"type":"MultiLineString","coordinates":segments},"source_segments" if complete else "partial_source_segments"


def expected_ref(target):
    explicit=target.get("expected_route_ref") or ""
    if explicit:return re.sub(r"\s+","",explicit.casefold())
    found=re.match(r"^(?:PR|GR|SL)\s*\d+(?:\.\d+)?",target["name"],re.I)
    return re.sub(r"\s+","",found.group().casefold()) if found else ""


def inside_scope(element,suggestions):
    bounds=suggestions.get("destination_bounds")
    if not bounds:return True
    lat,lon=element_center(element)
    if lat is None or lon is None:return True  # no invented location; reviewed on other evidence
    return (bounds["min_latitude"]<=lat<=bounds["max_latitude"] and
            bounds["min_longitude"]<=lon<=bounds["max_longitude"])


def source_targets(suggestions: dict[str, Any]) -> list[dict[str, Any]]:
    rows = []
    for category, category_items in suggestions["categories"].items():
        rank_offset = int((suggestions.get("rank_offsets") or {}).get(category, 0))
        for local_rank, item in enumerate(category_items, 1):
            metadata = parse_suggestion(item)
            route = metadata.get("source_route") or infer_source_route(metadata["content_kind"], metadata["subtype"])
            if "osm" not in route:
                continue
            rows.append({"category": category, "rank": rank_offset + local_rank, **metadata})
    return rows


def match(suggestions: dict[str, Any], payload: dict[str, Any]) -> list[dict[str, Any]]:
    elements = [element for element in payload.get("elements", []) if element_names(element)]
    results = []
    for target in source_targets(suggestions):
        wants_route = target["content_kind"] == "route_experience"
        hike=named_hike(target)
        candidates = [element for element in elements if is_route(element) == wants_route
                      and (not hike or (element.get("tags",{}).get("route") in {"hiking","foot"}
                           and inside_scope(element,suggestions)))]
        wanted_names = [target["name"], *target["aliases"]]
        scored = []
        for element in candidates:
            score = max(pair_score(wanted, actual) for wanted in wanted_names for actual in element_names(element))
            actual_ref=re.sub(r"\s+","",str(element.get("tags",{}).get("ref") or "").casefold())
            if hike and expected_ref(target) and actual_ref and expected_ref(target)!=actual_ref:
                continue
            scored.append((score, element))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        best_score, best = scored[0] if scored else (0.0, None)
        second_score = next(
            (score for score, element in scored[1:] if not equivalent_elements(best, element)),
            0.0,
        ) if best else 0.0
        margin = best_score - second_score
        status = "unmatched"
        if best_score >= AUTO_THRESHOLD and margin >= AUTO_MARGIN:
            status = "auto_match"
        elif best_score >= REVIEW_THRESHOLD:
            status = "review"

        tags = (best or {}).get("tags") or {}
        lat, lon = element_center(best) if best else (None, None)
        geometry,geometry_status=route_geometry(best or {}) if hike else (None,"")
        flags = []
        if tags.get("access") in {"no", "private"}:
            flags.append("access_restricted")
        if target.get("official_verification_required"):
            flags.append("official_verification_required")
        results.append({
            "destination_slug": suggestions["city"].get("slug", ""),
            "category": target["category"],
            "rank": target["rank"],
            "display_name": target["name"],
            "content_kind": target["content_kind"],
            "source_route": target["source_route"],
            "osm_match_status": status,
            "match_score": round(best_score, 4),
            "second_score": round(second_score, 4),
            "score_margin": round(margin, 4),
            "osm_type": (best or {}).get("type", ""),
            "osm_id": (best or {}).get("id", ""),
            "matched_name": tags.get("name", ""),
            "latitude": lat if lat is not None else "",
            "longitude": lon if lon is not None else "",
            "geometry_geojson": json.dumps(geometry,separators=(",",":")) if geometry else "",
            "route_geometry_status": geometry_status,
            "route_identity_confirmed": hike and status=="auto_match",
            "route_attributes": json.dumps({k:tags[k] for k in ["distance","duration","ascent","descent","sac_scale","surface","network"] if k in tags}),
            "osm_candidate_alternatives": json.dumps([{"type":e.get("type"),"id":e.get("id"),
                "name":e.get("tags",{}).get("name"),"ref":e.get("tags",{}).get("ref"),"score":round(s,4)} for s,e in scored[:30]],ensure_ascii=False),
            "access": tags.get("access", ""),
            "route_ref": tags.get("ref", ""),
            "website": tags.get("website", ""),
            "risk_flags": " | ".join(flags),
            "official_source_url": target.get("official_source_url", ""),
            "osm_tags": json.dumps(tags, ensure_ascii=False, separators=(",", ":")) if best else "{}",
        })
    return results


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--suggestions", type=Path, required=True)
    parser.add_argument("--overpass-json", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    suggestions = json.loads(args.suggestions.read_text(encoding="utf-8"))
    payload = json.loads(args.overpass_json.read_text(encoding="utf-8"))
    rows = match(suggestions, payload)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]) if rows else [])
        if rows:
            writer.writeheader()
            writer.writerows(rows)
    print(json.dumps({
        "targets": len(rows),
        "auto_match": sum(row["osm_match_status"] == "auto_match" for row in rows),
        "review": sum(row["osm_match_status"] == "review" for row in rows),
        "unmatched": sum(row["osm_match_status"] == "unmatched" for row in rows),
        "output": str(args.output),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
