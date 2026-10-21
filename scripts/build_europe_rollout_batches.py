#!/usr/bin/env python3
"""Build review-only OSM candidate SQL batches for the seeded Europe rollout.

Run: python3 scripts/build_europe_rollout_batches.py
The output is staged as hidden `coverage`; it is not a publishable experience
catalogue until a human has checked each candidate and added an editorial
description/provenance review. No Supabase credentials are used.
"""
from __future__ import annotations

import collections
import json
import pathlib
import time
import urllib.parse
import urllib.request

from catalog_match import group_osm_features

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "generated_sql" / "europe_rollout"
OUT.mkdir(parents=True, exist_ok=True)

# Slug, centre latitude, centre longitude, discovery radius km, guide target.
# Targets guide candidate discovery and are not publication quotas. Barcelona,
# Milan and Madeira use the agreed city-specific targets.
CITY_ROWS = [
    ("london-gb",51.5074,-0.1278,35,40),("paris-fr",48.8566,2.3522,30,40),
    ("istanbul-tr",41.0082,28.9784,40,40),("rome-it",41.9028,12.4964,30,40),
    ("barcelona-es",41.3874,2.1686,25,115),("madrid-es",40.4168,-3.7038,30,40),
    ("amsterdam-nl",52.3676,4.9041,20,40),("milan-it",45.4642,9.1900,25,105),
    ("prague-cz",50.0755,14.4378,22,40),("vienna-at",48.2082,16.3738,25,40),
    ("lisbon-pt",38.7223,-9.1393,25,40),("athens-gr",37.9838,23.7275,30,40),
    ("berlin-de",52.5200,13.4050,35,40),("dublin-ie",53.3498,-6.2603,25,40),
    ("venice-it",45.4408,12.3155,18,40),("florence-it",43.7696,11.2558,18,40),
    ("munich-de",48.1351,11.5820,25,40),("copenhagen-dk",55.6761,12.5683,22,40),
    ("budapest-hu",47.4979,19.0402,25,40),("brussels-be",50.8503,4.3517,22,40),
    ("edinburgh-gb",55.9533,-3.1883,20,40),("porto-pt",41.1579,-8.6291,20,40),
    ("stockholm-se",59.3293,18.0686,30,40),("oslo-no",59.9139,10.7522,28,40),
    ("reykjavik-is",64.1466,-21.9426,30,40),("zurich-ch",47.3769,8.5417,22,40),
    ("geneva-ch",46.2044,6.1432,22,40),("nice-fr",43.7102,7.2620,22,40),
    ("krakow-pl",50.0647,19.9450,20,40),("warsaw-pl",52.2297,21.0122,28,40),
    ("dubrovnik-hr",42.6507,18.0944,18,40),("split-hr",43.5081,16.4402,20,40),
    ("salzburg-at",47.8095,13.0550,18,40),("seville-es",37.3891,-5.9845,22,40),
    ("valencia-es",39.4699,-0.3763,25,40),("malaga-es",36.7213,-4.4214,22,40),
    ("naples-it",40.8518,14.2681,25,40),("bologna-it",44.4949,11.3426,20,40),
    ("turin-it",45.0703,7.6869,22,40),("lyon-fr",45.7640,4.8357,24,40),
    ("bordeaux-fr",44.8378,-0.5792,22,40),("marseille-fr",43.2965,5.3698,28,40),
    ("hamburg-de",53.5511,9.9937,30,40),("frankfurt-de",50.1109,8.6821,25,40),
    ("cologne-de",50.9375,6.9603,24,40),("rotterdam-nl",51.9244,4.4777,22,40),
    ("the-hague-nl",52.0705,4.3007,20,40),("antwerp-be",51.2194,4.4025,20,40),
    ("bruges-be",51.2093,3.2247,16,40),("tallinn-ee",59.4370,24.7536,20,40),
    ("madeira-pt",32.7220,-16.9500,45,80),
]

# Category, subcategory, OSM tag key/value. Natural experiences include trails,
# viewpoints, beaches, levadas/waterways and outdoor landmarks.
TAGS = [
    ("culture","museum","tourism","museum"),("culture","gallery","tourism","gallery"),
    ("culture","attraction","tourism","attraction"),("culture","monument","historic","monument"),
    ("culture","castle","historic","castle"),("culture","archaeological_site","historic","archaeological_site"),
    ("culture","theatre","amenity","theatre"),("culture","place_of_worship","amenity","place_of_worship"),
    ("nature","viewpoint","tourism","viewpoint"),("nature","beach","natural","beach"),
    ("nature","peak","natural","peak"),("nature","waterfall","waterway","waterfall"),
    ("nature","park","leisure","park"),("nature","garden","leisure","garden"),
    ("nature","nature_reserve","leisure","nature_reserve"),("nature","trail","route","hiking"),
    ("food","restaurant","amenity","restaurant"),("food","cafe","amenity","cafe"),
    ("food","marketplace","amenity","marketplace"),("food","bakery","shop","bakery"),
    ("nightlife","bar","amenity","bar"),("nightlife","pub","amenity","pub"),
    ("nightlife","nightclub","amenity","nightclub"),("nightlife","music_venue","amenity","music_venue"),
]
WEIGHTS = {"food":.27,"culture":.34,"nature":.25,"nightlife":.14}
PRIORITY = {"viewpoint":0,"beach":0,"peak":0,"waterfall":0,"nature_reserve":0,
            "museum":0,"monument":0,"castle":0,"archaeological_site":0,
            "restaurant":1,"marketplace":1,"park":1,"garden":1,"trail":1,
            "cafe":2,"bakery":2,"bar":2,"pub":3}


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def fetch_city(slug: str, lat: float, lon: float, radius_km: int) -> list[dict]:
    rows = []
    for offset in (0, 12):
        group = TAGS[offset:offset+12]
        selectors = "".join(
            f'nwr(around:{radius_km * 1000},{lat},{lon})["{key}"="{value}"]["name"];'
            for _, _, key, value in group
        )
        query = f"[out:json][timeout:180];({selectors});out center tags;"
        request = urllib.request.Request(
            "https://overpass-api.de/api/interpreter",
            data=urllib.parse.urlencode({"data": query}).encode(),
            headers={"User-Agent":"Globetrotters-European-Catalogue/1.0 (candidate discovery; OSM attribution retained)"},
        )
        error = None
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=210) as response:
                    payload = json.load(response)
                break
            except Exception as exc:
                error = exc
                if attempt < 2:
                    time.sleep(5 * (attempt + 1))
        else:
            raise RuntimeError(f"Overpass request failed for {slug}: {error}")
        for element in payload.get("elements", []):
            tags = element.get("tags", {})
            lat0 = element.get("lat", element.get("center", {}).get("lat"))
            lon0 = element.get("lon", element.get("center", {}).get("lon"))
            if not tags.get("name") or lat0 is None or lon0 is None:
                continue
            for category, subcategory, key, value in group:
                if tags.get(key) == value:
                    rows.append({"source_id":f"{element['type']}/{element['id']}",
                        "element_type":element["type"],"feature_type":subcategory,
                        "name":tags["name"].strip(),"lat":float(lat0),"lon":float(lon0),
                        "latitude":float(lat0),"longitude":float(lon0),
                        "category":category,"subcategory":subcategory,"tags":tags})
                    break
        time.sleep(1)
    return rows


def select_candidates(rows: list[dict], target: int) -> list[dict]:
    grouped = group_osm_features(rows, alias_distance_m=20)
    unique = []
    for group in grouped:
        item = min(group, key=lambda x:(x["element_type"] != "node", x["source_id"])).copy()
        item["osm_representation_ids"] = sorted({x["source_id"] for x in group})
        unique.append(item)
    by_category = collections.defaultdict(list)
    for row in unique:
        by_category[row["category"]].append(row)
    cap = target + max(15, round(target * .15))
    picked = []
    for category, weight in WEIGHTS.items():
        quota = round(cap * weight)
        ordered = sorted(by_category[category], key=lambda x:(PRIORITY.get(x["subcategory"],2),x["name"].casefold(),x["source_id"]))
        picked.extend(ordered[:quota])
    have = {row["source_id"] for row in picked}
    rest = [row for row in unique if row["source_id"] not in have]
    rest.sort(key=lambda x:(PRIORITY.get(x["subcategory"],2),x["name"].casefold(),x["source_id"]))
    picked.extend(rest[:max(0,cap-len(picked))])
    return picked[:cap]


def write_batches(slug: str, rows: list[dict]) -> list[str]:
    paths = []
    for start in range(0, len(rows), 20):
        part = rows[start:start+20]
        filename = f"{slug}_part_{start//20+1:02}.sql"
        values = []
        for row in part:
            values.append("(" + ", ".join([
                sql_quote(row["source_id"]),sql_quote(row["name"]),str(row["lat"]),str(row["lon"]),
                sql_quote(row["category"]),sql_quote(row["subcategory"]),
                sql_quote("https://www.openstreetmap.org/"+row["source_id"]),
                sql_quote(json.dumps(row["osm_representation_ids"]))+"::jsonb",
            ]) + ")")
        ids = ", ".join(sql_quote(row["source_id"]) for row in part)
        values_sql = ",\n".join(values)
        sql = f"""-- {slug}: candidate rows {start+1}-{start+len(part)}. Coverage remains unpublished.
DO $guard$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.catalog_cities WHERE slug = {sql_quote(slug)}) THEN
    RAISE EXCEPTION 'Missing catalog city {slug}; run the city seed migration first';
  END IF;
END $guard$;

INSERT INTO public.catalog_items
  (city_id,source,source_id,name,latitude,longitude,canonical_category,subcategory,
   source_url,quality_tier,is_active,metadata)
SELECT city.id,'osm',v.source_id,v.name,v.lat,v.lon,v.category,v.subcategory,
       v.url,'coverage',true,
       jsonb_build_object('review_required',true,'osm_representation_ids',v.representation_ids,
                          'import_batch','europe-rollout-2026-10')
FROM public.catalog_cities city
CROSS JOIN (VALUES
{values_sql}
) AS v(source_id,name,lat,lon,category,subcategory,url,representation_ids)
WHERE city.slug = {sql_quote(slug)}
ON CONFLICT (source,source_id) DO NOTHING;

-- Verify imported source IDs. These remain hidden coverage candidates.
SELECT city.slug,item.canonical_category,count(*) AS rows_present
FROM public.catalog_items item JOIN public.catalog_cities city ON city.id=item.city_id
WHERE city.slug={sql_quote(slug)} AND item.source='osm' AND item.source_id IN ({ids})
GROUP BY city.slug,item.canonical_category ORDER BY item.canonical_category;
"""
        path = OUT / filename
        path.write_text(sql, encoding="utf-8")
        paths.append(filename)
    return paths


def main() -> None:
    # Prevent stale extra batches from a previous run being mistaken for this
    # run's complete output when a provider returns fewer candidates.
    for old_file in OUT.glob("*_part_*.sql"):
        old_file.unlink()
    report = {}
    for index, (slug, lat, lon, radius, target) in enumerate(CITY_ROWS, 1):
        if slug == "madeira-pt":
            # Madeira's island is elongated; use a dedicated full-island box
            # query below rather than a circular radius around Funchal.
            from build_catalog_batches import get_places, MARKETS, choose
            market = {"bbox":(32.575,-17.285,32.885,-16.640),"target":target}
            rows = get_places(market)
            selected, raw_unique = choose(rows, market, slug)
            chosen = selected
            unique_count = raw_unique
        else:
            print(f"[{index}/{len(CITY_ROWS)}] Fetching {slug}", flush=True)
            rows = fetch_city(slug, lat, lon, radius)
            unique_count = len(group_osm_features(rows, alias_distance_m=20))
            chosen = select_candidates(rows, target)
        files = write_batches(slug, chosen)
        report[slug] = {"target_guide":target,"raw_candidates":len(rows),
            "unique_osm_features":unique_count,"review_candidates":len(chosen),
            "category_counts":dict(collections.Counter(x["category"] for x in chosen)),
            "sql_files":files,"status":"unreviewed_hidden_coverage"}
        time.sleep(1.5)
    (OUT/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2))
    print(f"Generated {sum(len(row['sql_files']) for row in report.values())} SQL batches in {OUT}")


if __name__ == "__main__":
    main()
