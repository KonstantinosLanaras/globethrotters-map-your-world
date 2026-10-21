#!/usr/bin/env python3
"""Read-only comparison of editorial candidates with normalized source exports.

Input JSON shape:
{"candidates": [...], "sources": {"overture": [...], "osm": [...], ...}}
Each source record should use id/name/alt_names/latitude/longitude/feature_type/
locality/url. The command writes a separate review report; it makes no database
calls and never changes or drops editorial candidates.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

FAMILY_BY_TYPE = {
    "food":"food", "restaurant":"food", "cafe":"food", "bakery":"food", "marketplace":"food",
    "culture":"culture", "museum":"culture", "gallery":"culture", "monument":"culture",
    "castle":"culture", "historic":"culture", "attraction":"culture", "theatre":"culture",
    "nature":"nature", "viewpoint":"nature", "beach":"nature", "trail":"nature",
    "route":"nature", "peak":"nature", "waterfall":"nature", "park":"nature",
    "nightlife":"nightlife", "bar":"nightlife", "pub":"nightlife", "nightclub":"nightlife",
    "music_venue":"nightlife",
}


def normalize(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or "").casefold())
    text = "".join(char for char in text if not unicodedata.combining(char))
    return " ".join(re.findall(r"[a-z0-9]+", text))


def name_set(record: dict[str, Any]) -> set[str]:
    values = [record.get("name"), *(record.get("alt_names") or []),
              *(record.get("aliases") or [])]
    return {value for raw in values if (value := normalize(raw))}


def meters(a: dict[str, Any], b: dict[str, Any]) -> float | None:
    if any(a.get(key) is None for key in ("latitude", "longitude")):
        return None
    if any(b.get(key) is None for key in ("latitude", "longitude")):
        return None
    lat1, lat2 = math.radians(float(a["latitude"])), math.radians(float(b["latitude"]))
    dlat = lat2 - lat1
    dlon = math.radians(float(b["longitude"]) - float(a["longitude"]))
    h = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    return 6_371_000 * 2 * math.asin(min(1, math.sqrt(h)))


def declared_id(candidate: dict[str, Any], provider: str) -> str | None:
    for check in candidate.get("source_checks", []):
        if check.get("source", "").casefold() == provider.casefold() and check.get("source_id"):
            return str(check["source_id"])
    return None


def compare_one(candidate: dict[str, Any], provider: str,
                records: list[dict[str, Any]], *, max_distance_m: float,
                source_scope: str | None = None) -> dict[str, Any]:
    if not records:
        return {"source":provider,"status":"not_checked","matches":[],
                "rationale":"No normalized source export supplied."}
    wanted_id = declared_id(candidate, provider)
    if wanted_id:
        exact_ids = [row for row in records if str(row.get("id")) == wanted_id]
        if len(exact_ids) == 1:
            return {"source":provider,"status":"matched","method":"exact_source_id",
                    "matches":[_summary(row, None) for row in exact_ids],
                    "rationale":"Stable source identity agrees."}
        if len(exact_ids) > 1:
            return {"source":provider,"status":"ambiguous","method":"duplicate_source_id",
                    "matches":[_summary(row, None) for row in exact_ids],
                    "rationale":"The export contains more than one record for this source ID."}

    candidate_names = name_set(candidate)
    if not candidate_names:
        return {"source":provider,"status":"unmatched","matches":[],
                "rationale":"Candidate has no usable name for identity matching."}
    locality = normalize(candidate.get("locality"))
    ranked = []
    for row in records:
        shared_names = candidate_names.intersection(name_set(row))
        if not shared_names:
            continue
        candidate_family = FAMILY_BY_TYPE.get(normalize(candidate.get("category"))) or FAMILY_BY_TYPE.get(normalize(candidate.get("subcategory")))
        source_family = FAMILY_BY_TYPE.get(normalize(row.get("canonical_category"))) or FAMILY_BY_TYPE.get(normalize(row.get("feature_type"))) or FAMILY_BY_TYPE.get(normalize(row.get("category")))
        if candidate_family and source_family and candidate_family != source_family:
            continue
        row_locality = normalize(row.get("locality"))
        if locality and row_locality and locality != row_locality:
            continue
        distance = meters(candidate, row)
        if distance is not None and distance > max_distance_m:
            continue
        ranked.append((distance, row, sorted(shared_names)))

    if not ranked:
        return {"source":provider,"status":"unmatched","matches":[],
                "rationale":"No exact or alternate-name match passed locality and distance checks."}
    if len(ranked) == 1 and ranked[0][0] is None and not (
        locality and normalize(ranked[0][1].get("locality")) == locality
    ) and not (
        source_scope and normalize(candidate.get("destination_scope")) == normalize(source_scope)
    ):
        distance, row, shared = ranked[0]
        return {"source":provider,"status":"ambiguous","method":"name_only",
                "matches":[_summary(row,distance)],"shared_names":shared,
                "rationale":"Name agrees, but neither coordinates nor a matching locality confirms identity."}
    ranked.sort(key=lambda item:(item[0] if item[0] is not None else float("inf"),str(item[1].get("id", ""))))
    if len(ranked) > 1:
        first, second = ranked[:2]
        if first[0] is None and second[0] is None:
            ambiguous = True
        else:
            d1 = first[0] if first[0] is not None else float("inf")
            d2 = second[0] if second[0] is not None else float("inf")
            ambiguous = abs(d2-d1) <= 25
        if ambiguous:
            return {"source":provider,"status":"ambiguous","method":"name_locality_distance",
                    "matches":[_summary(row,distance) for distance,row,_ in ranked],
                    "rationale":"Multiple same-name records remain too close to choose safely."}
    distance, row, shared = ranked[0]
    if distance is not None:
        method = "exact_or_alternate_name_locality_distance"
    elif locality and normalize(row.get("locality")) == locality:
        method = "exact_or_alternate_name_locality"
    else:
        method = "exact_name_scoped_unique"
    return {"source":provider,"status":"matched","method":method,
            "matches":[_summary(row,distance)],"shared_names":shared,
            "rationale":"Name agrees; available locality and coordinate checks passed."}


def _summary(row: dict[str, Any], distance: float | None) -> dict[str, Any]:
    return {"source_id":row.get("id"),"name":row.get("name"),
            "feature_type":row.get("feature_type"),"locality":row.get("locality"),
            "latitude":row.get("latitude"),"longitude":row.get("longitude"),
            "distance_m":round(distance,1) if distance is not None else None,
            "url":row.get("url"),"geometry":row.get("geometry"),
            "administrative_path":row.get("administrative_path")}


def build_report(data: dict[str, Any]) -> dict[str, Any]:
    candidates = data.get("candidates")
    sources = data.get("sources")
    if not isinstance(candidates,list) or not isinstance(sources,dict):
        raise ValueError("Input must contain a candidates array and sources object")
    providers = ("overture","osm","geonames","wikidata","official","outdooractive","viator")
    decisions = []
    for candidate in candidates:
        content_kind = candidate.get("content_kind")
        checks = {}
        component_checks = {}
        for provider in providers:
            source_bundle = sources.get(provider, [])
            if isinstance(source_bundle, dict):
                source_records = source_bundle.get("records", [])
                source_scope = source_bundle.get("scope")
            else:
                source_records = source_bundle
                source_scope = None
            if provider == "overture" and content_kind == "route":
                checks[provider] = {"source":provider,"status":"not_applicable","matches":[],
                                    "rationale":"Overture Places points do not confirm full route identity or geometry."}
            else:
                checks[provider] = compare_one(candidate,provider,source_records,
                    max_distance_m=3000 if content_kind == "route" else 500,
                    source_scope=source_scope)
            component_checks[provider] = []
            for component in candidate.get("entity_components", []):
                component_kind = component.get("content_kind", "place")
                if provider == "overture" and component_kind == "route":
                    result = {"source":provider,"status":"not_applicable","matches":[],
                              "rationale":"Overture Places do not confirm route geometry."}
                else:
                    result = compare_one({**candidate, **component},provider,source_records,
                        max_distance_m=3000 if component_kind == "route" else 500,
                        source_scope=source_scope)
                component_checks[provider].append({"component_id":component.get("component_id"),
                    "name":component.get("name"),"result":result})
        decisions.append({"candidate_id":candidate.get("candidate_id"),
            "name":candidate.get("name"),"content_kind":content_kind,
            "verification_status":candidate.get("verification_status","unverified_candidate"),
            "source_checks":checks,"component_source_checks":component_checks})
    summary = {}
    for provider in providers:
        summary[provider] = dict(Counter(row["source_checks"][provider]["status"] for row in decisions))
    by_kind = defaultdict(lambda:defaultdict(Counter))
    for row in decisions:
        for provider, check in row["source_checks"].items():
            by_kind[row["content_kind"]][provider][check["status"]] += 1
    return {"schema_version":1,"mode":"read_only_source_comparison",
        "candidate_count":len(decisions),"source_summary":summary,
        "summary_by_content_kind":{kind:{provider:dict(counts) for provider,counts in checks.items()}
                                   for kind,checks in by_kind.items()},
        "decisions":decisions}


def main() -> int:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input",required=True,help="JSON editorial candidates and normalized source exports")
    parser.add_argument("--output",required=True,help="Separate JSON comparison report")
    args=parser.parse_args()
    report=build_report(json.loads(Path(args.input).read_text(encoding="utf-8")))
    Path(args.output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"candidate_count":report["candidate_count"],"sources":report["source_summary"]},ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
