"""Reconcile fresh retrieval with prior matches, user decisions and explicit model review."""
import argparse
import csv
import json
from collections import Counter
from pathlib import Path
from import_catalogue_feedback import key

ACCEPTED = {"auto_match", "manual_match", "editorial_only"}


def select_record(row, record):
    row = dict(row)
    row["previous_candidate_overture_id"] = row.get("candidate_overture_id", "")
    row["candidate_overture_id"] = row["overture_id"] = record["id"]
    row["matched_name"] = row["matched_via"] = record.get("primary_name") or ""
    for field in ("latitude", "longitude", "address", "postcode", "locality", "taxonomy_primary", "basic_category", "operating_status"):
        row[field] = record.get(field) if record.get(field) is not None else ""
    row["taxonomy_hierarchy"] = " | ".join(record.get("taxonomy_hierarchy") or [])
    row["taxonomy_alternates"] = " | ".join(record.get("taxonomy_alternates") or [])
    row["website"] = (record.get("websites") or [""])[0]
    row["geometry_status"] = "from_overture"
    row["matched_source"] = "overture"
    row["matched_source_id"] = record["id"]
    row["match_status"] = "manual_match"
    row["llm_identity_decision"] = "same_feature"
    row["llm_geometry_decision"] = "not_verified"
    row["publish_ready"] = "not_assessed"
    # Old candidate scores and warnings cannot be presented as evidence for a new ID.
    if row["previous_candidate_overture_id"] != record["id"]:
        row["previous_match_score"] = row.get("match_score", "")
        row["match_score"] = ""
        row["previous_risk_flags"] = row.get("risk_flags", "")
        row["risk_flags"] = ""
    return row


def reconcile(previous, fresh, reviews, records):
    fresh_by_key = {key(row): row for row in fresh}
    output = []
    for original in previous:
        row = dict(original)
        current = fresh_by_key[key(original)]
        policy = reviews.get(row["city_slug"], {})
        name = row["llm_name"]
        human = row.get("human_decision", "")
        if human == "Accept match" or (row["match_status"] in ACCEPTED and not human):
            # Never silently replace an accepted record just because scoring changed.
            pass
        elif name in policy.get("accept", {}):
            source_id, reason = policy["accept"][name]
            source_id = row.get("candidate_overture_id") if source_id == "current" else current.get("candidate_overture_id") if source_id == "fresh" else source_id
            if source_id == row.get("rejected_overture_id"):
                raise ValueError(f"Cannot reaccept a user-rejected record: {key(row)}")
            if source_id not in records:
                raise ValueError(f"Missing reviewed source ID: {source_id}")
            row = select_record(row, records[source_id])
            if current["match_status"] == "auto_match" and current.get("candidate_overture_id") == source_id and not human:
                row["match_status"] = "auto_match"
            row["continued_review_reason"] = reason
            row["review_authority"] = "llm"
            if human == "Keep unmatched":
                row["replacement_after_user_rejection"] = "True"
        elif name in policy.get("review", {}):
            # The record explicitly rejected by the user stays unmatched until a replacement is accepted.
            row["match_status"] = "unmatched" if human == "Keep unmatched" else "review"
            row["continued_review_reason"] = policy["review"][name]
            row["review_authority"] = "llm"
            row["overture_id"] = ""
        elif row["match_status"] not in ACCEPTED:
            row["continued_review_reason"] = "No sufficiently supported alternative identity found in this cached Overture slice. Retain for later source lookup."
            row["review_authority"] = "llm"
        row["fresh_algorithm_status"] = current["match_status"]
        row["fresh_candidate_id"] = current.get("candidate_overture_id", "")
        row["candidate_alternatives"] = current.get("candidate_alternatives", "[]")
        # Preserve user approval but make contradictory geography visible for recheck.
        if human == "Accept match" and name in policy.get("user_approval_recheck", {}):
            row["user_approval_recheck_note"] = policy["user_approval_recheck"][name]
        output.append(row)
    return output


def write_csv(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    columns = list(dict.fromkeys(field for row in rows for field in row))
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--previous", type=Path, required=True)
    parser.add_argument("--fresh", type=Path, action="append", required=True)
    parser.add_argument("--reviews", type=Path, required=True)
    parser.add_argument("--overture-parquet", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    import pyarrow.parquet as pq
    records = {r["id"]: r for r in pq.read_table(args.overture_parquet).to_pylist()}
    with args.previous.open(newline="", encoding="utf-8") as handle:
        previous = list(csv.DictReader(handle))
    fresh = []
    for path in args.fresh:
        with path.open(newline="", encoding="utf-8") as handle:
            fresh.extend(csv.DictReader(handle))
    rows = reconcile(previous, fresh, json.loads(args.reviews.read_text()), records)
    write_csv(args.output_dir / "all_matches.csv", rows)
    write_csv(args.output_dir / "accepted_matches.csv", [r for r in rows if r["match_status"] in ACCEPTED])
    write_csv(args.output_dir / "pending_and_unmatched.csv", [r for r in rows if r["match_status"] in {"review", "unmatched"}])
    summary = {slug: dict(Counter(r["match_status"] for r in rows if r["city_slug"] == slug)) for slug in sorted({r["city_slug"] for r in rows})}
    (args.output_dir / "summary.json").write_text(json.dumps(summary, indent=2)+"\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
