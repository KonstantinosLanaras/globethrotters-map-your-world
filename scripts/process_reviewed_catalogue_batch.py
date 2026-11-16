"""Publish reviewed batches under the signed coverage policy, without new matching.

Default is prepare-only. --apply needs a configured CATALOGUE_DATABASE_URL and
the optional psycopg dependency. No Google/LLM calls, retries or secret printing.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

from build_catalogue_import_bundle import build

ROOT = Path(__file__).resolve().parent.parent


def transaction_body(sql):
    _, begin, remainder = sql.partition("\nBEGIN;\n")
    body, commit, verification = remainder.partition("\nCOMMIT;\n")
    if not begin or not commit or not body.strip() or not verification.strip():
        raise ValueError("Expected the generated atomic import envelope")
    return body


def apply_bundle(folder, database_url, connector=None):
    if not database_url:
        raise ValueError("Live import is not configured: set CATALOGUE_DATABASE_URL privately; do not paste credentials in chat")
    manifest=json.loads((folder/"manifest.json").read_text())
    sql=(folder/"01_apply_approved_batch.sql").read_text()
    if hashlib.sha256(sql.encode()).hexdigest() != manifest["transaction_sha256"]:
        raise ValueError("Import SQL changed after package generation")
    body=transaction_body(sql)
    connection_options={"autocommit":True,"sslmode":"require","connect_timeout":15}
    if connector is None:
        try:
            import psycopg
        except ImportError:
            raise ValueError("Install scripts/requirements-catalogue-apply.txt before live execution") from None
        connector=psycopg.connect
        requested_ssl=psycopg.conninfo.conninfo_to_dict(database_url).get("sslmode")
        if requested_ssl:
            if requested_ssl not in {"require","verify-ca","verify-full"}:
                raise ValueError("The catalogue database connection must require TLS")
            connection_options["sslmode"]=requested_ssl
    # This transaction context owns COMMIT. SQL-side item/queue assertions run
    # before it, so queue retention failure rolls back the accepted-item writes.
    with connector(database_url, **connection_options) as connection:
        with connection.transaction():
            with connection.cursor() as cursor:
                cursor.execute(body, prepare=False)
                while cursor.nextset():
                    pass
    return {"batch_id":manifest["batch_id"],"status":"committed",
            "expected_package_counts":manifest["expected_package_counts"],
            "expected_review_queue_counts":manifest["expected_review_queue_counts"]}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--matches",type=Path,action="append",required=True)
    parser.add_argument("--batch-id",required=True)
    parser.add_argument("--output-dir",type=Path,required=True)
    parser.add_argument("--editorial-fallback-policy",type=Path,required=True)
    parser.add_argument("--destination-definitions",type=Path,default=ROOT/"scripts/data/island_destinations.json")
    parser.add_argument("--apply",action="store_true")
    parser.add_argument("--suggestions",type=Path,help="Required for new batches: destination plan and source-ready suggestions")
    parser.add_argument("--osm-json",type=Path,help="Cached bounded OSM extract for named routes/features")
    parser.add_argument("--fetch-osm",action="store_true",help="Explicit small bounded pilot refresh, never a bulk worldwide fetch")
    args=parser.parse_args()
    source_policy=json.loads((ROOT/"scripts/data/destination_source_policy.json").read_text())
    matches=args.matches
    if args.suggestions:
        from prepare_destination_sources import prepare
        from continue_catalogue_review import write_csv
        import csv
        suggestions=json.loads(args.suggestions.read_text())
        if args.batch_id not in source_policy["frozen_legacy_batches"]:
            from catalogue_taxonomy import validate_plan_taxonomy
            validate_plan_taxonomy(suggestions)
        rows=[]
        for path in matches:
            with path.open(newline="") as handle:rows.extend(csv.DictReader(handle))
        if {r["city_slug"] for r in rows}!={suggestions["city"]["slug"]}:
            raise ValueError("Source planning is per destination; prepare separate source-checked inputs before combining destinations")
        payload=json.loads(args.osm_json.read_text()) if args.osm_json else None
        if args.fetch_osm:
            if payload is not None:raise ValueError("Choose cached source or explicit refresh")
            from fetch_osm_pilot import build_targeted_query,fetch
            from prepare_destination_sources import validate_plan
            validate_plan(suggestions)
            payload=fetch("https://overpass-api.de/api/interpreter",build_targeted_query(suggestions["city"]["slug"],suggestions))
        checked,_,report=prepare(suggestions,rows,payload)
        path=args.output_dir/"source_checked_matches.csv"
        write_csv(path,checked)
        (args.output_dir/"source_plan_report.json").write_text(json.dumps(report,indent=2)+"\n")
        if args.fetch_osm:(args.output_dir/"raw_osm.json").write_text(json.dumps(payload,ensure_ascii=False))
        matches=[path]
    elif source_policy["require_destination_outdoor_plan_for_new_batches"] and args.batch_id not in source_policy["frozen_legacy_batches"]:
        raise ValueError("New destination batches require --suggestions with outdoor_plan. Hikes must not silently skip source routing.")
    export=args.output_dir/"export"
    command=[sys.executable,str(ROOT/"scripts/export_llm_catalogue.py"),"--output-dir",str(export),
             "--run-label",args.batch_id,"--batch-id",args.batch_id,
             "--editorial-fallback-policy",str(args.editorial_fallback_policy)]
    for path in matches:
        command.extend(["--matches",str(path)])
    subprocess.run(command,check=True)
    gate=json.loads((export/"catalog_batch_gate.json").read_text())
    if not any(d["import_authorized"] for d in gate["destinations"]):
        print(json.dumps({"status":"blocked_by_gate","batch_id":args.batch_id}))
        return 2
    folder=args.output_dir/"import"
    build(export,folder,args.destination_definitions,args.editorial_fallback_policy)
    report={"status":"prepared_not_applied","batch_id":args.batch_id}
    if args.apply:
        try:
            report=apply_bundle(folder,os.environ.get("CATALOGUE_DATABASE_URL"))
        except ValueError as error:
            print(str(error),file=sys.stderr)
            return 2
        except Exception as error:
            # A network failure during COMMIT can have an unknown result.
            # Never claim rollback/success without a confirmed response; reruns
            # are idempotent and the verification SQL can reconcile the state.
            report={"status":"live_result_unconfirmed","error_type":type(error).__name__,"batch_id":args.batch_id}
            (args.output_dir/"execution_report.json").write_text(json.dumps(report,indent=2)+"\n")
            print(json.dumps(report),file=sys.stderr)
            return 2
    (args.output_dir/"execution_report.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps(report))
    return 0


if __name__=="__main__":
    raise SystemExit(main())
