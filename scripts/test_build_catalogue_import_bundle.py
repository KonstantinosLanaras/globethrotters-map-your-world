import csv
import json
import tempfile
import unittest
from pathlib import Path
from build_catalogue_import_bundle import build
from export_llm_catalogue import write_sql,write_split_sql_files


class BundleTests(unittest.TestCase):
    def fixture(self,root):
        export=root/"export"
        export.mkdir()
        gate={"batch_id":"test-batch","fingerprint":"test-digest","human_approval_valid":False,
              "automatic_import_enabled":True,"approval_mode":"threshold",
              "destinations":[{"city_slug":"test-nl","import_authorized":True,"initial_target":1}]}
        (export/"catalog_batch_gate.json").write_text(json.dumps(gate))
        row={"city_slug":"test-nl","source":"overture","source_id":"one","content_kind":"place","latitude":"52","longitude":"5"}
        with (export/"catalog_mvp_ready.csv").open("w",newline="") as handle:
            writer=csv.DictWriter(handle,fieldnames=list(row));writer.writeheader();writer.writerow(row)
        (export/"catalog_review_backlog.csv").write_text("editorial_key\ntest-nl:nature:unmatched\n")
        queue={"city_slug":"test-nl","editorial_key":"test-nl:nature:unmatched"}
        sql=export/"catalog_mvp_import.sql"
        write_sql(sql,[row],[queue])
        write_split_sql_files(sql,export/"catalog_mvp_items_import.sql",export/"catalog_review_queue_import.sql")
        definitions=root/"definitions.json"
        definitions.write_text(json.dumps({"test-nl":{"name":"Test","country":"Netherlands","country_code":"NL",
            "destination_type":"city","target":1,"latitude":52,"longitude":5,"radius":20}}))
        return export,definitions

    def test_automatic_authorization_produces_generic_country_and_queue_checks(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);export,definitions=self.fixture(root)
            output=root/"bundle"
            build(export,output,definitions)
            manifest=json.loads((output/"manifest.json").read_text())
            self.assertEqual(manifest["expected_review_queue_counts"],{"test-nl":1})
            sql=(output/"01_apply_approved_batch.sql").read_text()
            self.assertIn('"country": "Netherlands"',sql)
            self.assertLess(sql.index("Unresolved queue retention failed"),sql.index("\nCOMMIT;\n"))
            self.assertIn("retained_queue_found",(output/"02_verify_after_import.sql").read_text())
            request=(output/"LOVABLE_IMPORT_REQUEST.md").read_text()
            self.assertIn("Test import",request)
            self.assertNotIn("Do not import batch 2",request)

    def test_disabled_automation_without_exact_approval_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);export,definitions=self.fixture(root)
            path=export/"catalog_batch_gate.json"
            gate=json.loads(path.read_text());gate["automatic_import_enabled"]=False
            path.write_text(json.dumps(gate))
            with self.assertRaises(ValueError):build(export,root/"bundle",definitions)

    def test_release_is_derived_from_payload_not_hardcoded(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);export,definitions=self.fixture(root)
            path=export/"catalog_mvp_ready.csv"
            with path.open(newline="") as handle:rows=list(csv.DictReader(handle))
            rows[0]["metadata"]=json.dumps({"overture_release":"2026-10-21.0"})
            with path.open("w",newline="") as handle:
                writer=csv.DictWriter(handle,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
            build(export,root/"bundle",definitions)
            manifest=json.loads((root/"bundle/manifest.json").read_text())
            self.assertEqual(manifest["overture_release"],"2026-10-21.0")
            self.assertIn("2026-10-21.0",(root/"bundle/LOVABLE_IMPORT_REQUEST.md").read_text())
            self.assertNotIn("2026-09-23.1",(root/"bundle/LOVABLE_IMPORT_REQUEST.md").read_text())

    def test_destination_target_cannot_differ_from_gate_target(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);export,definitions=self.fixture(root)
            payload=json.loads(definitions.read_text());payload["test-nl"]["target"]=2
            definitions.write_text(json.dumps(payload))
            with self.assertRaisesRegex(ValueError,"target differs"):build(export,root/"bundle",definitions)
