#!/usr/bin/env python3
"""Fetch one bounded OSM source slice for a young-traveller pilot.

This uses one Overpass request per destination for review-sized pilots only.
Large-scale population should read regional OSM PBF extracts instead of using
the public Overpass service as a bulk database.
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

from match_llm_to_overture import parse_suggestion


PILOTS = {
    "balearic-islands-es": {
        "bboxes": [
            (39.25, 2.30, 40.05, 3.55),
            (38.62, 1.15, 39.15, 1.65),
            (39.75, 3.75, 40.15, 4.35),
        ],
        "timeout": 180,
        "selectors": [
            'relation["type"="route"]["route"~"hiking|foot|bicycle"]["name"]',
            'nwr["tourism"="viewpoint"]["name"]',
            'nwr["tourism"~"museum|gallery|attraction"]["name"]',
            'nwr["historic"]["name"]',
            'nwr["natural"~"beach|cave|peak|bay|cape"]["name"]',
            'nwr["leisure"~"park|garden|nature_reserve"]["name"]',
        ],
    },
    "barcelona-es": {
        "bbox": (41.30, 2.02, 41.50, 2.27),
        "timeout": 120,
        "selectors": [
            'relation["type"="route"]["route"~"hiking|foot|bicycle"]["name"]',
            'nwr["tourism"="viewpoint"]["name"]',
            'nwr["tourism"~"museum|gallery|attraction"]["name"]',
            'nwr["historic"]["name"]',
            'nwr["natural"="beach"]["name"]',
            'nwr["leisure"~"park|garden|nature_reserve"]["name"]',
        ],
    },
    "madeira-pt": {
        "bbox": (32.60, -17.35, 32.90, -16.60),
        "timeout": 180,
        "selectors": [
            'relation["type"="route"]["route"~"hiking|foot"]["name"]',
            'nwr["tourism"="viewpoint"]["name"]',
            'nwr["tourism"~"museum|gallery|attraction"]["name"]',
            'nwr["historic"]["name"]',
            'nwr["natural"~"beach|peak|spring"]["name"]',
            'nwr["leisure"~"park|garden|nature_reserve|swimming_pool"]["name"]',
            'nwr["water"="pool"]["name"]',
        ],
    },
    "dolomites-it": {
        "bboxes": [
            (46.00, 10.55, 46.55, 11.25),
            (46.20, 11.25, 46.85, 12.00),
            (46.25, 11.90, 46.85, 12.65),
        ],
        "timeout": 240,
        "selectors": [
            'relation["type"="route"]["route"~"hiking|foot|bicycle|ski"]["name"]',
            'nwr["tourism"="viewpoint"]["name"]',
            'nwr["tourism"~"museum|gallery|attraction|alpine_hut"]["name"]',
            'nwr["historic"]["name"]',
            'nwr["natural"~"peak|saddle|ridge|water|cliff"]["name"]',
            'nwr["leisure"~"park|nature_reserve"]["name"]',
        ],
    },
}


def destination_config(destination: str, suggestions: dict | None = None) -> dict:
    if destination in PILOTS:return PILOTS[destination]
    bounds=(suggestions or {}).get("destination_bounds") or {}
    keys=["min_latitude","min_longitude","max_latitude","max_longitude"]
    if not all(k in bounds for k in keys):
        raise ValueError("New OSM destinations require explicit destination_bounds; no worldwide query is allowed")
    bbox=tuple(float(bounds[k]) for k in keys)
    if not (-90<=bbox[0]<bbox[2]<=90 and -180<=bbox[1]<bbox[3]<=180):
        raise ValueError("Invalid bounded OSM destination")
    return {"bbox":bbox,"timeout":120,"selectors":PILOTS["madeira-pt"]["selectors"]}


def destination_bboxes(destination: str, suggestions: dict | None = None) -> list[tuple[float, float, float, float]]:
    config = destination_config(destination,suggestions)
    return list(config.get("bboxes") or [config["bbox"]])


def build_query(
    destination: str,
    bboxes: list[tuple[float, float, float, float]] | None = None,
) -> str:
    config = PILOTS[destination]
    bboxes = bboxes or destination_bboxes(destination)
    statements = "\n".join(
        f"  {selector}({','.join(str(value) for value in bbox)});"
        for bbox in bboxes
        for selector in config["selectors"]
    )
    return f"""[out:json][timeout:{config['timeout']}];
(
{statements}
);
out body geom;
"""


def targeted_names(suggestions: dict) -> list[str]:
    names: list[str] = []
    for items in suggestions.get("categories", {}).values():
        for item in items:
            metadata = parse_suggestion(item)
            if "osm" not in metadata["source_route"]:
                continue
            for name in [metadata["name"], *metadata["aliases"], metadata.get("expected_route_ref")]:
                if name and name not in names:
                    names.append(name)
    return names


def build_targeted_query(
    destination: str,
    suggestions: dict,
    bboxes: list[tuple[float, float, float, float]] | None = None,
) -> str:
    config = destination_config(destination,suggestions)
    bboxes = bboxes or destination_bboxes(destination,suggestions)
    if not targeted_names(suggestions):raise ValueError("No OSM source targets; skip the request")
    pattern = "|".join(re.escape(name).replace("\\ ", " ") for name in targeted_names(suggestions))
    pattern = pattern.replace('"', '\\"')
    statements = "\n".join(
        f'  nwr["{key}"~"^({pattern})$",i]({",".join(str(value) for value in bbox)});'
        for bbox in bboxes
        for key in ("name", "name:en", "alt_name", "ref")
    )
    return f"""[out:json][timeout:{config['timeout']}];
(
{statements}
);
out body geom;
"""


def fetch(endpoint: str, query: str) -> dict:
    body = urllib.parse.urlencode({"data": query}).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        headers={
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": "Globethrotters-MVP/1.0 OSM pilot source audit",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=240) as response:
        return json.load(response)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--destination", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--endpoint", default="https://overpass-api.de/api/interpreter")
    parser.add_argument("--suggestions", type=Path, help="Use a name-targeted query for public Overpass pilot runs")
    parser.add_argument("--print-query", action="store_true")
    args = parser.parse_args()

    suggestions = json.loads(args.suggestions.read_text(encoding="utf-8")) if args.suggestions else None
    query = build_targeted_query(args.destination, suggestions) if suggestions else build_query(args.destination)
    if args.print_query:
        print(query)
        return 0

    bboxes = destination_bboxes(args.destination,suggestions)
    if len(bboxes) > 1:
        elements: dict[tuple[str, int], dict] = {}
        payload = {}
        for bbox in bboxes:
            partial_query = (
                build_targeted_query(args.destination, suggestions, [bbox])
                if suggestions
                else build_query(args.destination, [bbox])
            )
            partial = fetch(args.endpoint, partial_query)
            if not payload:
                payload = {key: value for key, value in partial.items() if key != "elements"}
            for element in partial.get("elements", []):
                elements[(str(element.get("type") or ""), int(element.get("id") or 0))] = element
        payload["elements"] = list(elements.values())
    else:
        payload = fetch(args.endpoint, query)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({
        "destination": args.destination,
        "elements": len(payload.get("elements", [])),
        "output": str(args.output),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
