import unittest

from fetch_osm_pilot import build_query, build_targeted_query


class FetchOsmPilotTests(unittest.TestCase):
    def test_barcelona_query_is_bounded_and_named(self):
        query = build_query("barcelona-es")
        self.assertIn("41.3,2.02,41.5,2.27", query)
        self.assertIn('["natural"="beach"]["name"]', query)
        self.assertNotIn("geocodeArea", query)

    def test_madeira_query_contains_routes_and_access_features(self):
        query = build_query("madeira-pt")
        self.assertIn("32.6,-17.35,32.9,-16.6", query)
        self.assertIn('["route"~"hiking|foot"]', query)
        self.assertIn('["tourism"="viewpoint"]', query)

    def test_island_group_query_uses_three_bounded_areas(self):
        query = build_query("balearic-islands-es")
        self.assertIn("39.25,2.3,40.05,3.55", query)
        self.assertIn("38.62,1.15,39.15,1.65", query)
        self.assertIn("39.75,3.75,40.15,4.35", query)
        self.assertEqual(query.count('["tourism"="viewpoint"]'), 3)

    def test_dolomites_query_includes_western_and_eastern_regions(self):
        query = build_query("dolomites-it")
        self.assertIn("46.0,10.55,46.55,11.25", query)
        self.assertIn("46.25,11.9,46.85,12.65", query)
        self.assertIn('["route"~"hiking|foot|bicycle|ski"]', query)

    def test_targeted_query_only_contains_osm_routed_names(self):
        suggestions = {"categories": {"nature": [
            ["Named Beach", ["Local Beach"], "beach"],
            ["Ordinary Restaurant", [], "restaurant"],
        ]}}
        query = build_targeted_query("balearic-islands-es", suggestions)
        self.assertIn("Named Beach", query)
        self.assertIn("Local Beach", query)
        self.assertNotIn("Ordinary Restaurant", query)


if __name__ == "__main__":
    unittest.main()
