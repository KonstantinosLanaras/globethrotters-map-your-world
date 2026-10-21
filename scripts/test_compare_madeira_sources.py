import unittest

from compare_madeira_sources import build_report, compare_one


class MadeiraSourceComparisonTests(unittest.TestCase):
    def test_multiple_same_name_rows_without_coordinates_remain_ambiguous(self):
        result=compare_one({"name":"Pico Ruivo"},"osm",[
            {"id":"relation/1","name":"Pico Ruivo"},
            {"id":"way/2","name":"Pico Ruivo"}],max_distance_m=500)
        self.assertEqual(result["status"],"ambiguous")

    def test_locality_mismatch_is_not_matched(self):
        result=compare_one({"name":"Miradouro","locality":"Funchal"},"overture",[
            {"id":"x","name":"Miradouro","locality":"Santana","latitude":32.8,"longitude":-16.9}],max_distance_m=500)
        self.assertEqual(result["status"],"unmatched")

    def test_exact_source_id_wins_and_is_traceable(self):
        result=compare_one({"name":"Different label","source_checks":[{"source":"wikidata","source_id":"Q1"}]},"wikidata",[
            {"id":"Q1","name":"Pico Ruivo","latitude":32.7,"longitude":-16.9}],max_distance_m=500)
        self.assertEqual(result["status"],"matched")
        self.assertEqual(result["method"],"exact_source_id")

    def test_report_keeps_unmatched_candidates_and_marks_routes(self):
        report=build_report({"candidates":[
            {"candidate_id":"a","name":"Levada walk","content_kind":"route"},
            {"candidate_id":"b","name":"Funchal evening","content_kind":"timed_experience"}],
            "sources":{"overture":[{"id":"x","name":"Funchal evening"}]}})
        self.assertEqual(report["candidate_count"],2)
        self.assertEqual(report["decisions"][0]["source_checks"]["overture"]["status"],"not_applicable")
        self.assertEqual(report["decisions"][1]["source_checks"]["overture"]["status"],"matched")
        self.assertEqual(report["source_summary"]["osm"],{"not_checked":2})


if __name__=="__main__":
    unittest.main()
