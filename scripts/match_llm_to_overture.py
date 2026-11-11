#!/usr/bin/env python3
"""Match an editorial LLM city list to raw Overture Places records.

The LLM list owns selection and rank. Overture is used only for identity
confirmation and factual enrichment. Overture confidence is exported but is
never part of the matching score or acceptance decision.
"""

from __future__ import annotations

import argparse
import csv
import difflib
import io
import json
import math
import os
import re
import unicodedata
import urllib.request
from urllib.parse import urlparse
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


DEFAULT_RELEASE = "2026-09-23.1"
AUTO_THRESHOLD = 0.94
REVIEW_THRESHOLD = 0.80
AUTO_MARGIN = 0.04

CONTENT_KINDS = {"place", "route_experience", "area_experience", "timed_experience"}

GEOGRAPHIC_SUBTYPE_TERMS = {
    "beach", "botanical garden", "cave", "cliff", "forest", "garden",
    "lake", "lookout", "mountain", "natural pool", "nature reserve",
    "park", "peak", "peninsula", "trailhead", "viewpoint", "waterfall",
}


def infer_source_route(content_kind: str, subtype: str) -> str:
    """Choose the confirmation source from the experience shape, not match failure."""
    normalized_subtype = normalize(subtype)
    if content_kind == "route_experience":
        if "classified" in normalized_subtype or "hiking" in normalized_subtype or "hike" in normalized_subtype:
            return "osm_route_then_official"
        return "editorial_route_osm_optional"
    if content_kind == "area_experience":
        return "editorial_area_osm_geonames"
    if content_kind == "timed_experience":
        return "editorial_timed_anchor"
    if any(term in normalized_subtype for term in GEOGRAPHIC_SUBTYPE_TERMS):
        return "overture_and_osm_feature"
    return "overture_place"
EDITORIAL_SUBTYPE_KINDS = {
    "cycling route": "route_experience",
    "walking route": "route_experience",
    "hiking route": "route_experience",
    "scenic drive": "route_experience",
    "neighborhood evening": "area_experience",
    "neighbourhood evening": "area_experience",
    "neighborhood afternoon": "area_experience",
    "neighbourhood afternoon": "area_experience",
    "district evening": "area_experience",
    "sunset experience": "timed_experience",
    "night view": "timed_experience",
}

TOKEN_STOPWORDS = {
    "a", "al", "alla", "alle", "and", "at", "by", "da", "de", "del",
    "della", "delle", "di", "do", "du", "e", "il", "in", "la", "le",
    "of", "the", "via", "&",
}
CITY_SUFFIXES = {"milano", "milan"}
LEGAL_SUFFIXES = {"spa", "srl", "srls", "snc", "sas", "ltd", "inc"}
GENERIC_CORES = {
    "bar", "cafe", "garden", "galleria", "hotel", "market", "museum",
    "osteria", "park", "ristorante", "restaurant", "the club", "the garden",
}
GENERIC_EDGE_TOKENS = {
    "bar", "cafe", "caffe", "chiesa", "club", "osteria", "ristorante",
    "restaurant", "trattoria",
}

CATEGORY_TERMS = {
    "culture": {
        "amusement_and_recreation", "art_gallery", "arts_and_entertainment",
        "cathedral", "church", "cultural_center", "historical_landmark",
        "historic_site", "monument", "museum", "opera", "performing_arts",
        "place_of_worship", "planetarium", "religious_organization", "theatre",
        "tourist_attraction",
    },
    "food": {
        "bakery", "cafe", "coffee_shop", "dessert_shop", "food_court",
        "food_market", "ice_cream_shop", "market", "pastry_shop", "pizzeria",
        "restaurant",
    },
    "nature": {
        "beach", "botanical_garden", "garden", "lake", "nature_reserve",
        "geographic_entities", "historic_site", "park", "national_park", "scenic_point",
        "trail", "trailhead", "waterfront",
    },
    "nightlife": {
        "bar", "cocktail_bar", "concert_hall", "dance_club", "jazz_club",
        "live_music", "music_venue", "night_club", "nightclub", "pub",
        "wine_bar",
    },
}


def normalize(value: str | None) -> str:
    text = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", value or "")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.casefold().replace("&", " and ")
    return " ".join(re.findall(r"[a-z0-9]+", text))


def normalize_address(value: str | None) -> str:
    text = value or ""
    abbreviations = {
        r"\bp\.?\s*za\.?\b": "piazza",
        r"\bc\.?\s*so\.?\b": "corso",
        r"\bv\.?\s*le\.?\b": "viale",
        r"\bv\.?\s*lo\.?\b": "vicolo",
        r"\bpg\.?\b": "passeig",
        r"\bpl\.?\b": "placa",
        r"\bc\s*/\s*\b": "carrer ",
    }
    for pattern, replacement in abbreviations.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return normalize(text)


def relaxed(value: str | None) -> str:
    text = normalize(value)
    # Corporate suffixes may arrive punctuation-separated: S.L., S L, S.A.
    text = re.sub(r"(?:\s+s\s+l(?:\s+u)?|\s+s\s+a|\s+l\s+t\s+d)$", "", text)
    tokens = text.split()
    while tokens and tokens[-1] in CITY_SUFFIXES | LEGAL_SUFFIXES:
        tokens.pop()
    return " ".join(tokens)


def significant_tokens(value: str) -> set[str]:
    return {token for token in relaxed(value).split() if len(token) >= 3 and token not in TOKEN_STOPWORDS}


def infer_content_kind(name: str, subtype: str) -> str:
    """Backward-compatible fallback for legacy suggestion files.

    New city files should declare content_kind explicitly. The fallback is
    intentionally narrow so a real place such as a viewpoint is not silently
    reclassified as an editorial experience.
    """
    normalized_subtype = normalize(subtype)
    if normalized_subtype in EDITORIAL_SUBTYPE_KINDS:
        return EDITORIAL_SUBTYPE_KINDS[normalized_subtype]
    normalized_name = normalize(name)
    if re.search(r"\b(cycle path|walking route|countryside walk)\b", normalized_name):
        return "route_experience"
    if re.search(r"\b(evening|afternoon) in\b", normalized_name) or re.search(
        r"\b(evening|afternoon)$", normalized_name
    ):
        return "area_experience"
    if normalized_name.startswith("sunset at ") or normalized_name.startswith("night view from "):
        return "timed_experience"
    return "place"


def parse_suggestion(item: Any) -> dict[str, Any]:
    if isinstance(item, dict):
        name = str(item["name"])
        subtype = str(item.get("subtype") or "")
        content_kind = str(item.get("content_kind") or infer_content_kind(name, subtype))
        if content_kind not in CONTENT_KINDS:
            raise ValueError(f"Unsupported content_kind {content_kind!r} for {name!r}")
        audience_scores = item.get("audience_scores") or {}
        if not isinstance(audience_scores, dict):
            raise ValueError(f"audience_scores must be an object for {name!r}")
        young_traveller_score = item.get("young_traveller_score")
        if young_traveller_score is not None and not 0 <= float(young_traveller_score) <= 100:
            raise ValueError(f"young_traveller_score must be between 0 and 100 for {name!r}")
        inferred_route = infer_source_route(content_kind, subtype)
        source_route = str(item.get("source_route") or inferred_route)
        if inferred_route == "osm_route_then_official" or item.get("route_identity_required"):
            source_route = "osm_route_then_official"
        return {
            "name": name,
            "aliases": flatten(item.get("aliases")),
            "subtype": subtype,
            "subcategory": str(item.get("subcategory") or ""),
            "content_kind": content_kind,
            "description": str(item.get("description") or ""),
            "area_name": str(item.get("area_name") or ""),
            "recommended_time": str(item.get("recommended_time") or ""),
            "geometry_type": str(item.get("geometry_type") or ""),
            "young_traveller_score": young_traveller_score if young_traveller_score is not None else "",
            "audience_scores": json.dumps(audience_scores, ensure_ascii=False, separators=(",", ":")),
            "selection_reasons": flatten(item.get("selection_reasons")),
            "trip_styles": flatten(item.get("trip_styles")),
            "suitable_for": flatten(item.get("suitable_for")),
            "budget_level": str(item.get("budget_level") or ""),
            "typical_duration_minutes": item.get("typical_duration_minutes") or "",
            "seasonality": flatten(item.get("seasonality")),
            "source_route": source_route,
            "official_verification_required": bool(item.get("official_verification_required", False)) or source_route == "osm_route_then_official",
            "route_identity_required": source_route == "osm_route_then_official",
            "expected_route_ref": str(item.get("route_ref") or ""),
            "official_source_url": str(item.get("official_source_url") or ""),
            "official_status": str(item.get("official_status") or ""),
            "official_status_checked_at": str(item.get("official_status_checked_at") or ""),
        }
    name, aliases, subtype = item
    return {
        "name": str(name),
        "aliases": flatten(aliases),
        "subtype": str(subtype),
        "subcategory": "",
        "content_kind": infer_content_kind(str(name), str(subtype)),
        "description": "",
        "area_name": "",
        "recommended_time": "",
        "geometry_type": "",
        "young_traveller_score": "",
        "audience_scores": "{}",
        "selection_reasons": [],
        "trip_styles": [],
        "suitable_for": [],
        "budget_level": "",
        "typical_duration_minutes": "",
        "seasonality": [],
        "source_route": infer_source_route(infer_content_kind(str(name), str(subtype)), str(subtype)),
        "official_verification_required": False,
        "official_source_url": "",
        "route_identity_required": infer_source_route(infer_content_kind(str(name), str(subtype)), str(subtype)) == "osm_route_then_official",
        "expected_route_ref": "",
        "official_status": "",
        "official_status_checked_at": "",
    }


def sequence_score(left: str, right: str) -> float:
    return difflib.SequenceMatcher(None, left, right, autojunk=False).ratio()


def pair_score(left: str, right: str) -> float:
    a, b = normalize(left), normalize(right)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    ar, br = relaxed(a), relaxed(b)
    if ar and ar == br:
        return 0.96
    at, bt = significant_tokens(ar), significant_tokens(br)
    union = at | bt
    jaccard = len(at & bt) / len(union) if union else 0.0
    score = 0.58 * sequence_score(ar, br) + 0.42 * jaccard
    if at and bt and (at < bt or bt < at):
        extra = (at ^ bt)
        if extra and extra.issubset(GENERIC_EDGE_TOKENS):
            score = max(score, 0.95)
    shorter, longer = sorted((ar, br), key=len)
    if len(shorter) >= 8 and shorter in longer:
        score += 0.04
    return min(score, 0.959)


def flatten(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        return [str(item) for item in value.values() if item]
    result: list[str] = []
    for item in value:
        if isinstance(item, dict):
            result.extend(str(v) for v in item.values() if v)
        elif item:
            result.append(str(item))
    return result


def unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        key = normalize(value)
        if key and key not in seen:
            seen.add(key)
            result.append(value)
    return result


def overture_https_url(release: str, city: dict[str, Any]) -> str:
    """Find the raw Overture Places parquet partition intersecting the city."""
    try:
        import pyarrow.parquet as pq
    except ImportError as exc:  # pragma: no cover - environment guard
        raise SystemExit("Install scripts/requirements-import.txt before querying Overture") from exc

    url = f"https://stac.overturemaps.org/{release}/collections.parquet"
    with urllib.request.urlopen(url, timeout=90) as response:
        table = pq.read_table(io.BytesIO(response.read()), columns=["assets", "bbox"])
    lat, lon = float(city["latitude"]), float(city["longitude"])
    radius = float(city["match_radius_km"])
    lat_delta = radius / 111.0
    lon_delta = radius / (111.0 * math.cos(math.radians(lat)))
    west, east, south, north = lon - lon_delta, lon + lon_delta, lat - lat_delta, lat + lat_delta
    urls: list[str] = []
    for row in table.to_pylist():
        bbox = row["bbox"]
        if not (bbox["xmin"] < east and bbox["xmax"] > west and bbox["ymin"] < north and bbox["ymax"] > south):
            continue
        assets = row.get("assets") or {}
        aws = assets.get("aws") or {}
        href = aws.get("href") or ""
        if "/theme=places/type=place/" not in href:
            continue
        azure = (assets.get("azure") or {}).get("href")
        urls.append(azure or href)
    if len(urls) != 1:
        raise RuntimeError(f"Expected one Milan Places partition, found {len(urls)}")
    return urls[0]


def configure_httpfs(connection: Any, extension_path: str | None) -> None:
    if not extension_path:
        try:
            import duckdb_extension_httpfs

            packaged = (
                Path(duckdb_extension_httpfs.__file__).parent
                / "extensions"
                / "v1.3.2"
                / "httpfs.duckdb_extension"
            )
            if packaged.exists():
                extension_path = str(packaged)
        except ImportError:
            pass
    if extension_path:
        connection.execute(f"LOAD '{extension_path.replace(chr(39), chr(39) * 2)}'")
    else:
        connection.execute("INSTALL httpfs")
        connection.execute("LOAD httpfs")
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
    if proxy:
        connection.execute("SET http_proxy = ?", [proxy])


def read_raw_overture(city: dict[str, Any], release: str, extension_path: str | None = None) -> list[dict[str, Any]]:
    try:
        import duckdb
    except ImportError as exc:  # pragma: no cover - environment guard
        raise SystemExit("Install scripts/requirements-import.txt before querying Overture") from exc

    parquet_url = overture_https_url(release, city)
    connection = duckdb.connect()
    configure_httpfs(connection, extension_path)
    lat, lon, radius = float(city["latitude"]), float(city["longitude"]), float(city["match_radius_km"])
    lat_delta = radius / 111.0
    lon_delta = radius / (111.0 * math.cos(math.radians(lat)))
    query = f"""
      SELECT
        id,
        names.primary AS primary_name,
        map_values(names.common) AS common_names,
        list_transform(names.rules, item -> item.value) AS rule_names,
        brand.names.primary AS brand_name,
        websites,
        addresses[1].freeform AS address,
        addresses[1].locality AS locality,
        addresses[1].postcode AS postcode,
        operating_status,
        basic_category,
        taxonomy.primary AS taxonomy_primary,
        taxonomy.hierarchy AS taxonomy_hierarchy,
        taxonomy.alternates AS taxonomy_alternates,
        confidence,
        bbox.ymin AS latitude,
        bbox.xmin AS longitude,
        sqrt(
          power((bbox.ymin - {lat}) * 111.0, 2) +
          power((bbox.xmin - {lon}) * 111.0 * {math.cos(math.radians(lat))}, 2)
        ) AS distance_km
      FROM read_parquet(?)
      WHERE names.primary IS NOT NULL
        AND bbox.ymin BETWEEN ? AND ?
        AND bbox.xmin BETWEEN ? AND ?
        AND sqrt(
          power((bbox.ymin - {lat}) * 111.0, 2) +
          power((bbox.xmin - {lon}) * 111.0 * {math.cos(math.radians(lat))}, 2)
        ) <= ?
    """
    cursor = connection.execute(
        query,
        [parquet_url, lat - lat_delta, lat + lat_delta, lon - lon_delta, lon + lon_delta, radius],
    )
    columns = [description[0] for description in cursor.description]
    rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    connection.close()
    return rows


def read_destination_overture(
    suggestions: dict[str, Any], release: str, extension_path: str | None = None
) -> list[dict[str, Any]]:
    """Read bounded sub-areas for a broad destination and deduplicate places."""
    areas = suggestions.get("search_areas") or [suggestions["city"]]
    records_by_id: dict[str, dict[str, Any]] = {}
    for area in areas:
        search_area = {
            "latitude": area["latitude"],
            "longitude": area["longitude"],
            "match_radius_km": area["match_radius_km"],
        }
        for record in read_raw_overture(search_area, release, extension_path):
            record_id = str(record.get("id") or "")
            if not record_id:
                continue
            existing = records_by_id.get(record_id)
            if existing is None or float(record.get("distance_km") or 999999) < float(
                existing.get("distance_km") or 999999
            ):
                records_by_id[record_id] = record
    return list(records_by_id.values())


def read_overture_csv(path: Path) -> list[dict[str, Any]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))
    for row in rows:
        for key in ("common_names", "rule_names", "websites", "taxonomy_hierarchy", "taxonomy_alternates"):
            value = row.get(key)
            if value and value.startswith("["):
                try:
                    row[key] = json.loads(value)
                except json.JSONDecodeError:
                    pass
    return rows


def read_overture_parquet(path: Path) -> list[dict[str, Any]]:
    try:
        import pyarrow.parquet as pq
    except ImportError as exc:  # pragma: no cover - environment guard
        raise SystemExit("Install scripts/requirements-import.txt before reading Parquet") from exc
    return pq.read_table(path).to_pylist()


def write_overture_parquet(path: Path, records: list[dict[str, Any]]) -> None:
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ImportError as exc:  # pragma: no cover - environment guard
        raise SystemExit("Install scripts/requirements-import.txt before writing Parquet") from exc
    path.parent.mkdir(parents=True, exist_ok=True)
    pq.write_table(pa.Table.from_pylist(records), path, compression="zstd")


def record_names(record: dict[str, Any]) -> list[tuple[str, str]]:
    values: list[tuple[str, str]] = []
    if record.get("primary_name"):
        values.append(("primary", str(record["primary_name"])))
    values.extend(("alias", name) for name in flatten(record.get("common_names")))
    values.extend(("alias", name) for name in flatten(record.get("rule_names")))
    if record.get("brand_name"):
        values.append(("brand", str(record["brand_name"])))
    deduped: list[tuple[str, str]] = []
    seen: set[str] = set()
    for source, name in values:
        key = normalize(name)
        if key and key not in seen:
            seen.add(key)
            deduped.append((source, name))
    return deduped


def taxonomy_text(record: dict[str, Any]) -> str:
    parts = [record.get("basic_category"), record.get("taxonomy_primary")]
    parts.extend(flatten(record.get("taxonomy_hierarchy")))
    parts.extend(flatten(record.get("taxonomy_alternates")))
    return normalize(" ".join(str(part) for part in parts if part))


def category_compatible(category: str, record: dict[str, Any]) -> bool:
    # Compare entire taxonomy labels, not substrings: skate_park is not a park,
    # and a hotel named Beach Hotel is not a beach.
    labels = [record.get("basic_category"), record.get("taxonomy_primary")]
    labels.extend(flatten(record.get("taxonomy_hierarchy")))
    labels.extend(flatten(record.get("taxonomy_alternates")))
    actual = {normalize(str(label)) for label in labels if label}
    expected = {normalize(term) for term in CATEGORY_TERMS[category]}
    if actual & expected:
        return True
    # These service categories overlap. This is a compatibility signal, not
    # identity proof: a nearby hotel or restaurant still needs the name/location gates.
    overlap = {
        "food": {"bar", "pub", "wine bar", "cocktail bar", "beach bar"},
        "nightlife": {"restaurant", "mediterranean restaurant", "hotel", "resort", "beach bar"},
    }
    return bool(actual & overlap.get(category, set()))


def within_destination_bounds(record: dict[str, Any], bounds: dict[str, Any] | None) -> bool:
    """Optional destination footprint; extraction radius alone can cross borders/islands."""
    if not bounds:
        return True
    try:
        latitude, longitude = float(record["latitude"]), float(record["longitude"])
        return (float(bounds["min_latitude"]) <= latitude <= float(bounds["max_latitude"])
                and float(bounds["min_longitude"]) <= longitude <= float(bounds["max_longitude"]))
    except (KeyError, TypeError, ValueError):
        return False


def subtype_compatible(subtype: str, record: dict[str, Any], suggestion_name: str = "") -> bool:
    """Require evidence for geographic features; a business named after a beach isn't it."""
    name_tokens = normalize(suggestion_name).split()
    beach_name = bool(name_tokens and name_tokens[0] in {"cala", "platja", "playa", "plage"})
    if "beach" not in normalize(subtype).split() and not (normalize(subtype) == "nature" and beach_name):
        return True
    primary = normalize(str(record.get("taxonomy_primary") or record.get("basic_category") or ""))
    primary_terms = set(primary.split())
    record_name = normalize(str(record.get("primary_name") or ""))
    business_prefix = record_name.split()[:1] in (["bar"], ["hotel"], ["restaurant"], ["restaurante"])
    return bool(primary_terms & {"beach", "beaches"}) and not business_prefix


def locality_matches(record: dict[str, Any], expected: str | None) -> bool:
    actual = normalize(str(record.get("locality") or ""))
    wanted = normalize(expected or "")
    if not actual or not wanted:
        return False
    aliases = {wanted}
    if wanted == "milan":
        aliases.update({"milano", "mailand"})
    elif wanted == "milano":
        aliases.update({"milan", "mailand"})
    return actual in aliases


def address_match_score(expected: str | None, actual: str | None) -> float:
    wanted = normalize_address(expected)
    candidate = normalize_address(actual)
    if not wanted or not candidate:
        return 0.0
    if wanted == candidate or wanted in candidate or candidate in wanted:
        return 1.0
    wanted_tokens = set(wanted.split()) - {"via", "viale", "piazza", "piazzale", "corso"}
    candidate_tokens = set(candidate.split()) - {"via", "viale", "piazza", "piazzale", "corso"}
    if not wanted_tokens or not candidate_tokens:
        return 0.0
    return len(wanted_tokens & candidate_tokens) / len(wanted_tokens | candidate_tokens)


def location_evidence(record: dict[str, Any], hint: dict[str, Any], city: dict[str, Any]) -> dict[str, Any]:
    expected_locality = str(hint.get("locality") or city.get("name") or "")
    address_score = address_match_score(hint.get("address"), record.get("address"))
    expected_postcode = normalize(str(hint.get("postcode") or ""))
    actual_postcode = normalize(str(record.get("postcode") or ""))
    postcode_match = bool(expected_postcode and actual_postcode and expected_postcode == actual_postcode)
    coordinate_distance = None
    if hint.get("latitude") is not None and hint.get("longitude") is not None:
        coordinate_distance = geographic_distance_km(
            {"latitude": hint["latitude"], "longitude": hint["longitude"]}, record
        )
    coordinate_match = coordinate_distance is not None and coordinate_distance <= 0.25
    return {
        "address_score": address_score,
        "locality_hint_only": bool(hint.get("locality") and not any(hint.get(k) is not None and hint.get(k) != "" for k in ("address", "postcode", "latitude", "longitude"))),
        "postcode_match": postcode_match,
        "locality_match": locality_matches(record, expected_locality),
        "coordinate_distance_km": coordinate_distance,
        "coordinate_match": coordinate_match,
        # This only relaxes the location gate. The independent name threshold
        # still has to pass before a record can be accepted.
        "resolved": coordinate_match or address_score >= 0.65 or (
            postcode_match and locality_matches(record, expected_locality)
        ),
    }


def geographic_distance_km(left: dict[str, Any], right: dict[str, Any]) -> float:
    try:
        lat1, lon1 = math.radians(float(left["latitude"])), math.radians(float(left["longitude"]))
        lat2, lon2 = math.radians(float(right["latitude"])), math.radians(float(right["longitude"]))
    except (KeyError, TypeError, ValueError):
        return 999.0
    dlat, dlon = lat2 - lat1, lon2 - lon1
    value = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0 * 2 * math.asin(min(1.0, math.sqrt(value)))


def website_domain(record: dict[str, Any]) -> str:
    websites = flatten(record.get("websites"))
    if not websites:
        return ""
    return urlparse(websites[0]).netloc.casefold().removeprefix("www.")


def duplicate_candidate(left: dict[str, Any], right: dict[str, Any], category: str) -> bool:
    left_record, right_record = left["record"], right["record"]
    # Shared names, street text or organisation domains cannot establish that
    # distant pins represent one physical feature. Keep them as alternatives
    # for review rather than concealing contradictory geometry in a cluster.
    separation = geographic_distance_km(left_record, right_record)
    if separation > 0.25:
        return False
    left_name = str(left_record.get("primary_name") or "")
    right_name = str(right_record.get("primary_name") or "")
    name_score = pair_score(left_name, right_name)
    left_address = normalize_address(left_record.get("address"))
    right_address = normalize_address(right_record.get("address"))
    address_score = address_match_score(left_record.get("address"), right_record.get("address"))
    strong_suggestion_identity = min(left["score"], right["score"]) >= 0.94
    if left_address and right_address and left_address == right_address and (name_score >= 0.94 or strong_suggestion_identity):
        return True
    if name_score < 0.94 and not strong_suggestion_identity:
        return False
    if name_score >= 0.94 and separation <= 0.08:
        return True
    if category == "nature" and strong_suggestion_identity and separation <= 3.0:
        return True
    left_domain, right_domain = website_domain(left_record), website_domain(right_record)
    if left_domain and left_domain == right_domain and (separation <= 0.25 or address_score >= 0.65):
        return True
    if name_score >= 0.94 and address_score >= 0.65:
        return True
    return False


def cluster_candidates(entries: list[dict[str, Any]], category: str) -> list[list[dict[str, Any]]]:
    clusters: list[list[dict[str, Any]]] = []
    for entry in entries:
        for cluster in clusters:
            if any(duplicate_candidate(entry, member, category) for member in cluster):
                cluster.append(entry)
                break
        else:
            clusters.append([entry])
    return clusters


def build_index(records: list[dict[str, Any]]) -> tuple[dict[str, set[int]], dict[str, set[int]], list[list[tuple[str, str]]]]:
    exact: dict[str, set[int]] = defaultdict(set)
    tokens: dict[str, set[int]] = defaultdict(set)
    names_by_record: list[list[tuple[str, str]]] = []
    for index, record in enumerate(records):
        names = record_names(record)
        names_by_record.append(names)
        for _, name in names:
            exact[normalize(name)].add(index)
            exact[relaxed(name)].add(index)
            for token in significant_tokens(name):
                tokens[token].add(index)
    return exact, tokens, names_by_record


def score_record(suggestion_names: list[str], record: dict[str, Any], record_name_list: list[tuple[str, str]]) -> dict[str, Any]:
    best = {"score": 0.0, "suggestion_name": "", "record_name": "", "name_source": ""}
    for suggestion_index, suggestion_name in enumerate(suggestion_names):
        for name_source, record_name in record_name_list:
            score = pair_score(suggestion_name, record_name)
            if suggestion_index > 0:
                alias_core = relaxed(suggestion_name)
                if len(significant_tokens(alias_core)) <= 1 and len(alias_core) <= 5:
                    score = min(score, 0.86)
                else:
                    score = min(score, 0.985)
            if score > best["score"]:
                best = {
                    "score": score,
                    "suggestion_name": suggestion_name,
                    "suggestion_name_source": "primary" if suggestion_index == 0 else "alias",
                    "record_name": record_name,
                    "name_source": name_source,
                }
    primary_score = max((pair_score(name, str(record.get("primary_name") or "")) for name in suggestion_names), default=0.0)
    best["primary_score"] = primary_score
    return best


def match_suggestions(suggestions: dict[str, Any], records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    exact, token_index, names_by_record = build_index(records)
    results: list[dict[str, Any]] = []
    city = suggestions.get("city") or {}
    location_hints = suggestions.get("location_hints") or {}
    editorial_anchors = suggestions.get("editorial_anchors") or {}
    selection_limits = suggestions.get("selection_limits") or {}
    destination_bounds = suggestions.get("destination_bounds")
    if suggestions.get("taxonomy_version"):
        from catalogue_taxonomy import validate_plan_taxonomy
        validate_plan_taxonomy(suggestions)
    for category, category_items in suggestions["categories"].items():
        rank_offset = int((suggestions.get("rank_offsets") or {}).get(category, 0))
        selection_limit = int(selection_limits.get(category, 40))
        for local_rank, item in enumerate(category_items, 1):
            rank = rank_offset + local_rank
            metadata = parse_suggestion(item)
            name = metadata["name"]
            aliases = metadata["aliases"]
            subtype = metadata["subtype"]
            content_kind = metadata["content_kind"]
            hint = ((location_hints.get(category) or {}).get(name) or {})
            anchor = editorial_anchors.get(name) or {}
            common_row: dict[str, Any] = {
                "city_slug": city.get("slug", ""),
                "city_name": city.get("name", ""),
                "country": city.get("country", ""),
                "category": category,
                "rank": rank,
                "proposed": local_rank <= selection_limit,
                "llm_name": name,
                "display_name": name,
                "llm_aliases": " | ".join(aliases),
                "llm_subtype": subtype,
                "llm_subcategory": metadata.get("subcategory") or "",
                "content_kind": content_kind,
                "experience_description": metadata["description"],
                "area_name": metadata["area_name"],
                "recommended_time": metadata["recommended_time"],
                "geometry_type": metadata["geometry_type"],
                "latitude": anchor.get("latitude", ""),
                "longitude": anchor.get("longitude", ""),
                "editorial_anchor_name": anchor.get("anchor_name", ""),
                "editorial_anchor_precision": anchor.get("precision", ""),
                # Catalogue membership is general. The score below is an optional
                # beachhead-market relevance overlay, never an inclusion gate.
                "target_audience": "general",
                "young_traveller_score": metadata["young_traveller_score"],
                "audience_scores": metadata["audience_scores"],
                "selection_reasons": " | ".join(metadata["selection_reasons"]),
                "trip_styles": " | ".join(metadata["trip_styles"]),
                "suitable_for": " | ".join(metadata["suitable_for"]),
                "budget_level": metadata["budget_level"],
                "typical_duration_minutes": metadata["typical_duration_minutes"],
                "seasonality": " | ".join(metadata["seasonality"]),
                "match_strategy": metadata["source_route"],
                "official_verification_required": metadata["official_verification_required"],
                "official_source_url": metadata["official_source_url"],
                "official_status": metadata["official_status"],
                "official_status_checked_at": metadata["official_status_checked_at"],
                "route_identity_required": metadata["route_identity_required"],
                "expected_route_ref": metadata["expected_route_ref"],
                "expected_locality": hint.get("locality", ""),
                "expected_neighbourhood": hint.get("neighbourhood", ""),
                "expected_address": hint.get("address", ""),
                "expected_postcode": hint.get("postcode", ""),
            }
            if content_kind != "place":
                results.append({
                    **common_row,
                    "match_status": "editorial_only",
                    "match_score": "",
                    "second_score": "",
                    "score_margin": "",
                    "risk_flags": "",
                    "geometry_status": "editorial_anchor" if anchor.get("latitude") is not None else "needs_geometry",
                    "overture_id": "",
                    "candidate_overture_id": "",
                })
                continue
            query_names = unique([name, *aliases])
            # Destination suffixes describe location, not a different identity.
            destination_tokens = normalize(str(city.get("name") or "")).split()
            if destination_tokens:
                for query_name in list(query_names):
                    words = normalize(query_name).split()
                    if words[-len(destination_tokens):] == destination_tokens and len(words) > len(destination_tokens):
                        query_names.append(" ".join(words[:-len(destination_tokens)]))
            candidate_ids: set[int] = set()
            for query_name in query_names:
                candidate_ids.update(exact.get(normalize(query_name), set()))
                candidate_ids.update(exact.get(relaxed(query_name), set()))
                for token in significant_tokens(query_name):
                    candidate_ids.update(token_index.get(token, set()))
            scored: list[dict[str, Any]] = []
            for record_index in candidate_ids:
                record = records[record_index]
                rejected_ids = (suggestions.get("rejected_candidate_ids") or {}).get(f"{category}:{name}", [])
                if str(record.get("id") or "") in rejected_ids:
                    continue
                evidence = score_record(query_names, record, names_by_record[record_index])
                if evidence["score"] >= REVIEW_THRESHOLD - 0.10:
                    scored.append({
                        "score": evidence["score"],
                        "record_index": record_index,
                        "record": record,
                        "evidence": evidence,
                        "compatible": category_compatible(category, record),
                        "inside_destination": within_destination_bounds(record, destination_bounds),
                        "subtype_compatible": subtype_compatible(subtype, record, name),
                        "location": location_evidence(record, hint, city),
                    })

            has_resolved_location = bool(hint and any(entry["location"]["resolved"] for entry in scored))

            def candidate_key(entry: dict[str, Any]) -> tuple[Any, ...]:
                location = entry["location"]
                common = (
                    -int(entry["inside_destination"]),
                    -int(entry["subtype_compatible"]),
                    -entry["score"],
                    -int(location["locality_match"]),
                    -int(bool(entry["record"].get("address"))),
                    -int(entry["compatible"]),
                    -int(entry["evidence"]["name_source"] == "primary"),
                    float(entry["record"].get("distance_km") or 999),
                )
                if has_resolved_location:
                    coordinate_distance = location["coordinate_distance_km"]
                    return (
                        -int(entry["inside_destination"]),
                        -int(entry["subtype_compatible"]),
                        -int(location["resolved"]),
                        -int(location["coordinate_match"]),
                        coordinate_distance if coordinate_distance is not None else 999.0,
                        -entry["score"],
                        -location["address_score"],
                        -int(location["postcode_match"]),
                        -int(entry["evidence"]["name_source"] == "primary"),
                        -entry["evidence"]["primary_score"],
                        *common,
                    )
                return common

            clusters = cluster_candidates(scored, category)
            ranked_clusters: list[dict[str, Any]] = []
            for cluster in clusters:
                representative = sorted(cluster, key=candidate_key)[0]
                ranked_clusters.append({
                    "representative": representative,
                    "score": representative["score"],
                    "size": len(cluster),
                    "ids": [str(entry["record"].get("id") or "") for entry in cluster],
                })
            ranked_clusters.sort(key=lambda cluster: candidate_key(cluster["representative"]))
            best_cluster = ranked_clusters[0] if ranked_clusters else None
            second_cluster = ranked_clusters[1] if len(ranked_clusters) > 1 else None
            best = best_cluster["representative"] if best_cluster else None
            second_score = second_cluster["score"] if second_cluster else 0.0
            row: dict[str, Any] = {
                **common_row,
                "match_status": "unmatched",
                "match_score": round(best["score"], 4) if best else 0.0,
                "second_score": round(second_score, 4),
                "score_margin": round(best["score"] - second_score, 4) if best else 0.0,
                "risk_flags": "",
                "geometry_status": "from_overture" if best else "needs_location",
                "retrieved_candidate_count": len(scored),
                "candidate_alternatives_truncated": len(scored) > 30,
                "candidate_alternatives": json.dumps([
                    {"id": entry["record"].get("id"), "name": entry["record"].get("primary_name"),
                     "score": round(entry["score"], 4), "latitude": entry["record"].get("latitude"),
                     "longitude": entry["record"].get("longitude"), "locality": entry["record"].get("locality"),
                     "type": entry["record"].get("taxonomy_primary"), "inside_destination": entry["inside_destination"],
                     "location_resolved": entry["location"]["resolved"]}
                    for entry in sorted(scored, key=candidate_key)[:30]
                ], ensure_ascii=False),
            }
            if best:
                score = best["score"]
                evidence = best["evidence"]
                record = best["record"]
                compatible = best["compatible"]
                location = best["location"]
                flags: list[str] = []
                core = relaxed(name)
                if core in GENERIC_CORES or len(significant_tokens(core)) == 0:
                    flags.append("generic_name")
                if evidence["name_source"] != "primary" and evidence["primary_score"] < AUTO_THRESHOLD:
                    flags.append("alias_primary_conflict")
                if not compatible:
                    flags.append("category_conflict")
                    if category == "nature":
                        flags.append("nature_feature_type_conflict")
                if not best["inside_destination"]:
                    flags.append("outside_destination")
                if not best["subtype_compatible"]:
                    flags.append("subtype_conflict")
                primary_type = normalize(str(record.get("taxonomy_primary") or record.get("basic_category") or ""))
                if primary_type in {"hotel", "resort", "vacation rental", "holiday rental"} and category != "nightlife":
                    flags.append("accommodation_identity_review")
                if "beach" in normalize(subtype).split() or (
                    normalize(subtype) == "nature" and normalize(name).split()[:1] in
                    (["cala"], ["platja"], ["playa"], ["plage"])
                ):
                    if not location["coordinate_match"]:
                        flags.append("beach_location_unverified")
                location_resolves_tie = bool(
                    hint
                    and location["resolved"]
                    and second_cluster
                    and not second_cluster["representative"]["location"]["resolved"]
                )
                category_resolves_tie = bool(
                    best["compatible"]
                    and second_cluster
                    and not second_cluster["representative"]["compatible"]
                )
                locality_resolves_tie = bool(
                    second_cluster
                    and location["locality_match"]
                    and not second_cluster["representative"]["location"]["locality_match"]
                )
                completeness_resolves_tie = bool(
                    second_cluster
                    and normalize(record.get("primary_name"))
                    == normalize(second_cluster["representative"]["record"].get("primary_name"))
                    and bool(record.get("address"))
                    and not bool(second_cluster["representative"]["record"].get("address"))
                )
                tie_resolved = (
                    location_resolves_tie
                    or category_resolves_tie
                    or locality_resolves_tie
                    or completeness_resolves_tie
                )
                if (
                    score >= REVIEW_THRESHOLD
                    and second_score
                    and score - second_score < AUTO_MARGIN
                    and not tie_resolved
                    and not (hint and not location["resolved"])
                ):
                    flags.append("near_tie")
                if hint and not location["resolved"] and not location["locality_hint_only"]:
                    flags.append("location_mismatch")
                if str(record.get("operating_status") or "").casefold() in {"closed", "permanently_closed"}:
                    flags.append("closed")
                auto_blockers = {"generic_name", "alias_primary_conflict", "near_tie", "location_mismatch", "closed", "outside_destination", "subtype_conflict", "accommodation_identity_review", "nature_feature_type_conflict"}
                if hint and location["resolved"]:
                    auto_blockers.discard("generic_name")
                effective_margin_ok = score - second_score >= AUTO_MARGIN or tie_resolved
                verified_location_threshold = REVIEW_THRESHOLD if hint and location["resolved"] else AUTO_THRESHOLD
                if score >= verified_location_threshold and effective_margin_ok and not auto_blockers.intersection(flags):
                    status = "auto_match"
                elif score >= REVIEW_THRESHOLD and not (hint and not location["resolved"] and not location["locality_hint_only"]) and best["inside_destination"]:
                    status = "review"
                else:
                    status = "unmatched"
                row.update({
                    "match_status": status,
                    "geometry_status": "from_overture" if status != "unmatched" else "needs_location",
                    "risk_flags": " | ".join(flags),
                    "matched_name": record.get("primary_name") or "",
                    "matched_via": evidence["record_name"],
                    "matched_name_source": evidence["name_source"],
                    "overture_id": (record.get("id") or "") if status != "unmatched" else "",
                    "candidate_overture_id": record.get("id") or "",
                    "latitude": record.get("latitude") or "",
                    "longitude": record.get("longitude") or "",
                    "distance_km": round(float(record.get("distance_km") or 0), 3),
                    "address": record.get("address") or "",
                    "locality": record.get("locality") or "",
                    "postcode": record.get("postcode") or "",
                    "website": (flatten(record.get("websites")) or [""])[0],
                    "operating_status": record.get("operating_status") or "",
                    "overture_confidence": record.get("confidence") or "",
                    "basic_category": record.get("basic_category") or "",
                    "taxonomy_primary": record.get("taxonomy_primary") or "",
                    "taxonomy_hierarchy": " | ".join(flatten(record.get("taxonomy_hierarchy"))),
                    "taxonomy_alternates": " | ".join(flatten(record.get("taxonomy_alternates"))),
                    "category_compatible": compatible,
                    "location_hint_match": round(location["address_score"], 4),
                    "location_hint_distance_km": (
                        round(location["coordinate_distance_km"], 3)
                        if location["coordinate_distance_km"] is not None else ""
                    ),
                    "duplicate_cluster_size": best_cluster["size"] if best_cluster else 0,
                    "duplicate_cluster_ids": " | ".join(best_cluster["ids"]) if best_cluster else "",
                    "independent_candidate_clusters": len(ranked_clusters),
                })
            results.append(row)

    assignments: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in results:
        if row.get("overture_id") and row["match_status"] != "unmatched":
            assignments[str(row["overture_id"])].append(row)
    for rows in assignments.values():
        if len(rows) > 1:
            for row in rows:
                flags = [flag for flag in str(row.get("risk_flags") or "").split(" | ") if flag]
                if "duplicate_assignment" not in flags:
                    flags.append("duplicate_assignment")
                row["risk_flags"] = " | ".join(flags)
                row["match_status"] = "review"
    return results


def summarize(results: list[dict[str, Any]], raw_count: int, release: str) -> dict[str, Any]:
    proposed = [row for row in results if row["proposed"]]
    by_category: dict[str, Any] = {}
    for category in sorted({row["category"] for row in proposed}):
        rows = [row for row in proposed if row["category"] == category]
        statuses = Counter(row["match_status"] for row in rows)
        flags = Counter(
            flag
            for row in rows
            for flag in str(row.get("risk_flags") or "").split(" | ")
            if flag
        )
        by_category[category] = {
            "suggestions": len(rows),
            "auto_match": statuses["auto_match"],
            "review": statuses["review"],
            "unmatched": statuses["unmatched"],
            "editorial_only": statuses["editorial_only"],
            "retained_catalogue_rate": round(
                (statuses["auto_match"] + statuses["review"] + statuses["editorial_only"]) / len(rows), 4
            ),
            "risk_flags": dict(flags),
        }
    statuses = Counter(row["match_status"] for row in proposed)
    place_rows = [row for row in proposed if row.get("content_kind") == "place"]
    matched_or_reviewable_places = sum(row["match_status"] in {"auto_match", "review"} for row in place_rows)
    return {
        "overture_release": release,
        "raw_overture_records_in_radius": raw_count,
        "proposed_suggestions": len(proposed),
        "auto_match": statuses["auto_match"],
        "review": statuses["review"],
        "unmatched": statuses["unmatched"],
        "editorial_only": statuses["editorial_only"],
        "auto_match_rate": round(statuses["auto_match"] / len(proposed), 4),
        "place_matchable_suggestions": len(place_rows),
        "confirmed_or_reviewable_place_rate": round(
            matched_or_reviewable_places / len(place_rows), 4
        ) if place_rows else 0.0,
        "retained_catalogue_rate": round(
            (statuses["auto_match"] + statuses["review"] + statuses["editorial_only"]) / len(proposed), 4
        ),
        "thresholds": {
            "auto_match": AUTO_THRESHOLD,
            "review": REVIEW_THRESHOLD,
            "minimum_auto_margin": AUTO_MARGIN,
        },
        "important": "These are coverage and workflow metrics, not measured precision. Precision requires human labels for a review sample.",
        "categories": by_category,
    }


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    columns = list(dict.fromkeys(key for row in rows for key in row))
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--suggestions", type=Path, required=True)
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--overture-csv", type=Path)
    source.add_argument("--overture-parquet", type=Path)
    source.add_argument(
        "--no-source-data",
        action="store_true",
        help="Validate and route suggestions without downloading Overture or accepting place matches",
    )
    parser.add_argument("--release", default=DEFAULT_RELEASE)
    parser.add_argument("--human-feedback-json", type=Path, help="Exclude user-rejected exact record IDs while still retrieving alternatives")
    parser.add_argument("--httpfs-extension", help="Local httpfs extension for restricted environments")
    parser.add_argument("--raw-cache-output", type=Path, help="Cache the raw city slice as Parquet")
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    suggestions = json.loads(args.suggestions.read_text(encoding="utf-8"))
    if args.human_feedback_json:
        feedback = json.loads(args.human_feedback_json.read_text(encoding="utf-8"))
        slug = suggestions["city"]["slug"]
        rejected = suggestions.setdefault("rejected_candidate_ids", {})
        for decision in feedback:
            if decision["stable_key"].startswith(slug+":") and decision["decision"] == "Keep unmatched":
                _, category, name = decision["stable_key"].split(":", 2)
                rejected.setdefault(f"{category}:{name}", []).append(decision["record_id"])
    if args.no_source_data:
        records = []
    elif args.overture_csv:
        records = read_overture_csv(args.overture_csv)
    elif args.overture_parquet:
        records = read_overture_parquet(args.overture_parquet)
    else:
        records = read_destination_overture(suggestions, args.release, args.httpfs_extension)
        if args.raw_cache_output:
            write_overture_parquet(args.raw_cache_output, records)
    results = match_suggestions(suggestions, records)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    prefix = str(suggestions.get("city", {}).get("slug") or "destination").replace("-", "_")
    write_csv(args.output_dir / f"{prefix}_llm_overture_matches.csv", results)
    write_csv(args.output_dir / f"{prefix}_llm_proposed_catalogue.csv", [row for row in results if row["proposed"]])
    summary = summarize(results, len(records), args.release)
    (args.output_dir / f"{prefix}_llm_overture_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
