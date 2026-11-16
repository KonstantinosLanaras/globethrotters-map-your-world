"""Build ID-specific, guarded classification SQL from a real catalogue snapshot.

No database writes or paid model calls. Existing detailed subtypes, identities,
geometry, review notes and saved references remain intact. Re-running apply is
idempotent; rollback refuses to undo subsequent classification changes.
"""
import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

from catalogue_taxonomy import VERSION, classify, validate_subcategory

CHANGE_SET = "catalogue-subcategories-20261111-v1"


def plan_rows(rows, decisions):
    planned = []
    for row in rows:
        key, reason = classify(row)
        category = "nature" if row["canonical_category"] == "hiking" else row["canonical_category"]
        decision = decisions.get(row["id"])
        method = "existing_subtype_mapping"
        if decision:
            category, key = decision["category"], decision["subcategory_key"]
            reason, method = decision["reason"], decision["method"]
        if key:
            validate_subcategory(category, key)
        planned.append({
            "id": row["id"], "city_id": row["city_id"], "name": row["name"],
            "source": row["source"], "source_id": row["source_id"],
            "old_category": row["canonical_category"], "old_subcategory": row["subcategory"],
            "old_key": row.get("subcategory_key"), "snapshot_updated_at": row["updated_at"],
            "new_category": category, "new_key": key, "method": method, "reason": reason,
            "status": "classified" if key else "review_required",
        })
    return planned


def write_bundle(rows, decisions, output):
    output.mkdir(parents=True, exist_ok=True)
    plan = plan_rows(rows, decisions)
    updates = [row for row in plan if row["new_key"] or row["new_category"] != row["old_category"]]
    payload = json.dumps(updates, ensure_ascii=False, separators=(",", ":"))
    if "$plan$" in payload:
        raise ValueError("Reserved SQL delimiter in catalogue input")
    definitions = "id uuid, city_id uuid, name text, source text, source_id text, old_category text, old_subcategory text, old_key text, snapshot_updated_at timestamptz, new_category text, new_key text, method text, reason text, status text"
    temp = f"CREATE TEMP TABLE subcategory_plan ON COMMIT DROP AS SELECT * FROM jsonb_to_recordset($plan${payload}$plan$::jsonb) AS x({definitions});\n"
    guards = f"""DO $guard$
BEGIN
 IF EXISTS (SELECT 1 FROM subcategory_plan p LEFT JOIN public.catalog_items i ON i.id=p.id
   LEFT JOIN public.catalog_subcategory_changes a ON a.change_set='{CHANGE_SET}' AND a.item_id=p.id
   WHERE i.id IS NULL OR i.city_id IS DISTINCT FROM p.city_id OR i.source IS DISTINCT FROM p.source
     OR i.source_id IS DISTINCT FROM p.source_id OR i.name IS DISTINCT FROM p.name
     OR i.subcategory IS DISTINCT FROM p.old_subcategory
     OR (a.item_id IS NULL AND (i.canonical_category IS DISTINCT FROM p.old_category
       OR i.subcategory_key IS DISTINCT FROM p.old_key OR i.updated_at IS DISTINCT FROM p.snapshot_updated_at))
     OR (a.item_id IS NOT NULL AND (a.new_category IS DISTINCT FROM p.new_category
       OR a.new_key IS DISTINCT FROM p.new_key OR i.canonical_category IS DISTINCT FROM a.new_category
       OR i.subcategory_key IS DISTINCT FROM a.new_key))) THEN
  RAISE EXCEPTION 'Catalogue changed since the classification snapshot; refresh the plan. No classifications applied.';
 END IF;
END $guard$;
"""
    apply = f"""-- Apply the taxonomy schema migration first. Classification only; no deletes.
BEGIN;
LOCK TABLE public.catalog_items IN SHARE ROW EXCLUSIVE MODE;
{temp}{guards}
INSERT INTO public.catalog_subcategory_changes(change_set,item_id,old_category,old_key,new_category,new_key,method,reason)
SELECT '{CHANGE_SET}',p.id,i.canonical_category,i.subcategory_key,p.new_category,p.new_key,p.method,p.reason
FROM subcategory_plan p JOIN public.catalog_items i ON i.id=p.id
ON CONFLICT(change_set,item_id) DO NOTHING;

UPDATE public.catalog_items i SET canonical_category=p.new_category,subcategory_key=p.new_key,updated_at=now()
FROM subcategory_plan p WHERE i.id=p.id
 AND (i.canonical_category IS DISTINCT FROM p.new_category OR i.subcategory_key IS DISTINCT FROM p.new_key);

DO $verify$
BEGIN
 IF EXISTS (SELECT 1 FROM subcategory_plan p JOIN public.catalog_items i ON i.id=p.id
   WHERE i.canonical_category IS DISTINCT FROM p.new_category OR i.subcategory_key IS DISTINCT FROM p.new_key)
 THEN RAISE EXCEPTION 'Classification verification failed; transaction rolled back.'; END IF;
END $verify$;
COMMIT;
SELECT canonical_category,subcategory_key,count(*) FROM public.catalog_items
WHERE subcategory_key IS NOT NULL GROUP BY 1,2 ORDER BY 1,2;
"""
    rollback = f"""-- Restore only this change set; preserve every item and unrelated field.
BEGIN;
LOCK TABLE public.catalog_items IN SHARE ROW EXCLUSIVE MODE;
DO $guard$
BEGIN
 IF EXISTS (SELECT 1 FROM public.catalog_subcategory_changes a LEFT JOIN public.catalog_items i ON i.id=a.item_id
  WHERE a.change_set='{CHANGE_SET}' AND (i.id IS NULL OR i.canonical_category IS DISTINCT FROM a.new_category
   OR i.subcategory_key IS DISTINCT FROM a.new_key)) THEN
  RAISE EXCEPTION 'Subsequent classification changes found; inspect before rollback.';
 END IF;
END $guard$;
UPDATE public.catalog_items i SET canonical_category=a.old_category,subcategory_key=a.old_key,updated_at=now()
FROM public.catalog_subcategory_changes a WHERE a.change_set='{CHANGE_SET}' AND i.id=a.item_id;
DELETE FROM public.catalog_subcategory_changes WHERE change_set='{CHANGE_SET}';
COMMIT;
"""
    (output / "01_classify_existing_items.sql").write_text(apply)
    (output / "03_rollback_classification.sql").write_text(rollback)
    (output / "02_verify_classification.sql").write_text(f"SELECT canonical_category,subcategory_key,count(*) FROM public.catalog_items GROUP BY 1,2 ORDER BY 1,2;\nSELECT count(*) AS audited_updates FROM public.catalog_subcategory_changes WHERE change_set='{CHANGE_SET}';\nSELECT id,name,canonical_category,subcategory FROM public.catalog_items WHERE subcategory_key IS NULL ORDER BY canonical_category,name;\n")
    for filename, selected in [("classification_plan.csv", plan), ("classification_review.csv", [r for r in plan if not r["new_key"]])]:
        with (output / filename).open("w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(plan[0]) if plan else ["id"], lineterminator="\n")
            writer.writeheader(); writer.writerows(selected)
    manifest = {"change_set": CHANGE_SET, "taxonomy_version": VERSION, "snapshot_rows": len(rows),
                "classified_rows": sum(bool(r["new_key"]) for r in plan),
                "classification_review_rows": sum(not r["new_key"] for r in plan),
                "rows_updated_including_category_normalization": len(updates),
                "hiking_rows_normalized": sum(r["old_category"] == "hiking" for r in plan),
                "counts": dict(Counter(r["new_category"] + "/" + r["new_key"] for r in plan if r["new_key"])),
                "snapshot_scope": "publicly_visible_catalogue_rows_only",
                "live_database_changed": False,
                "apply_sha256": hashlib.sha256(apply.encode()).hexdigest()}
    (output / "classification_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--decisions", type=Path, default=Path(__file__).parent / "data/catalogue_subcategory_review_20261111.json")
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(write_bundle(json.loads(args.snapshot.read_text()), json.loads(args.decisions.read_text())["items"], args.output_dir), indent=2))


if __name__ == "__main__":
    main()
