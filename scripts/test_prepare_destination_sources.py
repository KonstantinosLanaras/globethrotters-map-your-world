import unittest
from datetime import date
from prepare_destination_sources import prepare,validate_plan
from match_llm_to_overture import parse_suggestion
from fetch_osm_pilot import build_targeted_query
from match_llm_to_osm import match,route_geometry


def suggestions():
    return {"city":{"slug":"new-region"},
            "outdoor_plan":{"hiking_relevance":"core","minimum_named_hikes":1,"rationale":"Mountain destination"},
            "destination_bounds":{"min_latitude":30,"max_latitude":40,"min_longitude":-20,"max_longitude":-10},
            "categories":{"nature":[{"name":"Named hike","subtype":"hiking route","content_kind":"route_experience","route_ref":"PR 1"}]}}


def element(**tags):
    return {"type":"relation","id":123,"center":{"lat":35,"lon":-15},
            "tags":{"name":"Named hike","route":"hiking","ref":"PR 1",**tags}}


class DestinationSourceTests(unittest.TestCase):
    def test_ordinary_hiking_subtype_cannot_opt_out_of_source_matching(self):
        item=suggestions()["categories"]["nature"][0]
        item["source_route"]="editorial_route_osm_optional"
        self.assertEqual(parse_suggestion(item)["source_route"],"osm_route_then_official")

    def test_relevant_destinations_must_actually_include_hikes(self):
        payload=suggestions();payload["categories"]["nature"]=[]
        with self.assertRaisesRegex(ValueError,"only 0 supplied"):validate_plan(payload)

    def test_city_can_explain_no_hiking_without_forced_quota(self):
        payload=suggestions();payload["categories"]["nature"]=[]
        payload["outdoor_plan"]={"hiking_relevance":"not_applicable","minimum_named_hikes":0,"rationale":"This urban-centre batch has no hiking region"}
        self.assertEqual(validate_plan(payload)["named_hikes_selected"],0)

    def test_new_destination_query_is_bounded_and_requests_geometry(self):
        query=build_targeted_query("new-region",suggestions())
        self.assertIn("30.0,-20.0,40.0,-10.0",query)
        self.assertIn("out body geom",query)
        payload=suggestions();payload.pop("destination_bounds")
        with self.assertRaises(ValueError):build_targeted_query("new-region",payload)

    def test_same_named_bicycle_route_does_not_match_hike(self):
        self.assertEqual(match(suggestions(),{"elements":[element(route="bicycle")]})[0]["osm_match_status"],"unmatched")

    def test_conflicting_route_reference_is_not_accepted(self):
        self.assertEqual(match(suggestions(),{"elements":[element(ref="PR 2")]})[0]["osm_match_status"],"unmatched")

    def test_route_outside_destination_is_not_matched(self):
        record=element();record["center"]={"lat":50,"lon":20}
        self.assertEqual(match(suggestions(),{"elements":[record]})[0]["osm_match_status"],"unmatched")

    def test_geometry_segments_are_not_connected_across_gaps(self):
        record=element();record["members"]=[{"type":"way","geometry":[{"lat":35,"lon":-15},{"lat":35.1,"lon":-15.1}]},
            {"type":"way","geometry":[{"lat":36,"lon":-16},{"lat":36.1,"lon":-16.1}]}]
        geometry,status=route_geometry(record)
        self.assertEqual(status,"source_segments")
        self.assertEqual(len(geometry["coordinates"]),2)

    def test_missing_osm_keeps_route_for_review_not_editorial_publication(self):
        row={"city_slug":"new-region","category":"nature","rank":"1","display_name":"Named hike",
             "content_kind":"route_experience","llm_subtype":"hiking route","match_status":"editorial_only"}
        result,_,report=prepare(suggestions(),[row],None,today=date(2026,11,11))
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]["match_status"],"review")
        self.assertEqual(report["route_matches_eligible"],0)

    def test_source_pipeline_merges_integer_match_ranks_with_csv_string_ranks(self):
        payload=suggestions()
        payload["official_status_checks"]={"checked_at":"2026-11-11","source_url":"https://example.org/trails",
            "routes":{"PR 1":{"status":"open"}}}
        row={"city_slug":"new-region","category":"nature","rank":"1","display_name":"Named hike",
             "content_kind":"route_experience","llm_subtype":"hiking route","match_status":"editorial_only"}
        result,_,report=prepare(payload,[row],{"elements":[element()]},today=date(2026,11,11))
        self.assertEqual(report["route_identity_matches"],1)
        self.assertEqual(report["route_matches_eligible"],1)
        self.assertEqual(result[0]["latitude"],"")

    def test_decimal_route_refs_are_not_conflated(self):
        payload=suggestions();payload["categories"]["nature"][0]["route_ref"]="PR 1.2"
        self.assertEqual(match(payload,{"elements":[element(ref="PR 12")]})[0]["osm_match_status"],"unmatched")

    def reviewed_row(self):
        return {"city_slug":"new-region","category":"nature","rank":"1","display_name":"Named hike",
            "content_kind":"route_experience","llm_subtype":"hiking route","match_status":"manual_match",
            "matched_source":"osm","matched_source_id":"osm:relation:123","osm_id":"123","llm_identity_decision":"same_feature"}

    def test_model_reviewed_source_id_is_retained_through_near_tie(self):
        payload=suggestions();payload["categories"]["nature"][0].pop("route_ref")
        payload["official_status_checks"]={"checked_at":"2026-11-11","source_url":"https://example.org/trails","routes":{"PR 1":{"status":"open"}}}
        other=element();other["id"]=456;other["center"]={"lat":35.3,"lon":-15.3}
        result,_,_=prepare(payload,[self.reviewed_row()],{"elements":[element(),other]},today=date(2026,11,11))
        self.assertEqual(result[0]["match_status"],"manual_match")
        self.assertEqual(result[0]["matched_source_id"],"osm:relation:123")

    def test_rejected_exact_osm_id_is_not_silently_reaccepted(self):
        row=self.reviewed_row();row.update(llm_identity_decision="wrong_feature",match_status="unmatched")
        result,_,_=prepare(suggestions(),[row],{"elements":[element()]},today=date(2026,11,11))
        self.assertEqual(result[0]["match_status"],"review")
        self.assertIn("route_identity_previously_rejected",result[0]["risk_flags"])


if __name__=="__main__":unittest.main()
