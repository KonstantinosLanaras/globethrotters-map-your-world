import unittest

from import_overture import normalize_place_name, select_quality_candidates


CITY = {
    "slug": "test-city", "name": "Test City", "country": "Testland",
    "latitude": 50.0, "longitude": 10.0, "market_rank": 1,
}


def candidate(name, category="food", subcategory="restaurant", lat=50.0, confidence=0.9):
    return {
        "city_slug": "test-city", "name": name, "latitude": lat, "longitude": 10.0,
        "canonical_category": category, "subcategory": subcategory,
        "source_confidence": confidence, "metadata": {}, "source_id": name,
    }


class ImportQualityTests(unittest.TestCase):
    def test_normalizes_accents_and_punctuation(self):
        self.assertEqual(normalize_place_name("Café d'Art!"), "cafe d art")

    def test_deduplicates_names_and_blocks_parking_noise(self):
        items = [
            candidate("Tasty Poké"),
            candidate("Tasty Poke"),
            candidate("Central Car Park", "nature", "park"),
            candidate("Botanical Garden", "nature", "botanical_garden"),
        ]

        selected, report = select_quality_candidates(items, {"test-city": CITY}, 10)

        self.assertEqual([item["name"] for item in selected], ["Tasty Poké", "Botanical Garden"])
        food_report = report["cities"]["test-city"]["categories"]["food"]
        nature_report = report["cities"]["test-city"]["categories"]["nature"]
        self.assertEqual(food_report["rejected"]["duplicate_name"], 1)
        self.assertEqual(nature_report["rejected"]["nature_infrastructure"], 1)

    def test_blocks_global_food_chains_without_rejecting_local_restaurants(self):
        items = [
            candidate("Burger King Nygata"),
            candidate("Domino's Pizza"),
            candidate("McDonald’s"),
            candidate("Family Burger House"),
        ]

        selected, report = select_quality_candidates(items, {"test-city": CITY}, 10)

        self.assertEqual([item["name"] for item in selected], ["Family Burger House"])
        self.assertEqual(
            report["cities"]["test-city"]["categories"]["food"]["rejected"]["global_food_chain"],
            3,
        )

    def test_prefers_subtype_then_city_center(self):
        items = [
            candidate("Far Bar", "nightlife", "bar", lat=50.1, confidence=0.99),
            candidate("Near Bar", "nightlife", "bar", lat=50.01, confidence=0.85),
            candidate("Music Hall", "nightlife", "live_music_venue", lat=50.2, confidence=0.80),
        ]

        selected, _ = select_quality_candidates(items, {"test-city": CITY}, 2)

        self.assertEqual([item["name"] for item in selected], ["Music Hall", "Near Bar"])
        self.assertEqual(selected[0]["metadata"]["selection_basis"], "coverage_quality_gate_v1")


if __name__ == "__main__":
    unittest.main()
