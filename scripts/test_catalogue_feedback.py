import unittest
from import_catalogue_feedback import apply_human_feedback, key
from continue_catalogue_review import reconcile


def row():
    return {"city_slug":"x", "category":"nature", "llm_name":"Beach", "match_status":"review", "candidate_overture_id":"a", "overture_id":"", "display_name":"Beach"}


class FeedbackTests(unittest.TestCase):
    def feedback(self, decision):
        return {"stable_key":"x:nature:Beach", "decision":decision, "record_id":"a", "notes":"User note", "source_row":7,
                "corrected_latitude":"", "corrected_longitude":"", "alternative_source":""}

    def test_user_acceptance_preserved_even_if_fresh_candidate_changes(self):
        base=apply_human_feedback([row()],[self.feedback("Accept match")])
        fresh={**row(),"candidate_overture_id":"b"}
        result=reconcile(base,[fresh],{}, {})[0]
        self.assertEqual(result["overture_id"],"a")
        self.assertEqual(result["human_notes"],"User note")

    def test_changed_reviewed_id_fails_closed(self):
        with self.assertRaises(ValueError):
            apply_human_feedback([{**row(),"candidate_overture_id":"b"}],[self.feedback("Accept match")])

    def test_rejected_record_cannot_be_reaccepted(self):
        base=apply_human_feedback([row()],[self.feedback("Keep unmatched")])
        reviews={"x":{"accept":{"Beach":["a","mistakenly reaccepted"]}}}
        with self.assertRaises(ValueError):
            reconcile(base,[row()],reviews,{"a":{"id":"a"}})

    def test_new_record_can_replace_rejected_candidate_with_history(self):
        base=apply_human_feedback([row()],[self.feedback("Keep unmatched")])
        reviews={"x":{"accept":{"Beach":["b","better coastal feature"]}}}
        result=reconcile(base,[row()],reviews,{"b":{"id":"b","primary_name":"Beach B"}})[0]
        self.assertEqual(result["overture_id"],"b")
        self.assertEqual(result["human_decision"],"Keep unmatched")
        self.assertEqual(result["replacement_after_user_rejection"],"True")
