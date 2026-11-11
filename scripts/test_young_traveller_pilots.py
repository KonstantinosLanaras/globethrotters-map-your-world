import json
import unittest
from pathlib import Path

from match_llm_to_overture import infer_source_route


DATA_DIR = Path(__file__).parent / "data"


def load(name):
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def items(payload):
    return [item for category in payload["categories"].values() for item in category]


class GeneralCatalogueWithBeachheadOverlayTests(unittest.TestCase):
    def test_catalogue_selection_is_general_and_market_overlay_is_non_gating(self):
        for filename in (
            "barcelona_young_traveller_pilot.json",
            "madeira_young_traveller_pilot.json",
        ):
            payload = load(filename)
            self.assertTrue(payload["selection_policy"]["audience_neutral"])
            self.assertEqual(payload["market_positioning"]["target_audience"], "young_european_25_35")
            self.assertFalse(payload["market_positioning"]["controls_catalogue_inclusion"])
            for item in items(payload):
                self.assertGreaterEqual(item["young_traveller_score"], 0, item["name"])
                self.assertLessEqual(item["young_traveller_score"], 100, item["name"])
                self.assertTrue(item["selection_reasons"], item["name"])
                self.assertTrue(item["trip_styles"], item["name"])
                self.assertTrue(item["suitable_for"], item["name"])
                self.assertIn(item["budget_level"], {"free", "budget", "moderate", "premium", "mixed"})

    def test_routes_never_default_to_overture_place_matching(self):
        for filename in (
            "barcelona_young_traveller_pilot.json",
            "madeira_young_traveller_pilot.json",
        ):
            for item in items(load(filename)):
                route = item.get("source_route") or infer_source_route(item["content_kind"], item["subtype"])
                if item["content_kind"] == "route_experience" and "classified" in item["subtype"]:
                    self.assertEqual(route, "osm_route_then_official", item["name"])

    def test_madeira_classified_routes_require_official_verification(self):
        madeira = load("madeira_young_traveller_pilot.json")
        classified = [item for item in items(madeira) if item["subtype"] == "classified hiking route"]
        self.assertGreaterEqual(len(classified), 10)
        self.assertTrue(all(item.get("official_verification_required") for item in classified))

    def test_pilots_are_tailored_not_equal_category_templates(self):
        barcelona = load("barcelona_young_traveller_pilot.json")
        madeira = load("madeira_young_traveller_pilot.json")
        self.assertNotEqual(
            [len(values) for values in barcelona["categories"].values()],
            [len(values) for values in madeira["categories"].values()],
        )
        self.assertGreater(len(madeira["categories"]["nature"]), len(madeira["categories"]["nightlife"]) * 4)


if __name__ == "__main__":
    unittest.main()
