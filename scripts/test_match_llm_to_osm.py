import unittest

from match_llm_to_osm import match


class OsmMatchingTests(unittest.TestCase):
    def test_route_match_preserves_access_restriction(self):
        suggestions = {
            "city": {"slug": "madeira-pt"},
            "categories": {"nature": [{
                "name": "PR 23 - Levada da Azenha",
                "aliases": ["Levada da Azenha"],
                "subtype": "classified hiking route",
                "content_kind": "route_experience",
                "official_verification_required": True,
            }]},
        }
        payload = {"elements": [{
            "type": "relation",
            "id": 4443090,
            "center": {"lat": 32.75, "lon": -17.0},
            "tags": {
                "name": "PR 23 - Levada da Azenha",
                "route": "hiking",
                "type": "route",
                "access": "no",
                "ref": "PR 23",
            },
        }]}

        rows = match(suggestions, payload)

        self.assertEqual(rows[0]["osm_match_status"], "auto_match")
        self.assertEqual(rows[0]["osm_id"], 4443090)
        self.assertIn("access_restricted", rows[0]["risk_flags"])
        self.assertIn("official_verification_required", rows[0]["risk_flags"])

    def test_routes_do_not_match_same_named_points(self):
        suggestions = {
            "city": {"slug": "madeira-pt"},
            "categories": {"nature": [{
                "name": "PR 8 - Vereda da Ponta de São Lourenço",
                "aliases": ["PR8"],
                "subtype": "classified hiking route",
                "content_kind": "route_experience",
            }]},
        }
        payload = {"elements": [{
            "type": "node",
            "id": 12,
            "lat": 32.75,
            "lon": -16.7,
            "tags": {"name": "PR 8 - Vereda da Ponta de São Lourenço", "tourism": "viewpoint"},
        }]}

        rows = match(suggestions, payload)

        self.assertEqual(rows[0]["osm_match_status"], "unmatched")
        self.assertEqual(rows[0]["osm_id"], "")

    def test_relation_bounds_supply_a_route_anchor(self):
        suggestions = {
            "city": {"slug": "madeira-pt"},
            "categories": {"nature": [{
                "name": "PR 1 - Vereda do Areeiro",
                "aliases": ["PR1"],
                "subtype": "classified hiking route",
                "content_kind": "route_experience",
            }]},
        }
        payload = {"elements": [{
            "type": "relation",
            "id": 2235102,
            "bounds": {"minlat": 32.7, "minlon": -17.0, "maxlat": 32.8, "maxlon": -16.9},
            "tags": {"name": "PR 1 - Vereda do Areeiro", "route": "hiking", "ref": "PR 1"},
        }]}

        rows = match(suggestions, payload)

        self.assertAlmostEqual(rows[0]["latitude"], 32.75)
        self.assertAlmostEqual(rows[0]["longitude"], -16.95)

    def test_duplicate_osm_features_do_not_create_a_false_near_tie(self):
        suggestions = {
            "city": {"slug": "barcelona-es"},
            "categories": {"nature": [{
                "name": "Bogatell Beach",
                "aliases": ["Platja del Bogatell"],
                "subtype": "beach",
                "content_kind": "place",
            }]},
        }
        payload = {"elements": [
            {"type": "node", "id": 1, "lat": 41.39, "lon": 2.21, "tags": {"name": "Platja del Bogatell", "natural": "beach"}},
            {"type": "way", "id": 2, "center": {"lat": 41.3905, "lon": 2.2105}, "tags": {"name": "Platja del Bogatell", "natural": "beach"}},
        ]}

        rows = match(suggestions, payload)

        self.assertEqual(rows[0]["osm_match_status"], "auto_match")
        self.assertGreaterEqual(float(rows[0]["score_margin"]), 0.04)


if __name__ == "__main__":
    unittest.main()
