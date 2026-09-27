#!/usr/bin/env python3
"""Import high-confidence Overture places into the normalized catalogue.

The script reads only configured city bounding boxes, maps Overture's taxonomy
to Globethrotters' four categories, limits coverage per category, and upserts by
the stable Overture GERS ID. It can upload with server-side Supabase
credentials or emit SQL for review in Lovable Cloud's SQL editor.
"""

from __future__ import annotations

import argparse
import io
import json
import math
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

try:
    import duckdb
    import pyarrow.compute as pc
    import pyarrow.dataset as ds
    import pyarrow.fs as pafs
    import pyarrow.parquet as pq
except ImportError as exc:  # pragma: no cover - setup guard
    raise SystemExit("Install importer dependencies: python3 -m pip install -r scripts/requirements-import.txt") from exc


DEFAULT_RELEASE = None
PARQUET_URL = "s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*"
PILOT_CITIES = {
    "paris-fr": {
        "slug": "paris-fr", "name": "Paris", "country": "France",
        "latitude": 48.8566, "longitude": 2.3522, "search_radius_km": 25,
    },
    "lisbon-pt": {
        "slug": "lisbon-pt", "name": "Lisbon", "country": "Portugal",
        "latitude": 38.7223, "longitude": -9.1393, "search_radius_km": 25,
    },
}

CITY_ROW_PATTERN = re.compile(
    r"\('(?P<slug>[^']+)',\s*'(?P<name>[^']+)',\s*'(?P<country>[^']+)',\s*"
    r"'(?P<country_code>[A-Z]{2})',\s*(?P<latitude>-?[0-9.]+),\s*"
    r"(?P<longitude>-?[0-9.]+),\s*(?P<market_rank>[0-9]+),\s*"
    r"(?P<search_radius_km>[0-9]+),\s*(?P<is_launch_city>true|false)\)"
)

STAC_FILE_CACHE: dict[str, list[dict[str, Any]]] = {}

CATEGORY_SUBTYPE_PRIORITY = {
    "culture": {
        "historic_site": 0, "museum": 0, "art_museum": 0,
        "art_gallery": 0, "christian_place_of_worship": 0,
        "roman_catholic_place_of_worship": 0, "music_venue": 0,
        "theatre_venue": 0, "monument": 1, "cultural_center": 2,
    },
    "food": {
        "food_market": 0, "restaurant": 1, "bakery": 2, "cafe": 2,
    },
    "nature": {
        "nature_reserve": 0, "botanical_garden": 0, "garden": 1,
        "beach": 1, "hiking_trail": 1, "trailhead": 2, "park": 2,
    },
    "nightlife": {
        "live_music_venue": 0, "concert_hall": 0, "nightclub": 1, "bar": 2,
    },
}

CATEGORY_RADIUS_CAP_KM = {
    "food": 15.0,
    "culture": 25.0,
    "nature": 20.0,
    "nightlife": 15.0,
}

COUNTRY_DEFAULT_LANGUAGE = {
    "AT": "de", "BE": "fr", "CH": "de", "CZ": "cs", "DE": "de",
    "DK": "da", "ES": "es", "FR": "fr", "GB": "en", "GR": "el",
    "HU": "hu", "IE": "en", "IS": "is", "IT": "it", "NL": "nl",
    "NO": "no", "PL": "pl", "PT": "pt", "SE": "sv", "TR": "tr",
}

# Editorial corrections for high-value records where Overture's primary name
# is untranslated or omits a widely used visitor-facing name. These are keyed
# by stable GERS ID, remain independently sourced Overture records, and are
# intentionally small and auditable.
CURATED_PLACE_OVERRIDES = {
    "3b8ece8c-380f-4a9f-aaf2-65fc39611c36": {
        "name": "Duomo di Milano",
        "aliases": ["Milan Cathedral", "Katedra w Mediolanie"],
    },
    "c5bb3981-1e23-4f62-988f-7382592b75d9": {
        "name": "Museo del Cenacolo Vinciano",
        "aliases": ["The Last Supper", "Cenacolo Vinciano"],
    },
    "50518fc3-4040-4473-8cf4-1431a6b852ad": {
        "name": "Pinacoteca di Brera",
        "aliases": ["Museo di Brera", "Brera Art Gallery"],
    },
    "d11a5f91-fec0-4229-867a-84f9aa301e0f": {
        "name": "Pinacoteca Ambrosiana",
        "aliases": ["Ambrosiana Art Gallery"],
    },
    "81802473-4350-4a51-91a0-657e42ed791f": {
        "name": "Teatro alla Scala",
        "aliases": ["La Scala", "La Scala Opera"],
    },
}

# These phrases are strong evidence that a feature classified as a park is
# actually vehicle infrastructure. Keep the list deliberately narrow so the
# importer does not silently make subjective editorial decisions.
NATURE_NAME_BLOCKLIST = (
    "car park", "parking lot", "parking garage", "parkhaus", "parcheggio",
    "parkeerplaats", "parkeergarage", "estacionamiento", "estacionamento",
)

# Globally standardized chains add little destination-specific value and can
# dominate dense-city food results. This is deliberately limited to obvious
# international chains; regional businesses remain eligible for review.
FOOD_CHAIN_PREFIX_BLOCKLIST = (
    "burger king", "domino s pizza", "five guys", "kfc", "mcdonald s", "mcdonalds",
    "pizza hut", "starbucks", "subway",
)


def get_latest_release() -> str:
    with urllib.request.urlopen("https://stac.overturemaps.org/catalog.json", timeout=30) as response:
        catalog = json.load(response)
    release = catalog.get("latest")
    if not release:
        raise RuntimeError("Overture STAC catalogue did not advertise a latest release")
    return str(release)


def get_stac_place_files(release: str) -> list[dict[str, Any]]:
    cached = STAC_FILE_CACHE.get(release)
    if cached is not None:
        return cached
    url = f"https://stac.overturemaps.org/{release}/collections.parquet"
    with urllib.request.urlopen(url, timeout=60) as response:
        table = pq.read_table(io.BytesIO(response.read()), columns=["assets", "bbox"])
    records: list[dict[str, Any]] = []
    for row in table.to_pylist():
        href = row.get("assets", {}).get("aws", {}).get("alternate", {}).get("s3", {}).get("href")
        if href and "/theme=places/type=place/" in href:
            records.append({"path": href.removeprefix("s3://"), "bbox": row["bbox"]})
    if not records:
        raise RuntimeError(f"No Overture Places files found in STAC release {release}")
    STAC_FILE_CACHE[release] = records
    return records


def get_stac_place_reader(release: str, bbox: tuple[float, float, float, float]):
    west, south, east, north = bbox
    paths = [record["path"] for record in get_stac_place_files(release)
             if record["bbox"]["xmin"] < east and record["bbox"]["xmax"] > west
             and record["bbox"]["ymin"] < north and record["bbox"]["ymax"] > south]
    if not paths:
        return None
    dataset = ds.dataset(paths, filesystem=pafs.S3FileSystem(anonymous=True, region="us-west-2"))
    bbox_filter = (
        (pc.field("bbox", "xmin") < east)
        & (pc.field("bbox", "xmax") > west)
        & (pc.field("bbox", "ymin") < north)
        & (pc.field("bbox", "ymax") > south)
    )
    return dataset.scanner(
        columns=["id", "names", "bbox", "basic_category", "taxonomy", "confidence"],
        filter=bbox_filter,
        use_threads=True,
    ).to_reader()


def api_request(method: str, path: str, body: Any | None = None) -> Any:
    base_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base_url or not service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    payload = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url}/rest/v1/{path}",
        data=payload,
        method=method,
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation,resolution=merge-duplicates",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            content = response.read()
            return json.loads(content) if content else None
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Supabase request failed ({exc.code}): {exc.read().decode('utf-8')}") from exc


def get_cities(slugs: list[str]) -> list[dict[str, Any]]:
    query = "catalog_cities?select=id,slug,name,country,country_code,latitude,longitude,search_radius_km&is_active=eq.true&order=market_rank.asc"
    if slugs:
        quoted = ",".join(f'"{slug}"' for slug in slugs)
        query += f"&slug=in.({urllib.parse.quote(quoted, safe=',\"')})"
    return api_request("GET", query)


def get_local_cities(slugs: list[str], seed_file: str) -> list[dict[str, Any]]:
    """Read the checked-in city registry so CI can generate SQL without DB keys."""
    with open(seed_file, encoding="utf-8") as source:
        matches = list(CITY_ROW_PATTERN.finditer(source.read()))
    cities = [{
        "slug": match["slug"],
        "name": match["name"],
        "country": match["country"],
        "country_code": match["country_code"],
        "latitude": float(match["latitude"]),
        "longitude": float(match["longitude"]),
        "market_rank": int(match["market_rank"]),
        "search_radius_km": int(match["search_radius_km"]),
        "is_launch_city": match["is_launch_city"] == "true",
    } for match in matches]
    if slugs:
        requested = set(slugs)
        cities = [city for city in cities if city["slug"] in requested]
        missing = sorted(requested - {city["slug"] for city in cities})
        if missing:
            raise RuntimeError(f"Unknown city slug(s): {', '.join(missing)}")
    return sorted(cities, key=lambda city: city["market_rank"])


def category_case() -> str:
    return """
      CASE
        WHEN list_contains(taxonomy.hierarchy, 'restaurant')
          OR basic_category IN ('restaurant', 'cafe', 'bakery', 'food_market') THEN 'food'
        WHEN list_contains(taxonomy.hierarchy, 'museum')
          OR list_contains(taxonomy.hierarchy, 'historic_site')
          OR list_contains(taxonomy.hierarchy, 'place_of_worship')
          OR list_contains(taxonomy.hierarchy, 'performing_arts_venue')
          OR basic_category IN (
            'museum', 'art_gallery', 'monument', 'cultural_center',
            'music_venue', 'theatre_venue'
          ) THEN 'culture'
        WHEN basic_category IN ('hiking_trail', 'trailhead')
          OR list_contains(taxonomy.hierarchy, 'hiking_trail') THEN 'nature'
        WHEN basic_category IN ('park', 'botanical_garden', 'garden', 'beach', 'nature_reserve') THEN 'nature'
        WHEN basic_category IN ('nightclub', 'bar', 'concert_hall', 'live_music_venue') THEN 'nightlife'
        ELSE NULL
      END
    """


def normalize_place_name(value: str) -> str:
    """Return a stable key for conservative within-city name deduplication."""
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return " ".join(re.sub(r"[^a-z0-9]+", " ", ascii_value.lower()).split())


def collect_place_names(primary: str, common: Any = None, rules: Any = None) -> list[str]:
    """Collect stable primary, localized and alternate names from Overture."""
    values: list[str] = [primary]
    if isinstance(common, dict):
        values.extend(value for value in common.values() if isinstance(value, str))
    if isinstance(rules, list):
        values.extend(
            rule.get("value") for rule in rules
            if isinstance(rule, dict) and isinstance(rule.get("value"), str)
        )
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        key = normalize_place_name(value)
        if key and key not in seen:
            seen.add(key)
            result.append(value)
    return result


def preferred_place_name(primary: str, common: Any, country_code: str | None) -> str:
    """Prefer a destination-language common name while retaining every alias."""
    language = COUNTRY_DEFAULT_LANGUAGE.get((country_code or "").upper())
    if language and isinstance(common, dict):
        localized = common.get(language)
        if isinstance(localized, str) and localized.strip():
            return localized.strip()
    return primary


def apply_curated_place_override(item: dict[str, Any]) -> dict[str, Any]:
    override = CURATED_PLACE_OVERRIDES.get(str(item["source_id"]))
    if not override:
        return item
    original_name = item["name"]
    item["name"] = override["name"]
    aliases = collect_place_names(
        item["name"],
        {"source": original_name},
        [{"value": alias} for alias in override["aliases"]],
    )
    item["metadata"]["alternate_names"] = aliases
    item["metadata"]["editorial_name_override"] = True
    return item


def quality_rejection_reason(item: dict[str, Any]) -> str | None:
    normalized = normalize_place_name(item["name"])
    if len(normalized) < 2:
        return "invalid_name"
    if item["canonical_category"] == "nature" and any(
        phrase in normalized for phrase in NATURE_NAME_BLOCKLIST
    ):
        return "nature_infrastructure"
    if item["canonical_category"] == "food" and any(
        normalized == chain or normalized.startswith(f"{chain} ")
        for chain in FOOD_CHAIN_PREFIX_BLOCKLIST
    ):
        return "global_food_chain"
    return None


def select_quality_candidates(
    candidates: list[dict[str, Any]],
    city_by_slug: dict[str, dict[str, Any]],
    limit_per_category: int,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Select a diverse coverage pool and return a machine-readable QA report."""
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = {}
    report: dict[str, Any] = {"cities": {}, "summary": {"selected": 0, "rejected": 0}}

    for candidate in candidates:
        city = city_by_slug[candidate["city_slug"]]
        latitude_scale = 111.0
        longitude_scale = 111.0 * max(0.2, math.cos(math.radians(float(city["latitude"]))))
        distance_km = math.sqrt(
            ((float(candidate["latitude"]) - float(city["latitude"])) * latitude_scale) ** 2
            + ((float(candidate["longitude"]) - float(city["longitude"])) * longitude_scale) ** 2
        )
        candidate["distance_to_center_km"] = round(distance_km, 2)
        key = (candidate["city_slug"], candidate["canonical_category"])
        grouped.setdefault(key, []).append(candidate)

    selected: list[dict[str, Any]] = []
    for (city_slug, category), items in grouped.items():
        subtype_priority = CATEGORY_SUBTYPE_PRIORITY.get(category, {})
        if category == "culture":
            # Balance proximity with confidence so iconic, well-established
            # landmarks are not displaced by every slightly nearer small POI.
            items.sort(key=lambda item: (
                0 if str(item["source_id"]) in CURATED_PLACE_OVERRIDES else 1,
                subtype_priority.get(item["subcategory"], 9),
                item["distance_to_center_km"]
                - max(0.0, float(item["source_confidence"]) - 0.8) * 8,
                item["distance_to_center_km"],
                normalize_place_name(item["name"]),
            ))
        else:
            items.sort(key=lambda item: (
                subtype_priority.get(item["subcategory"], 9),
                item["distance_to_center_km"],
                -float(item["source_confidence"]),
                normalize_place_name(item["name"]),
            ))
        city_report = report["cities"].setdefault(city_slug, {"categories": {}})
        category_report = {
            "available": len(items), "selected": 0, "target": limit_per_category,
            "rejected": {}, "selected_names": [],
        }
        city_report["categories"][category] = category_report
        seen_names: set[str] = set()
        for item in items:
            reason = quality_rejection_reason(item)
            city_radius = float(city_by_slug[city_slug].get("search_radius_km", 50))
            category_radius = min(city_radius, CATEGORY_RADIUS_CAP_KM.get(category, city_radius))
            if reason is None and item["distance_to_center_km"] > category_radius:
                reason = "outside_category_radius"
            name_keys = {
                normalize_place_name(value)
                for value in [item["name"], *item["metadata"].get("alternate_names", [])]
                if value
            }
            if reason is None and seen_names.intersection(name_keys):
                reason = "duplicate_name"
            if reason is not None:
                category_report["rejected"][reason] = category_report["rejected"].get(reason, 0) + 1
                report["summary"]["rejected"] += 1
                continue
            if category_report["selected"] >= limit_per_category:
                category_report["rejected"]["below_cutoff"] = category_report["rejected"].get("below_cutoff", 0) + 1
                report["summary"]["rejected"] += 1
                continue
            seen_names.update(name_keys)
            item["metadata"]["distance_to_center_km"] = item["distance_to_center_km"]
            item["metadata"]["selection_basis"] = "coverage_quality_gate_v1"
            selected.append(item)
            category_report["selected"] += 1
            category_report["selected_names"].append(item["name"])
            report["summary"]["selected"] += 1

    for city_slug in city_by_slug:
        city_report = report["cities"].setdefault(city_slug, {"categories": {}})
        for category in CATEGORY_SUBTYPE_PRIORITY:
            city_report["categories"].setdefault(category, {
                "available": 0, "selected": 0, "target": limit_per_category,
                "rejected": {}, "selected_names": [],
            })
    return selected, report


def extract_city(connection: duckdb.DuckDBPyConnection, city: dict[str, Any], release: str,
                 minimum_confidence: float, limit_per_category: int) -> list[dict[str, Any]]:
    radius = float(city["search_radius_km"])
    latitude = float(city["latitude"])
    longitude = float(city["longitude"])
    latitude_delta = radius / 111.0
    longitude_delta = radius / (111.0 * max(0.2, math.cos(math.radians(latitude))))
    source = PARQUET_URL.format(release=release)
    classifier = category_case()
    sql = f"""
      WITH candidates AS (
        SELECT
          id,
          names.primary AS name,
          names.common AS common_names,
          names.rules AS name_rules,
          bbox.ymin AS latitude,
          bbox.xmin AS longitude,
          basic_category,
          confidence,
          power((bbox.ymin - {latitude}) * 111.0, 2)
            + power((bbox.xmin - {longitude}) * 111.0
              * greatest(0.2, cos(radians({latitude}))), 2) AS distance_squared,
          {classifier} AS canonical_category
        FROM read_parquet(?, hive_partitioning=1)
        WHERE bbox.xmin BETWEEN ? AND ?
          AND bbox.ymin BETWEEN ? AND ?
          AND names.primary IS NOT NULL
          AND confidence >= ?
      ), ranked AS (
        SELECT *, row_number() OVER (
          PARTITION BY canonical_category
          ORDER BY distance_squared, confidence DESC, name
        ) AS category_rank
        FROM candidates
        WHERE canonical_category IS NOT NULL
      )
      SELECT id, name, common_names, name_rules, latitude, longitude,
        basic_category, confidence, canonical_category
      FROM ranked
      WHERE category_rank <= ?
    """
    rows = connection.execute(sql, [
        source,
        longitude - longitude_delta,
        longitude + longitude_delta,
        latitude - latitude_delta,
        latitude + latitude_delta,
        minimum_confidence,
        limit_per_category,
    ]).fetchall()
    return [apply_curated_place_override({
        "city_id": city.get("id"),
        "city_slug": city["slug"],
        "name": preferred_place_name(row[1], row[2], city.get("country_code")),
        "latitude": row[4],
        "longitude": row[5],
        "canonical_category": row[8],
        "subcategory": row[6] or row[8],
        "description": None,
        "source": "overture",
        "source_id": row[0],
        "source_confidence": row[7],
        "quality_tier": "coverage",
        "is_active": True,
        "metadata": {
            "overture_release": release,
            "alternate_names": collect_place_names(row[1], row[2], row[3]),
        },
    }) for row in rows]


def extract_cities(connection: duckdb.DuckDBPyConnection, cities: list[dict[str, Any]], release: str,
                   minimum_confidence: float, limit_per_category: int) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Use Overture's STAC index per bbox, then resolve cross-city duplicates."""
    candidates: list[dict[str, Any]] = []
    for city in cities:
        radius = float(city["search_radius_km"])
        latitude = float(city["latitude"])
        longitude = float(city["longitude"])
        latitude_delta = radius / 111.0
        longitude_delta = radius / (111.0 * max(0.2, math.cos(math.radians(latitude))))
        bbox = (
            longitude - longitude_delta,
            latitude - latitude_delta,
            longitude + longitude_delta,
            latitude + latitude_delta,
        )
        reader = get_stac_place_reader(release, bbox)
        if reader is None:
            continue
        relation_name = "overture_city_places"
        connection.register(relation_name, reader)
        classifier = category_case()
        rows = connection.execute(f"""
          WITH categorized AS (
            SELECT
              id,
              names.primary AS name,
              names.common AS common_names,
              names.rules AS name_rules,
              bbox.ymin AS latitude,
              bbox.xmin AS longitude,
              basic_category,
              confidence,
              power((bbox.ymin - {latitude}) * 111.0, 2)
                + power((bbox.xmin - {longitude}) * 111.0
                  * greatest(0.2, cos(radians({latitude}))), 2) AS distance_squared,
              {classifier} AS canonical_category
            FROM {relation_name}
            WHERE names.primary IS NOT NULL
              AND confidence >= ?
          ), ranked AS (
            SELECT *, row_number() OVER (
              PARTITION BY canonical_category
              ORDER BY distance_squared, confidence DESC, name
            ) AS category_rank
            FROM categorized
            WHERE canonical_category IS NOT NULL
          )
          SELECT id, name, common_names, name_rules, latitude, longitude,
            basic_category, confidence, canonical_category
          FROM ranked
          WHERE category_rank <= ?
        """, [minimum_confidence, max(limit_per_category * 25, 250)]).fetchall()
        connection.unregister(relation_name)
        candidates.extend(apply_curated_place_override({
            "city_id": city.get("id"),
            "city_slug": city["slug"],
            "name": preferred_place_name(row[1], row[2], city.get("country_code")),
            "latitude": row[4],
            "longitude": row[5],
            "canonical_category": row[8],
            "subcategory": row[6] or row[8],
            "description": None,
            "source": "overture",
            "source_id": str(row[0]),
            "source_confidence": row[7],
            "quality_tier": "coverage",
            "is_active": True,
            "metadata": {
                "overture_release": release,
                "alternate_names": collect_place_names(row[1], row[2], row[3]),
            },
        }) for row in rows)

    city_by_slug = {city["slug"]: city for city in cities}

    def distance_to_city(item: dict[str, Any]) -> float:
        city = city_by_slug[item["city_slug"]]
        latitude_scale = 111.0
        longitude_scale = 111.0 * max(0.2, math.cos(math.radians(float(city["latitude"]))))
        return (
            ((float(item["latitude"]) - float(city["latitude"])) * latitude_scale) ** 2
            + ((float(item["longitude"]) - float(city["longitude"])) * longitude_scale) ** 2
        )

    # The same GERS feature can fall inside two nearby city bboxes. Keep it only
    # for the nearest city so users never see cross-city duplicates.
    nearest_by_source: dict[str, dict[str, Any]] = {}
    for candidate in candidates:
        existing = nearest_by_source.get(candidate["source_id"])
        if existing is None or distance_to_city(candidate) < distance_to_city(existing):
            nearest_by_source[candidate["source_id"]] = candidate

    selected, report = select_quality_candidates(
        list(nearest_by_source.values()), city_by_slug, limit_per_category,
    )
    ordered = sorted(selected, key=lambda item: (
        city_by_slug[item["city_slug"]]["market_rank"],
        item["canonical_category"],
        item["distance_to_center_km"],
        item["name"],
    ))
    return ordered, report


def extract_cities_legacy(connection: duckdb.DuckDBPyConnection, cities: list[dict[str, Any]], release: str,
                          minimum_confidence: float, limit_per_category: int) -> list[dict[str, Any]]:
    """Legacy single-scan implementation retained for reproducibility."""
    connection.execute("""
      CREATE OR REPLACE TEMP TABLE import_cities (
        slug text, latitude double, longitude double,
        latitude_min double, latitude_max double,
        longitude_min double, longitude_max double
      )
    """)
    bounds: list[tuple[Any, ...]] = []
    for city in cities:
        radius = float(city["search_radius_km"])
        latitude = float(city["latitude"])
        longitude = float(city["longitude"])
        latitude_delta = radius / 111.0
        longitude_delta = radius / (111.0 * max(0.2, math.cos(math.radians(latitude))))
        bounds.append((city["slug"], latitude, longitude, latitude - latitude_delta,
                       latitude + latitude_delta, longitude - longitude_delta,
                       longitude + longitude_delta))
    connection.executemany("INSERT INTO import_cities VALUES (?, ?, ?, ?, ?, ?, ?)", bounds)
    source = PARQUET_URL.format(release=release)
    classifier = category_case()
    rows = connection.execute(f"""
      WITH matched AS (
        SELECT
          city.slug AS city_slug,
          place.id,
          place.names.primary AS name,
          place.bbox.ymin AS latitude,
          place.bbox.xmin AS longitude,
          place.basic_category,
          place.taxonomy,
          place.confidence,
          power((place.bbox.ymin - city.latitude) * 111.0, 2)
            + power((place.bbox.xmin - city.longitude) * 111.0
              * greatest(0.2, cos(radians(city.latitude))), 2) AS distance_squared
        FROM read_parquet(?, hive_partitioning=1) AS place
        JOIN import_cities AS city
          ON place.bbox.xmin BETWEEN city.longitude_min AND city.longitude_max
         AND place.bbox.ymin BETWEEN city.latitude_min AND city.latitude_max
        WHERE place.names.primary IS NOT NULL
          AND place.confidence >= ?
      ), nearest_city AS (
        SELECT *, row_number() OVER (
          PARTITION BY id ORDER BY distance_squared, city_slug
        ) AS city_rank
        FROM matched
      ), categorized AS (
        SELECT *, {classifier} AS canonical_category
        FROM nearest_city
        WHERE city_rank = 1
      ), ranked AS (
        SELECT *, row_number() OVER (
          PARTITION BY city_slug, canonical_category
          ORDER BY confidence DESC, distance_squared, name
        ) AS category_rank
        FROM categorized
        WHERE canonical_category IS NOT NULL
      )
      SELECT city_slug, id, name, latitude, longitude, basic_category,
        confidence, canonical_category
      FROM ranked
      WHERE category_rank <= ?
      ORDER BY city_slug, canonical_category, category_rank
    """, [source, minimum_confidence, limit_per_category]).fetchall()

    city_by_slug = {city["slug"]: city for city in cities}
    return [{
        "city_id": city_by_slug[row[0]].get("id"),
        "city_slug": row[0],
        "name": row[2],
        "latitude": row[3],
        "longitude": row[4],
        "canonical_category": row[7],
        "subcategory": row[5] or row[7],
        "description": None,
        "source": "overture",
        "source_id": row[1],
        "source_confidence": row[6],
        "quality_tier": "coverage",
        "is_active": True,
        "metadata": {"overture_release": release},
    } for row in rows]


def upsert_items(items: list[dict[str, Any]]) -> None:
    payload = [{key: value for key, value in item.items() if key != "city_slug"} for item in items]
    for start in range(0, len(payload), 250):
        api_request("POST", "catalog_items?on_conflict=source,source_id", payload[start:start + 250])


def write_sql(items: list[dict[str, Any]], destination: str) -> None:
    records = [{
        "city_slug": item["city_slug"],
        "name": item["name"],
        "latitude": item["latitude"],
        "longitude": item["longitude"],
        "canonical_category": item["canonical_category"],
        "subcategory": item["subcategory"],
        "source": item["source"],
        "source_id": item["source_id"],
        "source_confidence": item["source_confidence"],
        "quality_tier": item["quality_tier"],
        "metadata": item["metadata"],
    } for item in items]
    json_payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
    city_slugs = sorted({item["city_slug"] for item in items})
    quoted_city_slugs = ", ".join("'" + slug.replace("'", "''") + "'" for slug in city_slugs)
    sql = f"""-- Generated by scripts/import_overture.py; safe to re-run.
WITH incoming AS (
  SELECT * FROM jsonb_to_recordset($overture${json_payload}$overture$::jsonb) AS x(
    city_slug text, name text, latitude double precision, longitude double precision,
    canonical_category text, subcategory text, source text, source_id text,
    source_confidence numeric, quality_tier text, metadata jsonb
  )
)
INSERT INTO public.catalog_items (
  city_id, name, latitude, longitude, canonical_category, subcategory,
  source, source_id, source_confidence, quality_tier, metadata,
  is_active, last_verified_at, updated_at
)
SELECT city.id, incoming.name, incoming.latitude, incoming.longitude,
  incoming.canonical_category, incoming.subcategory, incoming.source,
  incoming.source_id, incoming.source_confidence, incoming.quality_tier,
  incoming.metadata, true, now(), now()
FROM incoming
JOIN public.catalog_cities AS city ON city.slug = incoming.city_slug
ON CONFLICT (source, source_id) DO UPDATE SET
  city_id = EXCLUDED.city_id,
  name = EXCLUDED.name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  canonical_category = EXCLUDED.canonical_category,
  subcategory = EXCLUDED.subcategory,
  source_confidence = EXCLUDED.source_confidence,
  metadata = EXCLUDED.metadata,
  is_active = true,
  last_verified_at = now(),
  updated_at = now();

SELECT city.slug, count(*) AS active_items
FROM public.catalog_items AS item
JOIN public.catalog_cities AS city ON city.id = item.city_id
WHERE city.slug IN ({quoted_city_slugs}) AND item.is_active
GROUP BY city.slug ORDER BY city.slug;
"""
    with open(destination, "w", encoding="utf-8") as output:
        output.write(sql)


def write_quality_report(report: dict[str, Any], destination: str, release: str) -> None:
    report = {"overture_release": release, "quality_gate": "coverage_quality_gate_v1", **report}
    with open(destination, "w", encoding="utf-8") as output:
        json.dump(report, output, ensure_ascii=False, indent=2, sort_keys=True)
        output.write("\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--city", action="append", dest="cities", default=[], help="City slug; repeat to select cities")
    parser.add_argument("--release", default=os.environ.get("OVERTURE_RELEASE", DEFAULT_RELEASE))
    parser.add_argument("--min-confidence", type=float, default=0.75)
    parser.add_argument("--limit-per-category", type=int, default=10)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--pilot-local", action="store_true", help="Use built-in Paris/Lisbon coordinates; no Supabase read needed")
    parser.add_argument("--local-cities", action="store_true", help="Read all cities from the checked-in catalogue seed; no Supabase read needed")
    parser.add_argument(
        "--city-seed-file",
        default="supabase/migrations/20260921183500_catalog_seed.sql",
        help="Catalogue seed used by --local-cities",
    )
    parser.add_argument("--sql-output", help="Write reviewable upsert SQL instead of uploading")
    parser.add_argument("--quality-report", help="Write JSON showing selected and rejected candidates")
    args = parser.parse_args()

    if not 0 <= args.min_confidence <= 1:
        parser.error("--min-confidence must be between 0 and 1")
    if not 1 <= args.limit_per_category <= 100:
        parser.error("--limit-per-category must be between 1 and 100")
    if args.pilot_local and not (args.dry_run or args.sql_output):
        parser.error("--pilot-local requires --dry-run or --sql-output")
    if args.local_cities and not (args.dry_run or args.sql_output):
        parser.error("--local-cities requires --dry-run or --sql-output")
    if args.pilot_local and args.local_cities:
        parser.error("--pilot-local and --local-cities cannot be used together")

    if args.pilot_local:
        requested = args.cities or list(PILOT_CITIES)
        unknown = [slug for slug in requested if slug not in PILOT_CITIES]
        if unknown:
            parser.error(f"--pilot-local supports only: {', '.join(PILOT_CITIES)}")
        cities = [PILOT_CITIES[slug] for slug in requested]
    elif args.local_cities:
        cities = get_local_cities(args.cities, args.city_seed_file)
    else:
        cities = get_cities(args.cities)
    if not cities:
        raise RuntimeError("No active catalogue cities matched")

    release = args.release or get_latest_release()
    connection = duckdb.connect()
    all_items, quality_report = extract_cities(connection, cities, release, args.min_confidence, args.limit_per_category)
    for city in cities:
        items = [item for item in all_items if item["city_slug"] == city["slug"]]
        counts: dict[str, int] = {}
        for item in items:
            counts[item["canonical_category"]] = counts.get(item["canonical_category"], 0) + 1
        print(f"{city['name']}: {len(items)} candidates {json.dumps(counts, sort_keys=True)}")

    if args.quality_report:
        write_quality_report(quality_report, args.quality_report, release)
        print(f"Wrote quality report to {args.quality_report}")

    if args.dry_run:
        print(f"Dry run: {len(all_items)} records; nothing uploaded")
        return 0

    if args.sql_output:
        write_sql(all_items, args.sql_output)
        print(f"Wrote {len(all_items)} catalogue records to {args.sql_output}")
        return 0

    upsert_items(all_items)
    print(f"Uploaded {len(all_items)} catalogue records")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # pragma: no cover - command-line boundary
        print(f"Import failed: {error}", file=sys.stderr)
        raise SystemExit(1)
