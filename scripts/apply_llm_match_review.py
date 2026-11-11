#!/usr/bin/env python3
"""Apply explicit model-reviewed identity labels to generated candidate matches.

Existing automatic matches are preserved unless an explicit review contradicts them.
Review labels are tied to both the suggestion and the exact Overture record ID.
"""
import argparse
import csv
import json
from pathlib import Path


def apply_reviews(rows: list[dict], decisions: list[dict], alternate_records: dict[str, dict] | None = None) -> list[dict]:
    by_key = {}
    for decision in decisions:
        key = (decision["city_slug"], decision["category"], decision["llm_name"])
        if key in by_key:
            raise ValueError(f"Duplicate review: {key}")
        if decision["identity_decision"] not in {"same_feature", "wrong_feature", "uncertain"}:
            raise ValueError(f"Invalid decision: {key}")
        if decision.get("geometry_decision") == "verified" and (
            decision["identity_decision"] != "same_feature" or not decision.get("evidence_url")
        ):
            raise ValueError(f"Verified geometry needs same-feature identity and independent evidence: {key}")
        by_key[key] = decision
    found = set()
    output = []
    for row in rows:
        row = dict(row)
        key = (row["city_slug"], row["category"], row["llm_name"])
        decision = by_key.get(key)
        row["llm_identity_decision"] = "not_reviewed"
        row["llm_review_reason"] = ""
        row["llm_evidence_url"] = ""
        row["llm_geometry_decision"] = "not_verified"
        # Matching status is not a new publication approval workflow.
        row["publish_ready"] = row.get("publish_ready", "not_assessed")
        row["llm_selected_alternate_id"] = ""
        if decision:
            found.add(key)
            if (row.get("candidate_overture_id") or "") != decision["candidate_overture_id"]:
                raise ValueError(f"Stale candidate for {key}; review the new record before applying")
            alternate_id = decision.get("alternate_overture_id")
            if alternate_id:
                alternate = (alternate_records or {}).get(alternate_id)
                if not alternate:
                    raise ValueError(f"Alternate Overture record absent for {key}: {alternate_id}")
                row["llm_selected_alternate_id"] = alternate_id
                row["previous_candidate_overture_id"] = row.get("candidate_overture_id", "")
                row["candidate_overture_id"] = alternate_id
                row["matched_name"] = alternate.get("primary_name") or ""
                row["matched_via"] = row["matched_name"]
                for field in ("latitude", "longitude", "locality", "postcode", "address", "taxonomy_primary", "basic_category", "operating_status"):
                    row[field] = alternate.get(field) or ""
                row["website"] = (alternate.get("websites") or [""])[0]
                row["taxonomy_hierarchy"] = " | ".join(alternate.get("taxonomy_hierarchy") or [])
                row["taxonomy_alternates"] = " | ".join(alternate.get("taxonomy_alternates") or [])
                # Scores/flags for the old candidate are not evidence for its replacement.
                row["previous_match_score"] = row.get("match_score", "")
                row["previous_risk_flags"] = row.get("risk_flags", "")
                for field in ("match_score", "second_score", "score_margin", "risk_flags",
                              "category_compatible", "location_hint_match", "location_hint_distance_km",
                              "duplicate_cluster_ids", "duplicate_cluster_size", "independent_candidate_clusters",
                              "matched_name_source", "overture_confidence", "distance_km"):
                    row[field] = ""
            row["llm_identity_decision"] = decision["identity_decision"]
            row["llm_review_reason"] = decision["reason"]
            row["llm_evidence_url"] = decision.get("evidence_url", "")
            row["llm_geometry_decision"] = decision.get("geometry_decision", "not_verified")
            if row["llm_geometry_decision"] == "contradicted":
                row["geometry_status"] = "source_geometry_contradicted"
            if decision["identity_decision"] == "wrong_feature":
                row["match_status"] = "unmatched"
                row["overture_id"] = ""
                row["geometry_status"] = "needs_location"
                row["publish_ready"] = "false"
            elif decision["identity_decision"] == "same_feature":
                retained_auto = row["match_status"] == "auto_match" and not alternate_id
                row["match_status"] = "review" if row["llm_geometry_decision"] == "contradicted" else "auto_match" if retained_auto else "manual_match"
                row["overture_id"] = row["candidate_overture_id"]
                if row["llm_geometry_decision"] == "not_verified":
                    row["geometry_status"] = "source_geometry_unverified"
            else:
                row["match_status"] = "review"
                row["overture_id"] = ""
                row["publish_ready"] = "false"
                if row["llm_geometry_decision"] != "contradicted":
                    row["geometry_status"] = "source_geometry_unverified"
        output.append(row)
    if found != set(by_key):
        raise ValueError(f"Reviews refer to absent suggestions: {set(by_key) - found}")
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--matches", type=Path, required=True)
    parser.add_argument("--decisions", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--overture-parquet", type=Path, help="Required for model-selected alternate Overture records")
    args = parser.parse_args()
    with args.matches.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    all_decisions = json.loads(args.decisions.read_text(encoding="utf-8"))
    cities = {row["city_slug"] for row in rows}
    decisions = [decision for decision in all_decisions if decision["city_slug"] in cities]
    alternate_records = {}
    if args.overture_parquet:
        import pyarrow.parquet as pq
        wanted = {decision["alternate_overture_id"] for decision in decisions if decision.get("alternate_overture_id")}
        alternate_records = {row["id"]: row for row in pq.read_table(args.overture_parquet).to_pylist() if row["id"] in wanted}
    result = apply_reviews(rows, decisions, alternate_records)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(dict.fromkeys(k for row in result for k in row)))
        writer.writeheader()
        writer.writerows(result)
    from collections import Counter
    print(f"{len(result)} rows, {len(decisions)} explicit reviews, statuses: {dict(Counter(row['match_status'] for row in result))}")


if __name__ == "__main__":
    main()
