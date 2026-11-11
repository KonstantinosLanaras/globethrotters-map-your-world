import csv
import tempfile
import unittest
from pathlib import Path

from export_llm_catalogue import (
    editorial_key,
    effective_row,
    merge_review_backlog,
    mvp_record,
    queue_record,
    write_csv,
    write_sql,
)


def row(name="Colonne di San Lorenzo", status="unmatched"):
    return {
        "city_slug": "milan-it",
        "category": "culture",
        "rank": "38",
        "display_name": name,
        "llm_aliases": "Columns of San Lorenzo",
        "llm_subtype": "historic site",
        "content_kind": "place",
        "experience_description": "",
        "area_name": "",
        "recommended_time": "",
        "geometry_type": "",
        "match_status": status,
        "match_score": "0.7558" if status == "unmatched" else "1.0",
        "second_score": "0.7245",
        "risk_flags": "category_conflict" if status == "unmatched" else "",
        "candidate_overture_id": "candidate-1" if status == "unmatched" else "source-1",
        "overture_id": "" if status == "unmatched" else "source-1",
        "matched_name": "Suite In Colonne San Lorenzo Milano" if status == "unmatched" else name,
        "address": "Corso di Porta Ticinese 24",
        "locality": "Milano",
        "postcode": "20123",
        "latitude": "45.458",
        "longitude": "9.181",
        "taxonomy_primary": "guest_house",
        "category_compatible": "False",
        "duplicate_cluster_ids": "candidate-1",
        "expected_address": "",
        "expected_neighbourhood": "",
        "expected_locality": "Milano",
        "expected_postcode": "",
        "overture_confidence": "0.9",
    }


class ExportCatalogueTests(unittest.TestCase):
    def test_manual_match_is_included_as_overture_place(self):
        from export_llm_catalogue import MVP_STATUSES
        self.assertIn("manual_match", MVP_STATUSES)
        record = mvp_record(row("Pacha Ibiza", "manual_match"), "pilot")
        self.assertEqual(record["source"], "overture")
        self.assertEqual(record["source_id"], "source-1")

    def test_known_bad_pin_is_not_exported_as_accepted(self):
        candidate = row("Example beach", "manual_match")
        candidate["geometry_status"] = "source_geometry_contradicted"
        self.assertEqual(effective_row(candidate)["match_status"], "review")

    def test_unmatched_record_is_exported_to_queue(self):
        record = queue_record(row(), "pilot")
        self.assertEqual(record["current_match_status"], "unmatched")
        self.assertEqual(record["candidate_source_id"], "candidate-1")
        self.assertEqual(record["editorial_key"], "milan-it:culture:colonne-di-san-lorenzo")

    def test_closure_evidence_and_alternatives_survive_queue_export(self):
        candidate=row(status="auto_match")
        candidate.update(official_verification_required="True",official_status="closed",
                         official_status_checked_at="2026-11-07",official_source_url="https://example.org/status",
                         candidate_alternatives='[{"id":"alternative"}]',candidate_alternatives_truncated="True")
        record=queue_record(effective_row(candidate),"pilot")
        self.assertEqual(record["current_match_status"],"review")
        self.assertEqual(record["proposed_payload"]["official_status"],"closed")
        self.assertEqual(record["candidate_payload"]["candidate_alternatives"],[{"id":"alternative"}])
        self.assertTrue(record["candidate_payload"]["candidate_alternatives_truncated"])

    def test_editorial_only_record_is_mvp_ready_without_coordinates(self):
        editorial = row("Navigli canal walk", "editorial_only")
        editorial.update({
            "category": "nature",
            "rank": "31",
            "content_kind": "route_experience",
            "llm_subtype": "walking route",
            "experience_description": "An unhurried canal walk.",
            "area_name": "Darsena and Navigli",
            "recommended_time": "late afternoon",
            "geometry_type": "line",
            "latitude": "",
            "longitude": "",
            "candidate_overture_id": "",
            "overture_id": "",
        })
        record = mvp_record(editorial, "pilot")
        self.assertEqual(record["source"], "curated")
        self.assertIsNone(record["latitude"])
        self.assertIsNone(record["longitude"])
        self.assertEqual(record["content_kind"], "route_experience")

    def test_unverified_mountain_route_is_gated_into_review(self):
        editorial = row("Tre Cime circuit", "editorial_only")
        editorial.update({
            "content_kind": "route_experience",
            "official_verification_required": "True",
            "official_status": "",
            "risk_flags": "",
        })

        gated = effective_row(editorial)

        self.assertEqual(gated["match_status"], "review")
        self.assertIn("official_verification_required", gated["risk_flags"])

    def test_verified_open_mountain_route_remains_publishable(self):
        editorial = row("Tre Cime circuit", "editorial_only")
        editorial.update({
            "content_kind": "route_experience",
            "official_verification_required": "true",
            "official_status": "open_with_conditions",
        })

        self.assertEqual(effective_row(editorial)["match_status"], "editorial_only")

    def test_audience_metadata_is_exported_for_catalogue_scoring(self):
        selected = row(status="auto_match")
        selected.update({
            "young_traveller_score": "91",
            "audience_scores": '{"essentiality":88,"local_distinctiveness":95}',
            "selection_reasons": "locally distinctive | strong social fit",
            "trip_styles": "food | city_break",
            "suitable_for": "couples | small_groups",
            "budget_level": "moderate",
            "typical_duration_minutes": "120",
            "seasonality": "year_round",
        })

        record = mvp_record(selected, "pilot")

        self.assertEqual(record["target_audience"], "general")
        self.assertEqual(record["young_traveller_score"], 91)
        self.assertEqual(record["audience_scores"]["local_distinctiveness"], 95)
        self.assertEqual(record["trip_styles"], ["food", "city_break"])
        self.assertEqual(record["typical_duration_minutes"], 120)

    def test_backlog_rerun_preserves_human_decision_and_missing_old_rows(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "backlog.csv"
            old = queue_record(row(), "first")
            initial = {
                "city_slug": "milan-it", "category": "culture", "rank": "38",
                "name": old["name"], "subcategory": old["subcategory"],
                "content_kind": old["content_kind"], "latest_match_status": "unmatched",
                "queue_status": "pending", "reason_flags": "category_conflict",
                "match_score": "0.7558", "candidate_name": old["candidate_name"],
                "candidate_source_id": "candidate-1", "candidate_address": "",
                "candidate_locality": "", "expected_address": "",
                "expected_neighbourhood": "", "description": "",
                "review_decision": "keep editorial", "review_notes": "Review after all cities",
                "editorial_key": old["editorial_key"], "source_run": "first",
            }
            write_csv(path, [initial])
            merged = merge_review_backlog([], [], path)
            self.assertEqual(len(merged), 1)
            self.assertEqual(merged[0]["review_decision"], "keep editorial")
            self.assertEqual(merged[0]["review_notes"], "Review after all cities")

    def test_resolved_item_remains_in_backlog_as_resolved(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "backlog.csv"
            unresolved = queue_record(row(), "first")
            from export_llm_catalogue import review_csv_record
            write_csv(path, [review_csv_record(unresolved)])
            resolved = row(status="auto_match")
            merged = merge_review_backlog([resolved], [], path)
            self.assertEqual(len(merged), 1)
            self.assertEqual(merged[0]["queue_status"], "resolved")
            self.assertEqual(merged[0]["latest_match_status"], "auto_match")

    def test_machine_resolved_item_reopens_when_it_becomes_unmatched(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "backlog.csv"
            unresolved = queue_record(row(), "first")
            from export_llm_catalogue import review_csv_record
            old = review_csv_record(unresolved)
            old["queue_status"] = "resolved"
            write_csv(path, [old])
            merged = merge_review_backlog([row()], [queue_record(row(), "second")], path)
            self.assertEqual(merged[0]["queue_status"], "pending")

    def test_human_resolved_item_is_not_reopened(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "backlog.csv"
            unresolved = queue_record(row(), "first")
            from export_llm_catalogue import review_csv_record
            old = review_csv_record(unresolved)
            old["queue_status"] = "resolved"
            old["review_decision"] = "keep editorial"
            write_csv(path, [old])
            merged = merge_review_backlog([row()], [queue_record(row(), "second")], path)
            self.assertEqual(merged[0]["queue_status"], "resolved")
            self.assertEqual(merged[0]["review_decision"], "keep editorial")

    def test_generated_sql_never_deletes_or_overwrites_human_review_fields(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "import.sql"
            write_sql(path, [mvp_record(row(status="auto_match"), "pilot")], [queue_record(row(), "pilot")])
            sql = path.read_text(encoding="utf-8")
            self.assertNotIn("DELETE FROM public.catalog_review_queue", sql.upper())
            update_clause = sql.split("ON CONFLICT (city_id, editorial_key) DO UPDATE SET", 1)[1]
            update_clause = update_clause.split("UPDATE public.catalog_review_queue AS queue", 1)[0]
            self.assertNotIn("review_notes =", update_clause)
            self.assertIn("reviewed_at IS NULL", update_clause)
            self.assertNotIn("reviewed_at =", update_clause)
            self.assertIn("young_traveller_score", sql)
            self.assertIn("selection_reasons", sql)
            resolve=sql.split("UPDATE public.catalog_review_queue AS queue",1)[1]
            self.assertIn("accepted_in_this_batch",resolve)
            self.assertIn("queue.reviewed_at IS NULL",resolve)


if __name__ == "__main__":
    unittest.main()
