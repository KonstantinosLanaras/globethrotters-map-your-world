import unittest

from apply_llm_match_review import apply_reviews


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.row = {
            "city_slug": "test", "category": "nature", "llm_name": "Cala Example",
            "candidate_overture_id": "record-1", "overture_id": "record-1",
            "content_kind": "place", "match_status": "auto_match",
            "geometry_status": "from_overture",
        }

    def test_unreviewed_auto_match_is_preserved(self):
        row = apply_reviews([self.row], [])[0]
        self.assertEqual(row["match_status"], "auto_match")
        self.assertEqual(row["overture_id"], "record-1")
        self.assertEqual(row["publish_ready"], "not_assessed")

    def test_same_identity_with_bad_pin_stays_review(self):
        decision = {
            "city_slug": "test", "category": "nature", "llm_name": "Cala Example",
            "candidate_overture_id": "record-1", "identity_decision": "uncertain",
            "geometry_decision": "contradicted", "reason": "bad pin",
        }
        row = apply_reviews([self.row], [decision])[0]
        self.assertEqual(row["geometry_status"], "source_geometry_contradicted")
        self.assertEqual(row["match_status"], "review")
        self.assertEqual(row["publish_ready"], "false")

    def test_changed_candidate_id_fails_closed(self):
        decision = {
            "city_slug": "test", "category": "nature", "llm_name": "Cala Example",
            "candidate_overture_id": "old", "identity_decision": "same_feature",
            "reason": "name and type",
        }
        with self.assertRaises(ValueError):
            apply_reviews([self.row], [decision])

    def test_model_can_select_a_different_record_from_raw_slice(self):
        decision = {
            "city_slug": "test", "category": "nature", "llm_name": "Cala Example",
            "candidate_overture_id": "record-1", "alternate_overture_id": "beach-2",
            "identity_decision": "same_feature", "reason": "better feature type",
        }
        alternate = {"beach-2": {"id": "beach-2", "primary_name": "Platja Cala Example", "latitude": 38.9,
                                 "longitude": 1.4, "taxonomy_primary": "beach"}}
        row = apply_reviews([self.row], [decision], alternate)[0]
        self.assertEqual(row["matched_name"], "Platja Cala Example")
        self.assertEqual(row["llm_selected_alternate_id"], "beach-2")
        self.assertEqual(row["overture_id"], "beach-2")
        self.assertEqual(row["match_status"], "manual_match")
        self.assertEqual(row["publish_ready"], "not_assessed")

    def test_audit_same_record_does_not_demote_auto_match(self):
        decision = {"city_slug": "test", "category": "nature", "llm_name": "Cala Example",
                    "candidate_overture_id": "record-1", "identity_decision": "same_feature",
                    "reason": "audit confirms identity"}
        self.assertEqual(apply_reviews([self.row], [decision])[0]["match_status"], "auto_match")

    def test_replacement_metadata_does_not_leak_old_website_or_scores(self):
        original = dict(self.row, website="https://wrong.example", match_score="0.99", risk_flags="outside_destination")
        decision = {"city_slug": "test", "category": "nature", "llm_name": "Cala Example",
                    "candidate_overture_id": "record-1", "alternate_overture_id": "new",
                    "identity_decision": "same_feature", "reason": "right island"}
        row = apply_reviews([original], [decision], {"new": {"id": "new", "primary_name": "Right beach"}})[0]
        self.assertEqual(row["website"], "")
        self.assertEqual(row["match_score"], "")
        self.assertEqual(row["risk_flags"], "")
        self.assertEqual(row["previous_candidate_overture_id"], "record-1")


if __name__ == "__main__":
    unittest.main()
