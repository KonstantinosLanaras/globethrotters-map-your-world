"""Package an authorized destination batch for execution in Lovable/Supabase."""
import argparse
import csv
import json
import hashlib
import re
import shutil
import zipfile
from collections import Counter
from pathlib import Path


def build(export_dir, output_dir, destination_definitions=None, editorial_fallback_policy=None):
    gate=json.loads((export_dir/"catalog_batch_gate.json").read_text())
    if not (gate["human_approval_valid"] or gate.get("automatic_import_enabled")):
        raise ValueError("Exact human approval or an explicitly authorized automatic threshold policy is required")
    authorized={d["city_slug"] for d in gate["destinations"] if d["import_authorized"]}
    with (export_dir/"catalog_mvp_ready.csv").open(newline="",encoding="utf-8") as handle:
        rows=list(csv.DictReader(handle))
    if not rows or {r["city_slug"] for r in rows} != authorized:
        raise ValueError("Approved destinations and item payload do not agree")
    queue_payload=json.loads((export_dir/"catalog_review_queue_import.sql").read_text().split("$queue$",2)[1])
    slugs=sorted(authorized | {r["city_slug"] for r in queue_payload})
    definitions=json.loads((destination_definitions or Path(__file__).parent/"data/island_destinations.json").read_text())
    for slug in slugs:
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
            raise ValueError("Invalid destination slug")
        definition=definitions[slug]
        if any(not definition.get(field) for field in ["country", "country_code", "destination_type"]):
            raise ValueError(f"Destination geography metadata is missing for {slug}")
        target=next(d["initial_target"] for d in gate["destinations"] if d["city_slug"]==slug)
        if definition["target"] != target:
            raise ValueError(f"Destination SQL target differs from original matching target for {slug}")
    destinations=[{"slug":slug,**definitions[slug],"publish_accepted":slug in authorized} for slug in slugs]
    identities=[{k:r[k] for k in ["city_slug","source","source_id"]} for r in rows]
    if len({(r["source"],r["source_id"]) for r in rows}) != len(rows):
        raise ValueError("Duplicate source identity in import package")
    counts=dict(Counter(r["city_slug"] for r in rows))
    releases=sorted({metadata.get("overture_release") for r in rows
                     if (metadata := json.loads(r.get("metadata") or "{}")).get("overture_release")})
    source_description=("cached Overture release " + releases[0] if len(releases)==1 else
                        "cached Overture releases " + ", ".join(releases) if releases else
                        "cached source records (release not recorded)")
    for r in rows:
        if r["content_kind"]=="place" and (not r["latitude"] or not r["longitude"]):
            raise ValueError("A place record is missing coordinates")
    output_dir.mkdir(parents=True,exist_ok=True)
    data=json.dumps(destinations,ensure_ascii=False)
    ids=json.dumps(identities,ensure_ascii=False)
    queue_identities=[{"city_slug":r["city_slug"],"editorial_key":r["editorial_key"]} for r in queue_payload]
    queue_ids=json.dumps(queue_identities,ensure_ascii=False)
    names=" / ".join(definitions[slug]["name"] for slug in sorted(authorized))
    requirements="""DO $guard$
BEGIN
  IF to_regclass('public.catalog_cities') IS NULL OR to_regclass('public.catalog_items') IS NULL
     OR to_regclass('public.catalog_review_queue') IS NULL THEN
    RAISE EXCEPTION 'Required catalogue/review schema missing. Confirm existing migrations; do not bypass this guard.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name='catalog_cities' AND column_name='content_target') THEN
    RAISE EXCEPTION 'Destination foundation schema missing; apply the existing migration first.';
  END IF;
END $guard$;
"""
    city_sql=f"""WITH incoming AS (
  SELECT * FROM jsonb_to_recordset($dest${data}$dest$::jsonb) AS x(
    slug text, name text, country text, country_code text, destination_type text,
    latitude double precision, longitude double precision, target integer, radius integer,publish_accepted boolean)
)
INSERT INTO public.catalog_cities(slug,name,country,country_code,country_codes,latitude,longitude,
 destination_type,search_radius_km,is_launch_city,is_active,beachhead_tier,beachhead_status,
 target_audience,content_target,matching_strategy)
SELECT slug,name,country,country_code,ARRAY[country_code],latitude,longitude,destination_type,radius,false,publish_accepted,1,'pilot',
 'general',target,'single_radius' FROM incoming
ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,
 country=EXCLUDED.country,country_code=EXCLUDED.country_code,country_codes=EXCLUDED.country_codes,
 destination_type=EXCLUDED.destination_type,is_active=public.catalog_cities.is_active OR EXCLUDED.is_active,content_target=EXCLUDED.content_target,
 search_radius_km=EXCLUDED.search_radius_km,matching_strategy='single_radius',updated_at=now();
"""
    ownership=f"""DO $ownership$
BEGIN
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset($ids${ids}$ids$::jsonb) AS incoming(city_slug text,source text,source_id text)
    JOIN public.catalog_items item ON item.source=incoming.source AND item.source_id=incoming.source_id
    JOIN public.catalog_cities city ON city.id=item.city_id
    WHERE city.slug NOT IN (incoming.city_slug,'balearic-islands-es')
  ) THEN RAISE EXCEPTION 'A source record belongs to another destination. Stop and inspect ownership before importing.';
  END IF;
END $ownership$;
"""
    verification=f"""WITH expected AS (
 SELECT * FROM jsonb_to_recordset($ids${ids}$ids$::jsonb) AS x(city_slug text,source text,source_id text)
)
SELECT expected.city_slug,COUNT(*) AS package_items_expected,
 COUNT(item.id) FILTER(WHERE city.slug=expected.city_slug AND item.is_active AND item.quality_tier<>'coverage') AS package_items_found
FROM expected LEFT JOIN public.catalog_items item ON item.source=expected.source AND item.source_id=expected.source_id
LEFT JOIN public.catalog_cities city ON city.id=item.city_id GROUP BY expected.city_slug ORDER BY expected.city_slug;

SELECT city.slug,city.destination_type,city.is_active,COUNT(item.id) FILTER(WHERE item.is_active AND item.quality_tier<>'coverage') AS all_public_items
FROM public.catalog_cities city LEFT JOIN public.catalog_items item ON item.city_id=city.id
WHERE city.slug IN ({','.join(repr(slug) for slug in sorted(authorized))}) GROUP BY city.id ORDER BY city.slug;

WITH expected AS (
 SELECT * FROM jsonb_to_recordset($queueids${queue_ids}$queueids$::jsonb)
 AS x(city_slug text,editorial_key text)
)
SELECT expected.city_slug,COUNT(*) AS retained_queue_expected,COUNT(queue.id) AS retained_queue_found
FROM expected LEFT JOIN public.catalog_cities city ON city.slug=expected.city_slug
LEFT JOIN public.catalog_review_queue queue ON queue.city_id=city.id AND queue.editorial_key=expected.editorial_key
GROUP BY expected.city_slug ORDER BY expected.city_slug;
"""
    assert_sql=f"""DO $verify$
BEGIN
 IF EXISTS (
  SELECT 1 FROM jsonb_to_recordset($ids${ids}$ids$::jsonb) AS incoming(city_slug text,source text,source_id text)
  LEFT JOIN public.catalog_items item ON item.source=incoming.source AND item.source_id=incoming.source_id
  LEFT JOIN public.catalog_cities city ON city.id=item.city_id
  WHERE item.id IS NULL OR city.slug IS DISTINCT FROM incoming.city_slug OR item.is_active IS NOT TRUE
     OR item.quality_tier IS NULL OR item.quality_tier='coverage'
 ) THEN RAISE EXCEPTION 'Imported package row verification failed; rolling back.'; END IF;
 IF EXISTS (
  SELECT 1 FROM jsonb_to_recordset($queueids${queue_ids}$queueids$::jsonb) AS incoming(city_slug text,editorial_key text)
  LEFT JOIN public.catalog_cities city ON city.slug=incoming.city_slug
  LEFT JOIN public.catalog_review_queue queue ON queue.city_id=city.id AND queue.editorial_key=incoming.editorial_key
  WHERE queue.id IS NULL
 ) THEN RAISE EXCEPTION 'Unresolved queue retention failed; rolling back.'; END IF;
END $verify$;
"""
    items=(export_dir/"catalog_mvp_items_import.sql").read_text()
    queue=(export_dir/"catalog_review_queue_import.sql").read_text()
    transaction="-- Approved package. Run this complete file once; it is idempotent.\nBEGIN;\n"+requirements+ownership+city_sql+items+"\n"+queue+"\n"+assert_sql+"\nCOMMIT;\n"+verification
    (output_dir/"01_apply_approved_batch.sql").write_text(transaction)
    (output_dir/"02_verify_after_import.sql").write_text(verification)
    (output_dir/"00_read_only_preflight.sql").write_text(f"SELECT c.slug,c.name,c.destination_type,c.is_active,COUNT(i.id) AS existing_items FROM public.catalog_cities c LEFT JOIN public.catalog_items i ON i.city_id=c.id WHERE c.slug IN ({','.join(repr(slug) for slug in ['balearic-islands-es',*slugs])}) GROUP BY c.id ORDER BY c.slug;\n")
    manifest={"batch_id":gate["batch_id"],"fingerprint":gate["fingerprint"],"expected_package_counts":counts,
              "total_items":len(rows),"approval_recorded":True,"applied_to_live_database":False,
              "expected_review_queue_counts":dict(Counter(r["city_slug"] for r in queue_payload)),
              "authorization_mode":gate.get("approval_mode","supervised"),
              "transaction_sha256":hashlib.sha256(transaction.encode()).hexdigest(),
              "overture_release":releases[0] if len(releases)==1 else None,"overture_releases":releases,
              "import_type":"upsert_preserving_ids_and_existing_noncoverage_tiers"}
    (output_dir/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
    for name in ["catalog_mvp_ready.csv","catalog_review_backlog.csv","catalog_batch_gate.json"]:
        shutil.copyfile(export_dir/name,output_dir/name)
    request=f"""# Lovable request: authorized {names} import

Apply the attached approved catalogue package `{gate['batch_id']}` to the existing project. Expected package records: {json.dumps(counts)} ({len(rows)} total). These are upserts, not guaranteed net-new counts.

1. Run `00_read_only_preflight.sql` and report existing destination counts. Inspect schema compatibility. Do not bypass privilege restrictions or invent a temporary privileged helper.
2. Run the entire `01_apply_approved_batch.sql` as one transaction. It creates/upserts the destination records, checks unrelated source ownership, upserts accepted items, and retains {len(queue_payload)} unresolved records in `catalog_review_queue`. Existing item IDs/saved-user references and noncoverage quality tiers are preserved. Only records already assigned to the old Balearic group may move to the appropriate destination. No deletes. Item and queue checks run before COMMIT and abort the whole batch if either fails.
3. Run `02_verify_after_import.sql`. Package-item checks must be {json.dumps(counts)}. Total public catalogue counts can be higher if other records already exist.
4. Ensure {names} are separate clickable destinations, using active database destinations with noncoverage items. Do not rely on an island-group dot. Invalidate/refresh catalogue destination and item queries (the existing destination cache may last 15 minutes). Click each destination and verify the cards. Preserve unrelated code and frontend changes.
5. Report transaction result, exact package and total counts, category counts, queue counts, source-ownership moves and actual preview behaviour. Do not claim success from SQL generation alone.

This request authorizes only this package. Do not clear prior review records or make Google/paid AI requests. No additional matching is required once the coverage gate passes. Future batches use the user-signed 60% threshold policy, retaining rejected/uncertain records rather than publishing them. Do not claim live automation is connected merely because the local policy flag is enabled.

## Important limitations

Source records use {source_description}, not a current opening-hours check. Broad editorial experiences may have no point geometry by design; they keep their activity category. Preserve all review notes. The 60% gate is coverage, not measured precision. Do not publish pending, unmatched, wrong-feature or contradictory-coordinate records.
"""
    (output_dir/"LOVABLE_IMPORT_REQUEST.md").write_text(request)
    (output_dir/"README.md").write_text(f"""# {names} — ready for SQL import

This ZIP is an import package, not proof of a live import.

In Supabase SQL Editor run these complete files one at a time:

1. 00_read_only_preflight.sql — inspect existing destinations; stop on error.
2. 01_apply_approved_batch.sql — run the WHOLE file as one transaction. Accepted items and unresolved queue records are checked before COMMIT.
3. 02_verify_after_import.sql — expected package counts: {json.dumps(counts)}. Retained queue counts: {json.dumps(manifest['expected_review_queue_counts'])}. Found must equal expected. Overall public totals may be higher because previous records are preserved.

No further matching is needed for this batch. Pending/unmatched records are not public experiences; they are retained in public.catalog_review_queue for later review. No deletes or review-note resets. Reload the preview after import. UI colour/legend changes are a separate frontend package.

The Markdown instructions are optional if you execute the SQL yourself. Do not paste CSV, JSON, Python or Markdown into SQL Editor. The automation_source folder is for the repository/backend, not SQL Editor.
""")
    automation_source=output_dir/"automation_source"
    root=Path(__file__).resolve().parent.parent
    for relative in ["scripts/catalogue_batch_gate.py","scripts/export_llm_catalogue.py",
                     "scripts/route_quality.py",
                     "scripts/prepare_destination_sources.py","scripts/match_llm_to_osm.py",
                     "scripts/match_llm_to_overture.py","scripts/merge_pilot_sources.py","scripts/fetch_osm_pilot.py",
                     "scripts/continue_catalogue_review.py","scripts/import_catalogue_feedback.py",
                     "scripts/data/destination_source_policy.json",
                     "scripts/editorial_fallback.py","scripts/build_catalogue_import_bundle.py",
                     "scripts/process_reviewed_catalogue_batch.py","scripts/requirements-catalogue-apply.txt",
                     "scripts/data/catalogue_import_policy.json","scripts/data/catalogue_batch_governance.json",
                     "scripts/data/island_destinations.json","scripts/data/batch2_editorial_fallback.json",
                     "CATALOGUE_IMPORT_RULEBOOK.md"]:
        target=automation_source/relative
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(root/relative,target)
    fallback_path="scripts/data/batch2_editorial_fallback.json"
    if editorial_fallback_policy:
        fallback_path="scripts/data/selected_editorial_fallback.json"
        shutil.copyfile(editorial_fallback_policy,automation_source/fallback_path)
    (output_dir/"AUTOMATION_SETUP.md").write_text(f"""# Threshold-based publication — execution connection still required

The user signed off on 60% eligibility without further per-batch approval. Wrong identities/contradictory pins/required route verification still block individual records. Pending/unmatched stay in the database queue. The previous ten-batch waiting rule is superseded. Selection and LLM review are still the existing workflow; this code does not make paid AI/Google calls or generate extra suggestions.

The automation_source folder contains repository/backend code updates for threshold authorization, export, atomic packaging and optional execution. Preserve newer/unrelated repository changes when merging. This is NOT frontend JavaScript and must not be bundled into the browser. Do not expose a database credential in Lovable frontend environment variables, source control or chat.

The pipeline is not connected to a running scheduler/database here. For future hands-off publication, run scripts/process_reviewed_catalogue_batch.py as the downstream step after a reviewed CSV is produced. Register each destination's original target and country/type/location definitions before selection. It prepares qualifying packages by default. --apply requires a privately configured CATALOGUE_DATABASE_URL in the backend/job environment and installation of scripts/requirements-catalogue-apply.txt. Without those, it stops rather than claiming import success. Do not invent a temporary privileged helper to bypass restrictions.

Example backend invocation (replace paths for each batch):

python scripts/process_reviewed_catalogue_batch.py --matches path/to/reviewed_matches.csv --suggestions path/to/source_ready_suggestions.json --osm-json path/to/bounded_cached_osm.json --batch-id unique-batch-id --output-dir outputs/unique-batch-id --editorial-fallback-policy {fallback_path} --destination-definitions scripts/data/island_destinations.json --apply

Changing targets is not a way to pass coverage. Editorial entries do not count toward the match percentage. New batches require an explicit outdoor_plan and the source-routing step; missing/unverified hikes are queued even if overall coverage passes. Exact previously reviewed OSM identities persist unless new contradictory evidence appears. Re-running upserts is idempotent; existing user review decisions/notes are preserved. Store the execution report and verify actual preview behaviour separately. The three historic prepared batches remain frozen; do not rewrite them silently.

The connection code is regression-tested with a fake connection, not live PostgreSQL here. SQL-side assertions run in the same transaction as item/queue writes. If a network failure occurs around COMMIT, the outcome may be unknown: use verification SQL before claiming success or rollback.
""")
    archive_path=output_dir.parent/(output_dir.name+".zip")
    with zipfile.ZipFile(archive_path,"w",compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(output_dir.rglob("*")):
            if path.is_file():archive.write(path,path.relative_to(output_dir))
    print(json.dumps({**manifest,"zip":str(archive_path)},indent=2))
    return archive_path


if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--export-dir",type=Path,required=True)
    parser.add_argument("--output-dir",type=Path,required=True)
    parser.add_argument("--destination-definitions",type=Path)
    parser.add_argument("--editorial-fallback-policy",type=Path)
    args=parser.parse_args()
    build(args.export_dir,args.output_dir,args.destination_definitions,args.editorial_fallback_policy)
