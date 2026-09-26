#!/usr/bin/env python3
"""Import high-confidence Overture places into the normalized catalogue.

The script reads only configured city bounding boxes, maps Overture's taxonomy
to Globethrotters' four categories, limits coverage per category, and upserts by
the stable Overture GERS ID. It can upload with server-side Supabase
credentials or emit SQL for review in Lovable Cloud's SQL editor.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

try:
    import duckdb
except ImportError as exc:  # pragma: no cover - setup guard
    raise SystemExit("Install importer dependencies: python3 -m pip install -r scripts/requirements-import.txt") from exc


DEFAULT_RELEASE = "2026-08-19.0"
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
    query = "catalog_cities?select=id,slug,name,country,latitude,longitude,search_radius_km&is_active=eq.true&order=market_rank.asc"
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
          OR basic_category IN ('museum', 'art_gallery', 'monument', 'cultural_center') THEN 'culture'
        WHEN basic_category IN ('hiking_trail', 'trailhead')
          OR list_contains(taxonomy.hierarchy, 'hiking_trail') THEN 'nature'
        WHEN basic_category IN ('park', 'botanical_garden', 'garden', 'beach', 'nature_reserve') THEN 'nature'
        WHEN basic_category IN ('nightclub', 'bar', 'concert_hall', 'live_music_venue') THEN 'nightlife'
        ELSE NULL
      END
    """


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
          bbox.ymin AS latitude,
          bbox.xmin AS longitude,
          basic_category,
          confidence,
          {classifier} AS canonical_category
        FROM read_parquet(?, hive_partitioning=1)
        WHERE bbox.xmin BETWEEN ? AND ?
          AND bbox.ymin BETWEEN ? AND ?
          AND names.primary IS NOT NULL
          AND confidence >= ?
      ), ranked AS (
        SELECT *, row_number() OVER (
          PARTITION BY canonical_category
          ORDER BY confidence DESC, name
        ) AS category_rank
        FROM candidates
        WHERE canonical_category IS NOT NULL
      )
      SELECT id, name, latitude, longitude, basic_category, confidence, canonical_category
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
    return [{
        "city_id": city.get("id"),
        "city_slug": city["slug"],
        "name": row[1],
        "latitude": row[2],
        "longitude": row[3],
        "canonical_category": row[6],
        "subcategory": row[4] or row[6],
        "description": None,
        "source": "overture",
        "source_id": row[0],
        "source_confidence": row[5],
        "quality_tier": "coverage",
        "is_active": True,
        "metadata": {"overture_release": release},
    } for row in rows]


def extract_cities(connection: duckdb.DuckDBPyConnection, cities: list[dict[str, Any]], release: str,
                   minimum_confidence: float, limit_per_category: int) -> list[dict[str, Any]]:
    """Extract many cities in one Overture scan and resolve overlapping bounds."""
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
        bounds.append((
            city["slug"], latitude, longitude,
            latitude - latitude_delta, latitude + latitude_delta,
            longitude - longitude_delta, longitude + longitude_delta,
        ))
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

    connection = duckdb.connect()
    connection.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2'")
    all_items = extract_cities(connection, cities, args.release, args.min_confidence, args.limit_per_category)
    for city in cities:
        items = [item for item in all_items if item["city_slug"] == city["slug"]]
        counts: dict[str, int] = {}
        for item in items:
            counts[item["canonical_category"]] = counts.get(item["canonical_category"], 0) + 1
        print(f"{city['name']}: {len(items)} candidates {json.dumps(counts, sort_keys=True)}")

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
