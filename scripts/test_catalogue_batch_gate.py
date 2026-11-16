import unittest
from catalogue_batch_gate import evaluate_batch


def rows(count):
    return [{"city_slug":"test", "category":"culture", "display_name":f"Place {i}",
             "match_status":"auto_match", "overture_id":str(i), "latitude":"40", "longitude":"2"} for i in range(count)]


class BatchGateTests(unittest.TestCase):
    policy={"initial_targets":{"test":100}, "minimum_match_fraction":0.75,"supervised_batches":10}

    def test_provisional_sixty_percent_passes_without_relaxing_approval(self):
        p={**self.policy,"minimum_match_fraction":0.60}
        failed=evaluate_batch(rows(59),p,{},"b")["destinations"][0]
        passed=evaluate_batch(rows(60),p,{},"b")["destinations"][0]
        self.assertFalse(failed["coverage_passed"])
        self.assertTrue(passed["coverage_passed"])
        self.assertFalse(passed["import_authorized"])

    def test_repository_policy_is_provisional_sixty_percent(self):
        import json
        from pathlib import Path
        p=json.loads((Path(__file__).parent/"data/catalogue_import_policy.json").read_text())
        self.assertEqual(p["minimum_match_fraction"],0.60)
        self.assertEqual(p["supervised_batches"],0)
        self.assertEqual(p["approval_mode"],"threshold")

    def test_unrelated_destination_target_does_not_change_package_approval(self):
        original=evaluate_batch(rows(75),self.policy,{},"b")["fingerprint"]
        p={**self.policy,"initial_targets":{**self.policy["initial_targets"],"other":50}}
        self.assertEqual(original,evaluate_batch(rows(75),p,{},"b")["fingerprint"])

    def test_under_threshold_goes_back_to_review(self):
        d=evaluate_batch(rows(74),self.policy,{},"batch1")["destinations"][0]
        self.assertFalse(d["coverage_passed"])
        self.assertEqual(d["next_action"],"repeat_candidate_and_llm_review")

    def test_exact_threshold_requires_human_during_first_ten(self):
        result=evaluate_batch(rows(75),self.policy,{"automatic_import_enabled":True},"batch1")
        self.assertTrue(result["destinations"][0]["coverage_passed"])
        self.assertFalse(result["destinations"][0]["import_authorized"])

    def test_approval_tied_to_exact_package(self):
        r=rows(75)
        digest=evaluate_batch(r,self.policy,{},"b")["fingerprint"]
        ledger={"approvals":{"b":{"approved":True,"fingerprint":digest}}}
        self.assertTrue(evaluate_batch(r,self.policy,ledger,"b")["destinations"][0]["import_authorized"])
        self.assertFalse(evaluate_batch(rows(76),self.policy,ledger,"b")["human_approval_valid"])

    def test_editorial_and_duplicate_ids_do_not_pad_coverage(self):
        r=rows(74)+[dict(rows(1)[0])]
        r.extend({"city_slug":"test","category":"nature","display_name":f"Walk {i}","match_status":"editorial_only"} for i in range(10))
        self.assertEqual(evaluate_batch(r,self.policy,{},"b")["destinations"][0]["accepted_unique_matches"],74)

    def test_ten_reviews_dont_automatically_enable_import(self):
        ledger={"human_reviewed_batch_ids":[f"b{i}" for i in range(10)]}
        self.assertFalse(evaluate_batch(rows(80),self.policy,ledger,"b")["destinations"][0]["import_authorized"])
        ledger["automatic_import_enabled"]=True
        self.assertTrue(evaluate_batch(rows(80),self.policy,ledger,"b")["destinations"][0]["import_authorized"])

    def test_bad_coordinate_and_rejected_identity_not_counted(self):
        r=rows(75)
        r[0]["geometry_status"]="source_geometry_contradicted"
        r[1]["rejected_overture_id"]=r[1]["overture_id"]
        self.assertEqual(evaluate_batch(r,self.policy,{},"b")["destinations"][0]["accepted_unique_matches"],73)

    def test_original_target_does_not_shrink_to_candidate_count(self):
        d=evaluate_batch(rows(60),self.policy,{},"b")["destinations"][0]
        self.assertEqual(d["match_fraction"],0.6)
        self.assertEqual(d["required_matches"],75)

    def test_fractional_threshold_rounds_up(self):
        p={**self.policy,"initial_targets":{"test":87}}
        self.assertEqual(evaluate_batch(rows(65),p,{},"b")["destinations"][0]["required_matches"],66)

    def test_user_signed_threshold_mode_does_not_require_ten_reviews(self):
        policy={**self.policy,"minimum_match_fraction":0.6,"approval_mode":"threshold"}
        ledger={"automatic_import_enabled":True,"threshold_import_authorization":{"approved":True,"minimum_match_fraction":0.6}}
        self.assertTrue(evaluate_batch(rows(60),policy,ledger,"new")["destinations"][0]["import_authorized"])
        self.assertFalse(evaluate_batch(rows(59),policy,ledger,"new")["destinations"][0]["import_authorized"])

    def test_threshold_mode_requires_signoff_at_the_configured_threshold(self):
        policy={**self.policy,"minimum_match_fraction":0.6,"approval_mode":"threshold","supervised_batches":0}
        ledger={"automatic_import_enabled":True,"threshold_import_authorization":{"approved":True,"minimum_match_fraction":0.5}}
        self.assertFalse(evaluate_batch(rows(80),policy,ledger,"new")["destinations"][0]["import_authorized"])

    def test_threshold_mode_still_rejects_contradictory_pins(self):
        policy={**self.policy,"minimum_match_fraction":0.6,"approval_mode":"threshold"}
        ledger={"automatic_import_enabled":True,"threshold_import_authorization":{"approved":True,"minimum_match_fraction":0.6}}
        r=rows(60)
        r[0]["geometry_status"]="source_geometry_contradicted"
        self.assertFalse(evaluate_batch(r,policy,ledger,"new")["destinations"][0]["import_authorized"])
