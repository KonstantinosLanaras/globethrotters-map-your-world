#!/usr/bin/env python3
"""Build an MVP catalogue import and a durable unresolved-item backlog.

Accepted place matches and editorial-only experiences are exported for the
public catalogue. Review and unmatched records are retained in a consolidated
CSV and an internal database queue. Re-running the exporter never removes an
existing backlog row or overwrites a human review decision.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Iterable


MVP_STATUSES = {"auto_match", "manual_match", "editorial_only"}
QUEUE_STATUSES = {"review", "unmatched"}
PUBLISHABLE_OFFICIAL_STATUSES = {"open", "open_with_conditions"}


def normalized_key(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(character for character in text if not unicodedata.combining(character))
    return "-".join(re.findall(r"[a-z0-9]+", text.casefold()))


def editorial_key(row: dict[str, str]) -> str:
    return ":".join((row["city_slug"], row["category"], normalized_key(row["display_name"])))


def optional_float(value: str | None) -> float | None:
    if value is None or str(value).strip() == "":
        return None
    return float(value)


def optional_int(value: str | None) -> int | None:
    if value is None or str(value).strip() == "":
        return None
    return int(value)


def split_flags(value: str | None) -> list[str]:
    return [flag.strip() for flag in (value or "").split("|") if flag.strip()]


def requires_official_verification(row: dict[str, str]) -> bool:
    return str(row.get("official_verification_required") or "").casefold() == "true"


def has_publishable_official_status(row: dict[str, str]) -> bool:
    return str(row.get("official_status") or "").casefold() in PUBLISHABLE_OFFICIAL_STATUSES


def effective_row(row: dict[str, str]) -> dict[str, str]:
    """Route safety is an export gate, independent of source matching quality."""
    from route_quality import named_hike, route_hold_reasons
    from catalogue_taxonomy import classify
    group, reason = classify(row)
    if not group:
        gated = dict(row)
        if gated.get("match_status") != "unmatched": gated["match_status"] = "review"
        gated["risk_flags"] = " | ".join(dict.fromkeys([*split_flags(gated.get("risk_flags")), "subcategory_review_required", reason]))
        return gated
    if named_hike(row):
        reasons=route_hold_reasons(row)
        if reasons:
            gated=dict(row)
            if gated.get("match_status")!="unmatched":gated["match_status"]="review"
            gated["risk_flags"]=" | ".join(dict.fromkeys([*split_flags(gated.get("risk_flags")),*reasons]))
            return gated
    if row.get("geometry_status") == "source_geometry_contradicted":
        gated = dict(row)
        gated["match_status"] = "review"
        return gated
    if not requires_official_verification(row) or has_publishable_official_status(row):
        return row
    gated = dict(row)
    gated["match_status"] = "review"
    flags = split_flags(gated.get("risk_flags"))
    if "official_verification_required" not in flags:
        flags.append("official_verification_required")
    gated["risk_flags"] = " | ".join(flags)
    return gated


def json_object(value: str | None) -> dict[str, Any]:
    if not value or not str(value).strip():
        return {}
    parsed = json.loads(value)
    if not isinstance(parsed, dict):
        raise ValueError("Expected a JSON object")
    return parsed


def read_rows(paths: Iterable[Path]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for path in paths:
        with path.open(newline="", encoding="utf-8-sig") as handle:
            for row in csv.DictReader(handle):
                if not row.get("city_slug"):
                    raise ValueError(f"{path} has no city_slug value; regenerate it with match_llm_to_overture.py")
                rows.append(row)
    return rows


def mvp_record(row: dict[str, str], run_label: str) -> dict[str, Any]:
    from route_quality import named_hike, valid_route_geometry
    from catalogue_taxonomy import classify, VERSION
    group, classification_reason = classify(row)
    if not group:
        raise ValueError("Cannot publish without a canonical subcategory: " + classification_reason)
    key = editorial_key(row)
    is_matched = row["match_status"] in {"auto_match", "manual_match"}
    source = row.get("matched_source") or ("overture" if is_matched else "curated")
    source_id = row.get("matched_source_id") or (
        row.get("overture_id") if is_matched else f"llm-editorial:{key}"
    )
    return {
        "city_slug": row["city_slug"],
        "editorial_key": key,
        "name": row["display_name"],
        "latitude": optional_float(row.get("latitude")),
        "longitude": optional_float(row.get("longitude")),
        "canonical_category": row["category"],
        "subcategory": row.get("llm_subtype") or row["category"],
        "subcategory_key": group,
        "description": row.get("experience_description") or None,
        "source": source,
        "source_id": source_id,
        "source_confidence": (
            optional_float(row.get("overture_confidence"))
            if source == "overture"
            else optional_float(row.get("match_score")) if source == "osm" else 1.0
        ),
        "quality_tier": "editorial",
        "selection_rank": optional_int(row.get("rank")),
        "content_kind": row.get("content_kind") or "place",
        "area_name": row.get("area_name") or None,
        "recommended_time": row.get("recommended_time") or None,
        "geometry_type": row.get("geometry_type") or ("point" if is_matched else None),
        "geometry_geojson": (json.loads(row["geometry_geojson"]) if isinstance(row.get("geometry_geojson"),str) else row.get("geometry_geojson"))
            if valid_route_geometry(row.get("geometry_geojson")) else None,
        "target_audience": row.get("target_audience") or "general",
        "young_traveller_score": optional_float(row.get("young_traveller_score")),
        "audience_scores": json_object(row.get("audience_scores")),
        "selection_reasons": split_flags(row.get("selection_reasons")),
        "trip_styles": split_flags(row.get("trip_styles")),
        "suitable_for": split_flags(row.get("suitable_for")),
        "budget_level": row.get("budget_level") or None,
        "typical_duration_minutes": optional_int(row.get("typical_duration_minutes")),
        "seasonality": split_flags(row.get("seasonality")),
        "metadata": {
            "taxonomy_version": VERSION,
            "subcategory_classification_reason": classification_reason,
            "editorial_key": key,
            "match_status": row["match_status"],
            "match_score": optional_float(row.get("match_score")),
            "risk_flags": split_flags(row.get("risk_flags")),
            "matched_overture_name": row.get("matched_name") or None,
            "matched_source": source,
            "route_identity_required": named_hike(row),
            "route_identity_confirmed": str(row.get("route_identity_confirmed") or "").casefold()=="true",
            "route_ref": row.get("route_ref") or None,
            "route_source_url": row.get("route_source_url") or None,
            "official_source_url": row.get("official_source_url") or None,
            "route_geometry_status": row.get("route_geometry_status") or None,
            "route_attributes": json_object(row.get("route_attributes")),
            "official_status": row.get("official_status") or None,
            "official_status_checked_at": row.get("official_status_checked_at") or None,
            "official_conditions": row.get("official_conditions") or None,
            "reservation_required": row.get("reservation_required") == "true",
            "reservation_url": row.get("reservation_url") or None,
            "editorial_anchor_name": row.get("editorial_anchor_name") or None,
            "editorial_anchor_precision": row.get("editorial_anchor_precision") or None,
            "overture_release": row.get("overture_release") or None,
            "catalogue_run": run_label,
            "human_decision": row.get("human_decision") or None,
            "human_notes": row.get("human_notes") or None,
            "match_review_reason": row.get("continued_review_reason") or row.get("llm_review_reason") or None,
            "user_approval_recheck_note": row.get("user_approval_recheck_note") or None,
            "review_authority": row.get("review_authority") or None,
        },
    }


def queue_record(row: dict[str, str], run_label: str) -> dict[str, Any]:
    from catalogue_taxonomy import classify
    group, classification_reason = classify(row)
    key = editorial_key(row)
    return {
        "city_slug": row["city_slug"],
        "editorial_key": key,
        "name": row["display_name"],
        "canonical_category": row["category"],
        "subcategory": row.get("llm_subtype") or row["category"],
        "subcategory_key": group,
        "content_kind": row.get("content_kind") or "place",
        "selection_rank": optional_int(row.get("rank")),
        "description": row.get("experience_description") or None,
        "current_match_status": row["match_status"],
        "reason_flags": split_flags(row.get("risk_flags")),
        "match_score": optional_float(row.get("match_score")),
        "candidate_source": (
            "osm" if row.get("osm_id") else "overture" if row.get("candidate_overture_id") else None
        ),
        "candidate_source_id": row.get("osm_id") or row.get("candidate_overture_id") or None,
        "candidate_name": row.get("matched_name") or None,
        "candidate_payload": {
            "address": row.get("address") or None,
            "locality": row.get("locality") or None,
            "postcode": row.get("postcode") or None,
            "latitude": optional_float(row.get("latitude")),
            "longitude": optional_float(row.get("longitude")),
            "taxonomy_primary": row.get("taxonomy_primary") or None,
            "category_compatible": row.get("category_compatible") or None,
            "second_score": optional_float(row.get("second_score")),
            "duplicate_cluster_ids": row.get("duplicate_cluster_ids") or None,
            "candidate_alternatives": json.loads(row.get("candidate_alternatives") or "[]"),
            "candidate_alternatives_truncated": str(row.get("candidate_alternatives_truncated") or "").casefold() == "true",
            "osm_candidate_alternatives": json.loads(row.get("osm_candidate_alternatives") or "[]"),
            "route_ref": row.get("route_ref") or None,
            "route_geometry_status": row.get("route_geometry_status") or None,
        },
        "proposed_payload": {
            "official_verification_required": requires_official_verification(row),
            "official_status": row.get("official_status") or None,
            "official_status_checked_at": row.get("official_status_checked_at") or None,
            "official_source_url": row.get("official_source_url") or None,
            "route_identity_required": str(row.get("route_identity_required") or "").casefold()=="true",
            "human_decision": row.get("human_decision") or None,
            "human_notes": row.get("human_notes") or None,
            "continued_review_reason": row.get("continued_review_reason") or None,
            "aliases": row.get("llm_aliases") or None,
            "area_name": row.get("area_name") or None,
            "recommended_time": row.get("recommended_time") or None,
            "expected_locality": row.get("expected_locality") or None,
            "expected_neighbourhood": row.get("expected_neighbourhood") or None,
            "expected_address": row.get("expected_address") or None,
            "expected_postcode": row.get("expected_postcode") or None,
        },
        "source_run": run_label,
    }


def review_csv_record(record: dict[str, Any], previous: dict[str, str] | None = None) -> dict[str, Any]:
    previous = previous or {}
    previous_queue_status = previous.get("queue_status") or "pending"
    # A machine-resolved row must return to the active queue if a later run can
    # no longer match it. A human decision remains authoritative.
    queue_status = (
        "pending"
        if previous_queue_status == "resolved" and not previous.get("review_decision")
        else previous_queue_status
    )
    return {
        "city_slug": record["city_slug"],
        "category": record["canonical_category"],
        "rank": record["selection_rank"] or "",
        "name": record["name"],
        "subcategory": record["subcategory"],
        "content_kind": record["content_kind"],
        "latest_match_status": record["current_match_status"],
        "queue_status": queue_status,
        "reason_flags": " | ".join(record["reason_flags"]),
        "match_score": record["match_score"] if record["match_score"] is not None else "",
        "candidate_name": record["candidate_name"] or "",
        "candidate_source_id": record["candidate_source_id"] or "",
        "candidate_address": record["candidate_payload"].get("address") or "",
        "candidate_locality": record["candidate_payload"].get("locality") or "",
        "expected_address": record["proposed_payload"].get("expected_address") or "",
        "expected_neighbourhood": record["proposed_payload"].get("expected_neighbourhood") or "",
        "description": record["description"] or "",
        "review_decision": previous.get("review_decision") or record["proposed_payload"].get("human_decision") or "",
        "review_notes": previous.get("review_notes") or record["proposed_payload"].get("human_notes") or "",
        "continued_review_reason": record["proposed_payload"].get("continued_review_reason") or "",
        "editorial_key": record["editorial_key"],
        "source_run": record["source_run"],
    }


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(dict.fromkeys(key for row in rows for key in row)))
        writer.writeheader()
        writer.writerows(
            {
                key: json.dumps(value, ensure_ascii=False, separators=(",", ":"))
                if isinstance(value, (dict, list))
                else value
                for key, value in row.items()
            }
            for row in rows
        )


def load_existing_backlog(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists() or path.stat().st_size == 0:
        return {}
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return {row["editorial_key"]: row for row in csv.DictReader(handle)}


def merge_review_backlog(
    all_rows: list[dict[str, str]], queue_records: list[dict[str, Any]], backlog_path: Path
) -> list[dict[str, Any]]:
    existing = load_existing_backlog(backlog_path)
    merged: dict[str, dict[str, Any]] = dict(existing)
    for record in queue_records:
        key = record["editorial_key"]
        merged[key] = review_csv_record(record, existing.get(key))
    for row in all_rows:
        key = editorial_key(row)
        if row["match_status"] in MVP_STATUSES and key in merged:
            historical = dict(merged[key])
            historical["latest_match_status"] = row["match_status"]
            if historical.get("queue_status") == "pending":
                historical["queue_status"] = "resolved"
            merged[key] = historical
    return sorted(
        merged.values(),
        key=lambda row: (row.get("queue_status") == "resolved", row["city_slug"], row["category"], int(row["rank"] or 9999)),
    )


def write_sql(path: Path, mvp_records: list[dict[str, Any]], queue_records: list[dict[str, Any]]) -> None:
    mvp_json = json.dumps(mvp_records, ensure_ascii=False, separators=(",", ":"))
    queue_json = json.dumps(queue_records, ensure_ascii=False, separators=(",", ":"))
    if "$catalog$" in mvp_json or "$queue$" in queue_json:
        raise ValueError("Record text contains a reserved SQL payload delimiter")
    sql = f"""-- Generated by scripts/export_llm_catalogue.py; safe to re-run.
-- It never deletes review-queue rows or overwrites review decisions/notes.

WITH incoming AS (
  SELECT * FROM jsonb_to_recordset($catalog${mvp_json}$catalog$::jsonb) AS x(
    city_slug text, editorial_key text, name text, latitude double precision,
    longitude double precision, canonical_category text, subcategory text, subcategory_key text,
    description text, source text, source_id text, source_confidence numeric,
    quality_tier text, selection_rank integer, content_kind text, area_name text,
    recommended_time text, geometry_type text, geometry_geojson jsonb,
    target_audience text, young_traveller_score numeric, audience_scores jsonb,
    selection_reasons text[], trip_styles text[], suitable_for text[],
    budget_level text, typical_duration_minutes integer, seasonality text[], metadata jsonb
  )
)
INSERT INTO public.catalog_items (
  city_id, name, latitude, longitude, canonical_category, subcategory, subcategory_key,
  description, source, source_id, source_confidence, quality_tier,
  selection_rank, content_kind, area_name, recommended_time, geometry_type,
  geometry_geojson, target_audience, young_traveller_score, audience_scores,
  selection_reasons, trip_styles, suitable_for, budget_level,
  typical_duration_minutes, seasonality, metadata, is_active,
  last_verified_at, updated_at
)
SELECT city.id, incoming.name, incoming.latitude, incoming.longitude,
  incoming.canonical_category, incoming.subcategory, incoming.subcategory_key, incoming.description,
  incoming.source, incoming.source_id, incoming.source_confidence,
  incoming.quality_tier, incoming.selection_rank, incoming.content_kind,
  incoming.area_name, incoming.recommended_time, incoming.geometry_type,
  incoming.geometry_geojson, incoming.target_audience,
  incoming.young_traveller_score, incoming.audience_scores,
  incoming.selection_reasons, incoming.trip_styles, incoming.suitable_for,
  incoming.budget_level, incoming.typical_duration_minutes,
  incoming.seasonality, incoming.metadata, true, now(), now()
FROM incoming
JOIN public.catalog_cities AS city ON city.slug = incoming.city_slug
ON CONFLICT (source, source_id) DO UPDATE SET
  city_id = EXCLUDED.city_id,
  name = EXCLUDED.name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  canonical_category = EXCLUDED.canonical_category,
  subcategory = EXCLUDED.subcategory,
  subcategory_key = EXCLUDED.subcategory_key,
  description = EXCLUDED.description,
  source_confidence = EXCLUDED.source_confidence,
  quality_tier = CASE WHEN public.catalog_items.quality_tier = 'coverage'
    THEN EXCLUDED.quality_tier ELSE public.catalog_items.quality_tier END,
  selection_rank = EXCLUDED.selection_rank,
  content_kind = EXCLUDED.content_kind,
  area_name = EXCLUDED.area_name,
  recommended_time = EXCLUDED.recommended_time,
  geometry_type = EXCLUDED.geometry_type,
  geometry_geojson = EXCLUDED.geometry_geojson,
  target_audience = EXCLUDED.target_audience,
  young_traveller_score = EXCLUDED.young_traveller_score,
  audience_scores = EXCLUDED.audience_scores,
  selection_reasons = EXCLUDED.selection_reasons,
  trip_styles = EXCLUDED.trip_styles,
  suitable_for = EXCLUDED.suitable_for,
  budget_level = EXCLUDED.budget_level,
  typical_duration_minutes = EXCLUDED.typical_duration_minutes,
  seasonality = EXCLUDED.seasonality,
  metadata = public.catalog_items.metadata || EXCLUDED.metadata,
  is_active = true,
  last_verified_at = now(),
  updated_at = now();

WITH incoming AS (
  SELECT * FROM jsonb_to_recordset($queue${queue_json}$queue$::jsonb) AS x(
    city_slug text, editorial_key text, name text, canonical_category text,
    subcategory text, subcategory_key text, content_kind text, selection_rank integer,
    description text, current_match_status text, reason_flags text[],
    match_score numeric, candidate_source text, candidate_source_id text,
    candidate_name text, candidate_payload jsonb, proposed_payload jsonb,
    source_run text
  )
)
INSERT INTO public.catalog_review_queue AS existing (
  city_id, editorial_key, name, canonical_category, subcategory, subcategory_key, content_kind,
  selection_rank, description, current_match_status, reason_flags, match_score,
  candidate_source, candidate_source_id, candidate_name, candidate_payload,
  proposed_payload, source_run, last_seen_at, updated_at
)
SELECT city.id, incoming.editorial_key, incoming.name,
  incoming.canonical_category, incoming.subcategory, incoming.subcategory_key, incoming.content_kind,
  incoming.selection_rank, incoming.description, incoming.current_match_status,
  incoming.reason_flags, incoming.match_score, incoming.candidate_source,
  incoming.candidate_source_id, incoming.candidate_name,
  incoming.candidate_payload, incoming.proposed_payload, incoming.source_run,
  now(), now()
FROM incoming
JOIN public.catalog_cities AS city ON city.slug = incoming.city_slug
ON CONFLICT (city_id, editorial_key) DO UPDATE SET
  name = EXCLUDED.name,
  canonical_category = EXCLUDED.canonical_category,
  subcategory = EXCLUDED.subcategory,
  subcategory_key = EXCLUDED.subcategory_key,
  content_kind = EXCLUDED.content_kind,
  selection_rank = EXCLUDED.selection_rank,
  description = EXCLUDED.description,
  current_match_status = EXCLUDED.current_match_status,
  reason_flags = EXCLUDED.reason_flags,
  match_score = EXCLUDED.match_score,
  candidate_source = EXCLUDED.candidate_source,
  candidate_source_id = EXCLUDED.candidate_source_id,
  candidate_name = EXCLUDED.candidate_name,
  candidate_payload = EXCLUDED.candidate_payload,
  proposed_payload = EXCLUDED.proposed_payload,
  source_run = EXCLUDED.source_run,
  review_status = CASE
    WHEN existing.review_status = 'resolved'
      AND existing.reviewed_at IS NULL
    THEN 'pending'
    ELSE existing.review_status
  END,
  resolved_catalog_item_id = CASE
    WHEN existing.review_status = 'resolved'
      AND existing.reviewed_at IS NULL
    THEN NULL
    ELSE existing.resolved_catalog_item_id
  END,
  last_seen_at = now(),
  updated_at = now();

WITH accepted_in_this_batch AS (
  SELECT * FROM jsonb_to_recordset($catalog${mvp_json}$catalog$::jsonb)
    AS x(city_slug text, editorial_key text, source text, source_id text)
)
UPDATE public.catalog_review_queue AS queue
SET review_status = 'resolved',
    resolved_catalog_item_id = item.id,
    updated_at = now()
FROM public.catalog_items AS item, accepted_in_this_batch AS accepted,
     public.catalog_cities AS city
WHERE queue.review_status = 'pending'
  AND queue.reviewed_at IS NULL
  AND item.source = accepted.source AND item.source_id = accepted.source_id
  AND city.id = item.city_id AND city.slug = accepted.city_slug
  AND queue.editorial_key = accepted.editorial_key
  AND item.metadata->>'editorial_key' = queue.editorial_key
  AND item.city_id = queue.city_id;

SELECT review_status, count(*) AS records
FROM public.catalog_review_queue
GROUP BY review_status
ORDER BY review_status;
"""
    path.write_text(sql, encoding="utf-8")


def write_split_sql_files(combined_path: Path, items_path: Path, queue_path: Path) -> None:
    """Split the generated import for SQL editors with conservative paste limits."""
    sql = combined_path.read_text(encoding="utf-8")
    marker = "\nWITH incoming AS (\n  SELECT * FROM jsonb_to_recordset($queue$"
    if marker not in sql:
        raise ValueError("Could not locate the review-queue section in generated SQL")
    items_sql, queue_tail = sql.split(marker, 1)
    items_path.write_text(items_sql.rstrip() + "\n", encoding="utf-8")
    queue_path.write_text(
        "-- Generated review-queue import; safe to re-run.\n"
        "-- It never deletes rows or overwrites human review decisions/notes.\n\n"
        "WITH incoming AS (\n  SELECT * FROM jsonb_to_recordset($queue$"
        + queue_tail,
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--matches", action="append", type=Path, required=True, help="Proposed catalogue CSV; repeat for more cities")
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--run-label", required=True)
    parser.add_argument("--import-policy", type=Path, default=Path(__file__).parent / "data" / "catalogue_import_policy.json")
    parser.add_argument("--governance-ledger", type=Path, default=Path(__file__).parent / "data" / "catalogue_batch_governance.json")
    parser.add_argument("--batch-id", help="Stable package ID across retries; defaults to run label")
    parser.add_argument("--review-backlog-path", type=Path, default=Path(__file__).resolve().parent.parent / "outputs" / "catalogue_review_backlog.csv")
    parser.add_argument("--editorial-fallback-policy", type=Path, default=Path(__file__).parent / "data" / "editorial_fallback_policy.json",
                        help="Authored reserve and destination targets; total editorial is capped at 2x baseline")
    parser.add_argument(
        "--exclude-editorial-key",
        action="append",
        default=[],
        help="Skip a known semantic duplicate already represented in the target catalogue; repeat as needed",
    )
    args = parser.parse_args()

    excluded_keys = set(args.exclude_editorial_key)
    rows = [
        effective_row(row)
        for row in read_rows(args.matches)
        if editorial_key(row) not in excluded_keys
    ]
    if args.editorial_fallback_policy:
        from editorial_fallback import add_editorial_fallback
        rows, fallback_report = add_editorial_fallback(rows, json.loads(args.editorial_fallback_policy.read_text(encoding="utf-8")))
        print(json.dumps({"editorial_fallback": fallback_report}))
    rows = [effective_row(row) for row in rows]
    from catalogue_batch_gate import evaluate_batch, valid_match
    for index, row in enumerate(rows):
        if row["match_status"] in {"auto_match", "manual_match"} and not valid_match(row):
            row = dict(row)
            row["match_status"] = "review"
            row["risk_flags"] = " | ".join([*split_flags(row.get("risk_flags")), "invalid_or_rejected_match"])
            rows[index] = row
    policy = json.loads(args.import_policy.read_text(encoding="utf-8"))
    ledger = json.loads(args.governance_ledger.read_text(encoding="utf-8"))
    gate = evaluate_batch(rows, policy, ledger, args.batch_id or args.run_label)
    authorized = {d["city_slug"] for d in gate["destinations"] if d["import_authorized"]}
    candidate_rows = [row for row in rows if row["match_status"] == "editorial_only" or valid_match(row)]
    candidate_records = [mvp_record(row, args.run_label) for row in candidate_rows]
    mvp_records = [mvp_record(row, args.run_label) for row in candidate_rows if row["city_slug"] in authorized]
    queue_records = [queue_record(row, args.run_label) for row in rows if row["match_status"] in QUEUE_STATUSES]
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "catalog_batch_gate.json").write_text(json.dumps(gate, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    write_csv(args.output_dir / "catalog_accepted_candidates.csv", candidate_records)

    ready_path = args.output_dir / "catalog_mvp_ready.csv"
    backlog_path = args.output_dir / "catalog_review_backlog.csv"
    sql_path = args.output_dir / "catalog_mvp_import.sql"
    items_sql_path = args.output_dir / "catalog_mvp_items_import.sql"
    queue_sql_path = args.output_dir / "catalog_review_queue_import.sql"
    write_csv(ready_path, mvp_records)
    accumulated = merge_review_backlog(rows, queue_records, args.review_backlog_path)
    args.review_backlog_path.parent.mkdir(parents=True, exist_ok=True)
    write_csv(args.review_backlog_path, accumulated)
    write_csv(backlog_path, accumulated)
    write_sql(sql_path, mvp_records, queue_records)
    write_split_sql_files(sql_path, items_sql_path, queue_sql_path)
    print(json.dumps({
        "input_records": len(rows),
        "mvp_ready": len(mvp_records),
        "accepted_candidates": len(candidate_records),
        "coverage_gate": gate["destinations"],
        "queued_for_review": len(queue_records),
        "review_backlog_total": len(load_existing_backlog(backlog_path)),
        "output_dir": str(args.output_dir),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
