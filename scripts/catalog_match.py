"""Conservative matching helpers for catalogue candidates from multiple sources.

OSM geometries are grouped only when their element identity is the same, or
when name, compatible feature type, and a very small distance all agree. A
nearby feature alone is never enough to collapse distinct attractions.
"""

from __future__ import annotations

import math
import re
import unicodedata
from collections import defaultdict
from typing import Any, Iterable


TYPE_FAMILIES = {
    "museum": "culture", "gallery": "culture", "historic": "culture",
    "attraction": "culture", "castle": "culture", "archaeological_site": "culture",
    "theatre": "culture", "arts_centre": "culture",
    "monument": "culture", "place_of_worship": "culture", "theatre": "culture",
    "park": "nature", "garden": "nature", "viewpoint": "nature",
    "peak": "nature", "waterfall": "nature",
    "beach": "nature", "trail": "nature", "nature_reserve": "nature",
    "restaurant": "food", "cafe": "food", "marketplace": "food", "bakery": "food", "bar": "nightlife",
    "pub": "nightlife",
    "nightclub": "nightlife", "music_venue": "nightlife",
}


def normalize_name(value: str | None) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return " ".join(re.findall(r"[a-z0-9]+", value.casefold()))


def names(record: dict[str, Any]) -> set[str]:
    values = [record.get("name"), *(record.get("alt_names") or []),
              *(record.get("aliases") or [])]
    return {n for value in values if (n := normalize_name(str(value)))}


def distance_m(a: dict[str, Any], b: dict[str, Any]) -> float:
    lat1, lat2 = math.radians(float(a["latitude"])), math.radians(float(b["latitude"]))
    dlat = lat2 - lat1
    dlon = math.radians(float(b["longitude"]) - float(a["longitude"]))
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6_371_000 * 2 * math.asin(min(1, math.sqrt(h)))


def type_family(record: dict[str, Any]) -> str | None:
    return TYPE_FAMILIES.get(str(record.get("feature_type", "")).casefold())


def _osm_identity(record: dict[str, Any]) -> tuple[str, str] | None:
    source_id = record.get("source_id") or record.get("osm_id")
    element_type = record.get("element_type") or record.get("osm_type")
    if source_id and element_type:
        return str(element_type).casefold(), str(source_id)
    return None


def group_osm_features(records: Iterable[dict[str, Any]], *, alias_distance_m: float = 20) -> list[list[dict[str, Any]]]:
    """Group duplicate OSM geometry rows without proximity-only merging.

    A shared OSM element id is definitive. Separate OSM ids are grouped only
    for same-name, same-family features within 20m (e.g. node and polygon
    representations). Distinct named features remain separate even if adjacent.
    """
    groups: list[list[dict[str, Any]]] = []
    by_identity: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        identity = _osm_identity(record)
        if identity:
            by_identity[identity].append(record)
        else:
            groups.append([record])
    groups.extend(by_identity.values())

    merged: list[list[dict[str, Any]]] = []
    for group in groups:
        record = group[0]
        target_names, target_family = names(record), type_family(record)
        compatible_index = next((i for i, existing in enumerate(merged)
            if target_names and target_names.intersection(names(existing[0]))
            and target_family and target_family == type_family(existing[0])
            and distance_m(record, existing[0]) <= alias_distance_m
            and _osm_identity(record) != _osm_identity(existing[0])), None)
        if compatible_index is None:
            merged.append(group)
        else:
            merged[compatible_index].extend(group)
    return merged


def match_candidate(candidate: dict[str, Any], overture: Iterable[dict[str, Any]], *,
                    max_distance_m: float = 150, ambiguity_margin: float = 0.08) -> dict[str, Any]:
    """Return best Overture identity or an explicit unmatched/ambiguous result.

    Stable source identity wins when supplied. Otherwise exact aliases, type
    compatibility, and geographic distance are scored. The function never
    selects between near-tied distinct Overture identities automatically.
    """
    rows = list(overture)
    # Never compare a generic source_id: on the candidate it may be an OSM ID.
    source_id = candidate.get("overture_id")
    if source_id:
        exact = [r for r in rows if str(r.get("source_id")) == str(source_id)]
        if len(exact) == 1:
            return {"status": "matched", "method": "exact_overture_id", "score": 1.0,
                    "record": exact[0], "alternatives": []}
        if len(exact) > 1:
            return {"status": "ambiguous", "method": "duplicate_overture_id", "score": 1.0,
                    "record": None, "alternatives": exact}

    candidate_names = names(candidate)
    ranked = []
    for row in rows:
        meters = distance_m(candidate, row)
        family_a, family_b = type_family(candidate), type_family(row)
        compatible = family_a is None or family_b is None or family_a == family_b
        same_name = bool(candidate_names.intersection(names(row)))
        if not compatible or meters > max_distance_m or not same_name:
            continue
        score = 0.70 + (0.20 * (1 - meters / max_distance_m)) + (0.10 if family_a and family_a == family_b else 0)
        ranked.append((score, row))
    ranked.sort(key=lambda pair: (-pair[0], str(pair[1].get("source_id", ""))))
    if not ranked:
        return {"status": "unmatched", "method": None, "score": 0.0,
                "record": None, "alternatives": []}
    if len(ranked) > 1 and ranked[0][0] - ranked[1][0] < ambiguity_margin:
        return {"status": "ambiguous", "method": "name_type_distance", "score": ranked[0][0],
                "record": None, "alternatives": [r for _, r in ranked]}
    return {"status": "matched", "method": "name_type_distance", "score": round(ranked[0][0], 4),
            "record": ranked[0][1], "alternatives": [r for _, r in ranked[1:]]}
