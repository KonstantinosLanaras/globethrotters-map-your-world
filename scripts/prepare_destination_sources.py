"""Mandatory source-routing stage for newly planned destination batches.

Consumes the existing reviewed Overture CSV, preserving accepted venue matches.
Uses cached OSM by default; network fetch requires --fetch-osm. No AI/Google or
database calls. Route identities and publication eligibility are separate.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path

from continue_catalogue_review import write_csv
from match_llm_to_overture import parse_suggestion
from match_llm_to_osm import match
from merge_pilot_sources import merge_rows
from route_quality import named_hike


def validate_plan(suggestions):
    if suggestions.get("taxonomy_version"):
        from catalogue_taxonomy import validate_plan_taxonomy
        validate_plan_taxonomy(suggestions)
    plan=suggestions.get("outdoor_plan") or {}
    relevance=plan.get("hiking_relevance")
    minimum=plan.get("minimum_named_hikes")
    if relevance not in {"core","complementary","not_applicable"}:
        raise ValueError("Specify outdoor_plan.hiking_relevance for this destination, not a population-based quota")
    if not isinstance(minimum,int) or isinstance(minimum,bool) or minimum<0:
        raise ValueError("Specify a non-negative minimum_named_hikes before selection")
    if not plan.get("rationale") or (relevance!="not_applicable" and minimum==0):
        raise ValueError("Explain the destination's outdoor relevance; relevant hiking needs named suggestions")
    if relevance=="not_applicable" and minimum!=0:raise ValueError("Inconsistent hiking plan")
    hikes=[]
    for category,items in suggestions["categories"].items():
        for item in items:
            metadata=parse_suggestion(item)
            if named_hike(metadata):
                if category!="nature":raise ValueError("Named hikes must retain the Nature category")
                hikes.append(metadata["name"])
    if len(set(hikes))<minimum:
        raise ValueError(f"Destination plan requires {minimum} distinct named hikes; only {len(set(hikes))} supplied. Do not pad with cafés or generic walks.")
    return {"hiking_relevance":relevance,"minimum_named_hikes":minimum,"named_hikes_selected":len(set(hikes)),"rationale":plan["rationale"]}


def prepare(suggestions,rows,osm_payload,today=None):
    planning=validate_plan(suggestions)
    if planning["named_hikes_selected"] and not suggestions.get("destination_bounds"):
        from fetch_osm_pilot import destination_bboxes
        boxes=destination_bboxes(suggestions["city"]["slug"],suggestions)
        suggestions={**suggestions,"destination_bounds":{"min_latitude":min(b[0] for b in boxes),
            "min_longitude":min(b[1] for b in boxes),"max_latitude":max(b[2] for b in boxes),"max_longitude":max(b[3] for b in boxes)}}
    expected=[]
    for category,items in suggestions["categories"].items():
        for item in items:
            metadata=parse_suggestion(item)
            if named_hike(metadata):expected.append((category,metadata))
    by_key={(r["category"],r["display_name"]):r for r in rows}
    for category,metadata in expected:
        if (category,metadata["name"]) not in by_key:raise ValueError("Source CSV omitted a planned hike; retain it rather than silently dropping it")
    # Upgrade legacy route strategy labels without changing the author's IDs,
    # ranks or unrelated accepted venue decisions.
    group_by_key={(category,parse_suggestion(item)["name"]):parse_suggestion(item).get("subcategory")
                  for category,items in suggestions["categories"].items() for item in items}
    rows=[dict(r) for r in rows]
    for row in rows:
        group=group_by_key.get((row["category"],row["display_name"]))
        if group:row["llm_subcategory"]=group
    for row in rows:
        if (row["category"],row["display_name"]) in {(c,m["name"]) for c,m in expected}:
            row.update(match_strategy="osm_route_then_official",route_identity_required="True",official_verification_required="True")
    osm_rows=match(suggestions,osm_payload or {"elements":[]})
    retained_model=set()
    # Retain source-ID-specific model decisions; do not erase an accepted route
    # merely because fresh lexical ranking still produces a near tie.
    for index,osm in enumerate(osm_rows):
        old=by_key.get((osm["category"],osm["display_name"]),{})
        same_previous=(str(old.get("osm_id") or "")==str(osm.get("osm_id") or "") and bool(osm.get("osm_id")))
        if same_previous and (old.get("llm_identity_decision")=="wrong_feature" or old.get("human_decision") in {"Keep unmatched","Keep review","Exclude"}):
            osm.update(osm_match_status="review",route_identity_confirmed=False)
            osm["risk_flags"]=" | ".join(filter(None,[osm.get("risk_flags"),"route_identity_previously_rejected"]))
            continue
        if old.get("match_status")!="manual_match" or old.get("matched_source")!="osm" or old.get("llm_identity_decision")!="same_feature":continue
        identifier=str(old.get("matched_source_id") or "")
        alternatives=json.loads(osm.get("osm_candidate_alternatives") or "[]")
        selected=next((a for a in alternatives if f"osm:{a['type']}:{a['id']}"==identifier),None)
        if selected and old.get("geometry_status")!="source_geometry_contradicted":
            elements=[e for e in (osm_payload or {}).get("elements",[]) if e.get("type")==selected["type"] and str(e.get("id"))==str(selected["id"])]
            replacement=next(r for r in match(suggestions,{"elements":elements}) if r["category"]==osm["category"] and r["display_name"]==osm["display_name"])
            replacement.update(osm_match_status="auto_match",route_identity_confirmed=True,
                               osm_candidate_alternatives=osm["osm_candidate_alternatives"])
            osm_rows[index]=replacement
            retained_model.add((osm["category"],osm["display_name"]))
    merged=merge_rows(suggestions,rows,osm_rows,today=today)
    for row in merged:
        if (row["category"],row["display_name"]) in retained_model and row["match_status"]=="auto_match":row["match_status"]="manual_match"
    hikes=[r for r in merged if named_hike(r)]
    report={**planning,"osm_source_supplied":osm_payload is not None,
            "route_matches_eligible":sum(r["match_status"] in {"auto_match","manual_match"} for r in hikes),
            "route_identity_matches":sum(str(r.get("route_identity_confirmed")).casefold()=="true" for r in hikes),
            "route_review":sum(r["match_status"]=="review" for r in hikes),
            "has_route_geometry":sum(bool(r.get("geometry_geojson")) for r in hikes),
            "database_applied":False}
    return merged,osm_rows,report


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--suggestions",type=Path,required=True)
    parser.add_argument("--matches",type=Path,required=True,help="Existing source/model-reviewed CSV")
    parser.add_argument("--osm-json",type=Path)
    parser.add_argument("--fetch-osm",action="store_true",help="Explicit bounded public pilot request; do not use for bulk ingestion")
    parser.add_argument("--output-dir",type=Path,required=True)
    args=parser.parse_args()
    suggestions=json.loads(args.suggestions.read_text())
    validate_plan(suggestions)
    with args.matches.open(newline="") as handle:rows=list(csv.DictReader(handle))
    payload=json.loads(args.osm_json.read_text()) if args.osm_json else None
    if args.fetch_osm:
        if payload is not None:raise ValueError("Choose cached OSM or an explicit refresh, not both")
        from fetch_osm_pilot import build_targeted_query,fetch
        query=build_targeted_query(suggestions["city"]["slug"],suggestions)
        payload=fetch("https://overpass-api.de/api/interpreter",query)
    merged,osm_rows,report=prepare(suggestions,rows,payload)
    args.output_dir.mkdir(parents=True,exist_ok=True)
    report.update(suggestions_sha256=hashlib.sha256(args.suggestions.read_bytes()).hexdigest(),
                  input_matches_sha256=hashlib.sha256(args.matches.read_bytes()).hexdigest())
    write_csv(args.output_dir/"source_checked_matches.csv",merged)
    write_csv(args.output_dir/"osm_matches.csv",osm_rows)
    if args.fetch_osm:(args.output_dir/"raw_osm.json").write_text(json.dumps(payload,ensure_ascii=False))
    (args.output_dir/"source_plan_report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__=="__main__":main()
