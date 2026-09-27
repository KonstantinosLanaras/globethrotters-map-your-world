import unittest

from import_overture import (
    apply_curated_place_override,
    collect_place_names,
    normalize_place_name,
    preferred_place_name,
    select_quality_candidates,
)


CITY = {
    "slug": "test-city", "name": "Test City", "country": "Testland",
    "country_code": "IT", "latitude": 50.0, "longitude": 10.0,
    "market_rank": 1, "search_radius_km": 25,
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

    def test_prefers_localized_name_and_preserves_aliases(self):
        common = {"it": "Duomo di Milano", "en": "Milan Cathedral"}
        rules = [{"value": "Duomo", "variant": "short", "language": "it"}]

        self.assertEqual(
            preferred_place_name("Katedra w Mediolanie", common, "IT"),
            "Duomo di Milano",
        )
        self.assertEqual(
            collect_place_names("Katedra w Mediolanie", common, rules),
            ["Katedra w Mediolanie", "Duomo di Milano", "Milan Cathedral", "Duomo"],
        )

    def test_applies_auditable_landmark_name_override(self):
        item = candidate(
            "Katedra w Mediolanie", "culture", "christian_place_of_worship",
        )
        item["source_id"] = "3b8ece8c-380f-4a9f-aaf2-65fc39611c36"
        item["metadata"]["alternate_names"] = ["Katedra w Mediolanie"]

        result = apply_curated_place_override(item)

        self.assertEqual(result["name"], "Duomo di Milano")
        self.assertEqual(
            result["metadata"]["alternate_names"],
            ["Duomo di Milano", "Katedra w Mediolanie", "Milan Cathedral"],
        )
        self.assertTrue(result["metadata"]["editorial_name_override"])

    def test_keeps_curated_landmark_inside_a_tight_culture_limit(self):
        landmark = candidate(
            "Duomo di Milano", "culture", "christian_place_of_worship",
            lat=50.1, confidence=0.8,
        )
        landmark["source_id"] = "3b8ece8c-380f-4a9f-aaf2-65fc39611c36"
        ordinary = candidate(
            "Nearby Museum", "culture", "museum", lat=50.001, confidence=0.99,
        )

        selected, _ = select_quality_candidates(
            [ordinary, landmark], {"test-city": CITY}, 1,
        )

        self.assertEqual([item["name"] for item in selected], ["Duomo di Milano"])

    def test_deduplicates_verified_aliases_across_distinct_overture_ids(self):
        park = candidate(
            "Giardini Pubblici Indro Montanelli", "nature", "park",
            lat=50.01, confidence=0.80,
        )
        park["source_id"] = "6843d58e-af51-4d76-a197-ac49373a3441"
        duplicate = candidate(
            "Parco di Porta Venezia - Milano", "nature", "park",
            lat=50.0, confidence=0.99,
        )

        selected, report = select_quality_candidates(
            [apply_curated_place_override(park), duplicate], {"test-city": CITY}, 10,
        )

        self.assertEqual(
            [item["name"] for item in selected],
            ["Giardini Pubblici Indro Montanelli"],
        )
        self.assertEqual(
            report["cities"]["test-city"]["categories"]["nature"]["rejected"]["duplicate_name"],
            1,
        )

    def test_rejects_verified_bad_record_by_stable_id(self):
        item = candidate("Fineco", "culture", "art_gallery")
        item["source_id"] = "bf4a3e63-d6e3-41eb-97fc-77512280fa0c"

        selected, report = select_quality_candidates([item], {"test-city": CITY}, 10)

        self.assertEqual(selected, [])
        self.assertEqual(
            report["cities"]["test-city"]["categories"]["culture"]["rejected"]["editorial_exclusion"],
            1,
        )

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
            candidate("Music Hall", "nightlife", "live_music_venue", lat=50.12, confidence=0.80),
        ]

        selected, _ = select_quality_candidates(items, {"test-city": CITY}, 2)

        self.assertEqual([item["name"] for item in selected], ["Music Hall", "Near Bar"])
        self.assertEqual(selected[0]["metadata"]["selection_basis"], "coverage_quality_gate_v1")

    def test_rejects_candidates_beyond_the_category_radius(self):
        items = [
            candidate("Central Park", "nature", "park", lat=50.05),
            candidate("Remote Park", "nature", "park", lat=50.25),
        ]

        selected, report = select_quality_candidates(items, {"test-city": CITY}, 10)

        self.assertEqual([item["name"] for item in selected], ["Central Park"])
        self.assertEqual(
            report["cities"]["test-city"]["categories"]["nature"]["rejected"]["outside_category_radius"],
            1,
        )


if __name__ == "__main__":
    unittest.main()
