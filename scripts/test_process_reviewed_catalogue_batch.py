import hashlib
import json
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch
from process_reviewed_catalogue_batch import apply_bundle, transaction_body


class ExecutionTests(unittest.TestCase):
    def test_new_batch_cannot_skip_destination_source_plan(self):
        from process_reviewed_catalogue_batch import main
        with patch("sys.argv",["publisher","--matches","missing.csv","--batch-id","future-batch",
            "--output-dir","unused","--editorial-fallback-policy","unused.json"]):
            with self.assertRaisesRegex(ValueError,"outdoor_plan"):main()
    def bundle(self, folder):
        sql="-- Generated\nBEGIN;\nSELECT 'accepted and queue assertions';\nCOMMIT;\nSELECT 'verification';\n"
        (folder/"01_apply_approved_batch.sql").write_text(sql)
        (folder/"manifest.json").write_text(json.dumps({"transaction_sha256":hashlib.sha256(sql.encode()).hexdigest(),
            "batch_id":"b","expected_package_counts":{"x":60},"expected_review_queue_counts":{"x":40}}))

    def test_missing_connection_stops_without_attempting_import(self):
        with self.assertRaisesRegex(ValueError,"not configured"):
            apply_bundle(Path("unused"),None)

    def test_modified_sql_cannot_execute(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp)
            self.bundle(folder)
            (folder/"01_apply_approved_batch.sql").write_text("DROP TABLE example;")
            with self.assertRaisesRegex(ValueError,"changed"):
                apply_bundle(folder,"private")

    def test_transaction_body_excludes_outer_transaction_and_postcommit_report(self):
        self.assertEqual(transaction_body("-- comment\nBEGIN;\nSELECT 1;\nCOMMIT;\nSELECT 2;"),"SELECT 1;")

    def test_sql_and_assertions_run_under_one_connection_transaction(self):
        events=[]
        class Cursor:
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def execute(self,sql,prepare):events.append((sql,prepare))
            def nextset(self):return False
        class Connection:
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def cursor(self):return Cursor()
            @contextmanager
            def transaction(self):
                events.append("begin")
                yield
                events.append("commit")
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp)
            self.bundle(folder)
            report=apply_bundle(folder,"private",lambda *a,**kw:Connection())
        self.assertEqual(events,["begin",("SELECT 'accepted and queue assertions';",False),"commit"])
        self.assertEqual(report["status"],"committed")
