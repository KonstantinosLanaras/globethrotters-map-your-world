import unittest
from datetime import date
from unittest.mock import patch

from route_quality import named_hike,route_hold_reasons,valid_route_geometry
from catalogue_batch_gate import valid_match
from export_llm_catalogue import effective_row,mvp_record


def route():
    return {"city_slug":"test","category":"nature","rank":"1","display_name":"Named hike",
            "content_kind":"route_experience","llm_subtype":"hiking route","match_strategy":"osm_route_then_official",
            "match_status":"auto_match","matched_source":"osm","matched_source_id":"osm:relation:123",
            "osm_type":"relation","route_identity_confirmed":"True","official_status":"open",
            "official_source_url":"https://example.org/trails/123","official_status_checked_at":date.today().isoformat(),
            "latitude":"","longitude":""}


class RouteQualityTests(unittest.TestCase):
    def test_named_hike_is_not_generic_editorial(self):
        self.assertTrue(named_hike(route()))
        self.assertFalse(named_hike({"content_kind":"route_experience","llm_subtype":"neighbourhood walk"}))

    def test_fresh_confirmed_route_needs_no_fake_pin(self):
        row=route()
        self.assertEqual(route_hold_reasons(row),[])
        self.assertTrue(valid_match(row))
        record=mvp_record(row,"test")
        self.assertEqual(record["source"],"osm")
        self.assertIsNone(record["latitude"])

    def test_route_line_is_retained_without_manufactured_links(self):
        row=route()
        row["geometry_geojson"]='{"type":"MultiLineString","coordinates":[[[1,2],[2,3]],[[5,6],[7,8]]]}'
        self.assertEqual(len(mvp_record(row,"test")["geometry_geojson"]["coordinates"]),2)

    def test_source_and_current_status_are_required_even_past_coverage_gate(self):
        for field,value in [("matched_source","overture"),("official_status","closed"),
                            ("official_source_url",""),("official_status_checked_at","2026-09-30"),
                            ("route_identity_confirmed","False"),("osm_access","private")]:
            with self.subTest(field=field):
                row=route();row[field]=value
                self.assertFalse(valid_match(row))
                self.assertEqual(effective_row(row)["match_status"],"review")

    def test_exactly_seven_day_status_allowed_not_future_or_eight_days(self):
        row=route();row["official_status_checked_at"]="2026-11-04"
        self.assertEqual(route_hold_reasons(row,today=date(2026,11,11)),[])
        self.assertIn("official_route_status_stale",route_hold_reasons(row,today=date(2026,11,12)))
        self.assertIn("official_route_status_stale",route_hold_reasons(row,today=date(2026,11,3)))

    def test_geometry_validation_rejects_invalid_coordinates(self):
        for geometry in [None,{"type":"Point","coordinates":[1,2]},
                         {"type":"LineString","coordinates":[[1,2]]},
                         {"type":"LineString","coordinates":[[1,95],[2,3]]}]:
            self.assertFalse(valid_route_geometry(geometry))


if __name__=="__main__":unittest.main()
