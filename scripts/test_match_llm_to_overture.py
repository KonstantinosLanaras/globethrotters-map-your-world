import unittest
from unittest.mock import patch

from match_llm_to_overture import (
    infer_content_kind,
    infer_source_route,
    match_suggestions,
    normalize,
    normalize_address,
    pair_score,
    read_destination_overture,
    relaxed,
    summarize,
)


def record(
    identifier,
    name,
    aliases=None,
    taxonomy="museum",
    category="museum",
    distance=1.0,
    latitude=45.46,
    longitude=9.19,
    address=None,
    locality="Milano",
    postcode=None,
):
    return {
        "id": identifier,
        "primary_name": name,
        "common_names": aliases or [],
        "rule_names": [],
        "brand_name": None,
        "websites": [],
        "operating_status": None,
        "basic_category": category,
        "taxonomy_primary": taxonomy,
        "taxonomy_hierarchy": [taxonomy],
        "taxonomy_alternates": [],
        "confidence": 0.9,
        "latitude": latitude,
        "longitude": longitude,
        "distance_km": distance,
        "address": address,
        "locality": locality,
        "postcode": postcode,
    }


def suggestions(name, aliases=None, category="culture", location_hint=None):
    payload = {
        "city": {"name": "Milano", "latitude": 45.4642, "longitude": 9.19},
        "categories": {category: [[name, aliases or [], "test"]]},
    }
    if location_hint:
        payload["location_hints"] = {category: {name: location_hint}}
    return payload


class MatchingTests(unittest.TestCase):
    def test_distant_same_address_records_are_not_collapsed(self):
        rows=match_suggestions(suggestions("Museum Example"),[
            record("near","Museum Example",address="Shared Road 1"),
            record("far","Museum Example",address="Shared Road 1",latitude=45.6)])
        self.assertEqual(rows[0]["duplicate_cluster_size"],1)
        self.assertEqual(rows[0]["independent_candidate_clusters"],2)
        self.assertNotEqual(rows[0]["match_status"],"auto_match")

    def test_official_closure_metadata_survives_matching(self):
        payload=suggestions("Museum Example")
        payload["categories"]["culture"]=[{"name":"Museum Example","content_kind":"place",
            "official_verification_required":True,"official_status":"closed",
            "official_status_checked_at":"2026-11-07","official_source_url":"https://example.org/status"}]
        row=match_suggestions(payload,[record("one","Museum Example")])[0]
        self.assertEqual(row["official_status"],"closed")
        self.assertEqual(row["official_status_checked_at"],"2026-11-07")

    def test_locality_only_hint_is_not_treated_as_missing_precise_coordinates(self):
        payload=suggestions("Museum Example",location_hint={"locality":"Milano"})
        row=match_suggestions(payload,[record("museum","Museum Example")])[0]
        self.assertEqual(row["match_status"],"auto_match")
        self.assertNotIn("location_mismatch",row["risk_flags"])
    def test_rejected_record_is_excluded_but_alternatives_remain(self):
        payload=suggestions("Museum Example")
        payload["rejected_candidate_ids"]={"culture:Museum Example":["bad"]}
        rows=match_suggestions(payload,[record("bad","Museum Example"),record("good","Museum Example")])
        self.assertEqual(rows[0]["candidate_overture_id"],"good")

    def test_spaced_corporate_suffix_is_ignored(self):
        self.assertEqual(relaxed("Cafe Example S. L."), "cafe example")
        self.assertGreaterEqual(pair_score("Cafe Example", "Cafe Example S L"), 0.94)

    def test_service_sector_category_overlap(self):
        rows = match_suggestions(suggestions("Hotel Example", category="nightlife"), [
            record("hotel", "Hotel Example", taxonomy="hotel", category="hotel")])
        self.assertEqual(rows[0]["match_status"], "auto_match")
        food = match_suggestions(suggestions("Bar Example", category="food"), [
            record("bar", "Bar Example", taxonomy="bar", category="bar")])
        self.assertNotIn("category_conflict", food[0]["risk_flags"])

    def test_alternatives_exported_not_only_best(self):
        rows = match_suggestions(suggestions("Museum Example"), [
            record("a", "Museum Example"),
            record("b", "Museum Example Two", latitude=45.6)])
        import json
        self.assertEqual({r["id"] for r in json.loads(rows[0]["candidate_alternatives"])}, {"a", "b"})

    def test_beach_name_on_restaurant_cannot_auto_match(self):
        payload = suggestions("Cala Bassa", category="nature")
        payload["categories"]["nature"][0][2] = "beach"
        rows = match_suggestions(payload, [record("restaurant", "Cala Bassa", taxonomy="restaurant", category="restaurant")])
        self.assertNotEqual(rows[0]["match_status"], "auto_match")
        self.assertIn("subtype_conflict", rows[0]["risk_flags"])

    def test_wrong_island_is_not_accepted_even_if_name_exact(self):
        payload = suggestions("Cala San Vicente", category="nature")
        payload["destination_bounds"] = {
            "min_latitude": 38.83, "max_latitude": 39.13,
            "min_longitude": 1.12, "max_longitude": 1.68,
        }
        rows = match_suggestions(payload, [record("mallorca", "Cala San Vicente", taxonomy="beach", category="beach")])
        self.assertEqual(rows[0]["match_status"], "unmatched")
        self.assertIn("outside_destination", rows[0]["risk_flags"])

    def test_accommodation_needs_identity_review(self):
        rows = match_suggestions(suggestions("Portinatx", category="nature"), [
            record("hotel", "Portinatx", taxonomy="hotel", category="hotel")
        ])
        self.assertEqual(rows[0]["match_status"], "review")
        self.assertIn("accommodation_identity_review", rows[0]["risk_flags"])

    def test_nature_exact_name_cannot_override_wrong_place_type(self):
        rows = match_suggestions(suggestions("S'Albufera", category="nature"), [
            record("skate", "S'Albufera", taxonomy="skate_park", category="skate_park")
        ])
        self.assertEqual(rows[0]["match_status"], "review")
        self.assertIn("nature_feature_type_conflict", rows[0]["risk_flags"])

    def test_valid_beach_preferred_over_same_named_business(self):
        payload = suggestions("Cala Bassa", category="nature")
        payload["categories"]["nature"][0][2] = "beach"
        rows = match_suggestions(payload, [
            record("business", "Cala Bassa", taxonomy="restaurant", category="restaurant"),
            record("feature", "Cala Bassa", taxonomy="beach", category="beach", latitude=38.97, longitude=1.23),
        ])
        self.assertEqual(rows[0]["candidate_overture_id"], "feature")

    def test_selection_limits_can_exceed_legacy_category_cap(self):
        payload = {
            "city": {"slug": "region-test", "name": "Region", "country": "Test"},
            "selection_limits": {"nature": 45},
            "categories": {
                "nature": [
                    {
                        "name": f"Editorial walk {index}",
                        "subtype": "walking route",
                        "content_kind": "route_experience",
                    }
                    for index in range(45)
                ]
            },
        }

        rows = match_suggestions(payload, [])

        self.assertEqual(sum(bool(row["proposed"]) for row in rows), 45)

    def test_destination_reader_merges_search_areas_by_overture_id(self):
        payload = {
            "city": {"latitude": 0, "longitude": 0, "match_radius_km": 1},
            "search_areas": [
                {"latitude": 1, "longitude": 2, "match_radius_km": 3},
                {"latitude": 4, "longitude": 5, "match_radius_km": 6},
            ],
        }
        calls = []

        def fake_reader(area, release, extension_path=None):
            calls.append(area)
            if len(calls) == 1:
                return [{"id": "same", "distance_km": 2}, {"id": "first", "distance_km": 1}]
            return [{"id": "same", "distance_km": 1}, {"id": "second", "distance_km": 1}]

        with patch("match_llm_to_overture.read_raw_overture", side_effect=fake_reader):
            rows = read_destination_overture(payload, "release")

        self.assertEqual(len(calls), 2)
        self.assertEqual({row["id"] for row in rows}, {"same", "first", "second"})
        self.assertEqual(next(row for row in rows if row["id"] == "same")["distance_km"], 1)

    def test_routes_to_source_by_content_shape(self):
        self.assertEqual(infer_source_route("place", "restaurant"), "overture_place")
        self.assertEqual(infer_source_route("place", "mountain viewpoint"), "overture_and_osm_feature")
        self.assertEqual(infer_source_route("route_experience", "classified hiking route"), "osm_route_then_official")
        self.assertEqual(
            infer_source_route("route_experience", "neighbourhood walking route"),
            "editorial_route_osm_optional",
        )
        self.assertEqual(infer_source_route("area_experience", "neighbourhood evening"), "editorial_area_osm_geonames")

    def test_normalizes_accents_and_punctuation(self):
        self.assertEqual(normalize("N'Ombra de Vin"), "n ombra de vin")
        self.assertEqual(normalize("Ratanà"), "ratana")
        self.assertEqual(normalize("Pirelli HangarBicocca"), "pirelli hangar bicocca")
        self.assertEqual(normalize_address("P.za del Duomo"), normalize_address("Piazza del Duomo"))
        self.assertEqual(normalize_address("Pg. de Gràcia, 43"), normalize_address("Passeig de Gràcia 43"))
        self.assertEqual(normalize_address("Pl. Reial, 17"), normalize_address("Plaça Reial 17"))

    def test_relaxes_city_suffix_without_removing_internal_tokens(self):
        self.assertEqual(relaxed("Blue Note Milano"), "blue note")
        self.assertEqual(relaxed("Museo di Milano Moderno"), "museo di milano moderno")

    def test_typo_is_scored_below_exact_but_above_review(self):
        self.assertEqual(pair_score("Pinacoteca di Brera", "Pinacoteca di Brera"), 1.0)
        self.assertGreater(pair_score("Pinacoteca di Brera", "Pinacoteca Brera"), 0.80)
        self.assertLess(pair_score("Pinacoteca di Brera", "Pizzacoteca di Brera"), 0.94)

    def test_distinctive_name_survives_generic_restaurant_prefix(self):
        self.assertGreaterEqual(pair_score("Trippa", "Trattoria Trippa"), 0.94)

    def test_clean_exact_category_match_is_automatic(self):
        rows = match_suggestions(suggestions("Duomo di Milano"), [record("1", "Duomo di Milano", taxonomy="cathedral")])
        self.assertEqual(rows[0]["match_status"], "auto_match")

    def test_alias_to_unrelated_primary_is_reviewed(self):
        contaminated = record("bad", "Pizzacoteca di Brera", ["Pinacoteca di Brera"], taxonomy="restaurant", category="restaurant")
        rows = match_suggestions(suggestions("Pinacoteca di Brera"), [contaminated])
        self.assertEqual(rows[0]["match_status"], "review")
        self.assertIn("alias_primary_conflict", rows[0]["risk_flags"])

    def test_cross_category_exact_match_is_reviewed_not_dropped(self):
        venue = record("blue", "Blue Note Milano", taxonomy="music_venue", category="arts_and_entertainment")
        rows = match_suggestions(suggestions("Blue Note Milano", category="nightlife"), [venue])
        self.assertEqual(rows[0]["match_status"], "auto_match")

    def test_near_tie_requires_review(self):
        records = [
            record("a", "Bar Duomo", taxonomy="bar", category="bar", distance=1, latitude=45.46, longitude=9.19, address="Via A 1"),
            record("b", "Bar Duomo", taxonomy="bar", category="bar", distance=2, latitude=45.48, longitude=9.21, address="Via B 2"),
        ]
        rows = match_suggestions(suggestions("Bar Duomo", category="nightlife"), records)
        self.assertEqual(rows[0]["match_status"], "review")
        self.assertIn("near_tie", rows[0]["risk_flags"])

    def test_duplicate_overture_rows_do_not_create_near_tie(self):
        records = [
            record("a", "Trattoria Trippa", taxonomy="restaurant", category="restaurant", address="Via Giorgio Vasari 1"),
            record("b", "Trattoria Trippa", taxonomy="restaurant", category="restaurant", address="Via Giorgio Vasari 1", latitude=45.461, longitude=9.191),
        ]
        rows = match_suggestions(suggestions("Trippa", category="food"), records)
        self.assertEqual(rows[0]["match_status"], "auto_match")
        self.assertNotIn("near_tie", rows[0]["risk_flags"])
        self.assertEqual(rows[0]["duplicate_cluster_size"], 2)

    def test_category_conflict_is_warning_not_veto_for_exact_identity(self):
        venue = record("market", "Mercato Centrale Milano", taxonomy="grocery_store", category="grocery_store")
        rows = match_suggestions(suggestions("Mercato Centrale Milano", category="food"), [venue])
        self.assertEqual(rows[0]["match_status"], "auto_match")
        self.assertIn("category_conflict", rows[0]["risk_flags"])

    def test_verified_address_selects_correct_branch(self):
        records = [
            record("wrong", "Peck", taxonomy="restaurant", category="restaurant", address="Via Tommaso Salvini 3"),
            record("right", "Peck Milano", taxonomy="restaurant", category="restaurant", address="Via Spadari 9"),
        ]
        rows = match_suggestions(
            suggestions("Peck", category="food", location_hint={"address": "Via Spadari 9", "locality": "Milano"}),
            records,
        )
        self.assertEqual(rows[0]["overture_id"], "right")
        self.assertEqual(rows[0]["match_status"], "auto_match")

    def test_exact_name_beats_related_venue_at_the_same_address(self):
        records = [
            record("related", "Museu de la Sagrada Família", address="Carrer de Mallorca 401", locality="Barcelona", postcode="08013"),
            record("right", "Sagrada Familia", address="Carrer Mallorca 401", locality="Barcelona", postcode="08013"),
        ]
        payload = {
            "city": {"name": "Barcelona", "latitude": 41.3874, "longitude": 2.1686},
            "location_hints": {"culture": {"Basílica de la Sagrada Família": {
                "address": "Carrer de Mallorca 401", "locality": "Barcelona", "postcode": "08013"
            }}},
            "categories": {"culture": [[
                "Basílica de la Sagrada Família", ["Sagrada Familia"], "basilica"
            ]]},
        }

        rows = match_suggestions(payload, records)

        self.assertEqual(rows[0]["overture_id"], "right")
        self.assertEqual(rows[0]["match_status"], "auto_match")

    def test_verified_coordinates_can_resolve_bad_source_address(self):
        venue = record(
            "church",
            "Santa Maria delle Grazie",
            taxonomy="church",
            category="church",
            latitude=45.46595,
            longitude=9.17042,
            address="Incorrect source address",
        )
        rows = match_suggestions(
            suggestions(
                "Santa Maria delle Grazie",
                category="culture",
                location_hint={"latitude": 45.46595, "longitude": 9.17042, "address": "Via Sassi 3"},
            ),
            [venue],
        )
        self.assertEqual(rows[0]["match_status"], "auto_match")
        self.assertAlmostEqual(float(rows[0]["location_hint_distance_km"]), 0.0)

    def test_verified_address_rejects_wrong_distant_namesake(self):
        wrong = record(
            "wrong",
            "Rita",
            taxonomy="bar",
            category="bar",
            latitude=45.59,
            longitude=9.21,
            address="Via Roma 3",
            locality="Nova Milanese",
        )
        rows = match_suggestions(
            suggestions("Rita & Cocktails", ["Rita"], category="nightlife", location_hint={"address": "Via Angelo Fumagalli 1", "locality": "Milano"}),
            [wrong],
        )
        self.assertEqual(rows[0]["match_status"], "unmatched")
        self.assertIn("location_mismatch", rows[0]["risk_flags"])
        self.assertNotIn("near_tie", rows[0]["risk_flags"])
        self.assertEqual(rows[0]["overture_id"], "")
        self.assertEqual(rows[0]["candidate_overture_id"], "wrong")

    def test_category_resolves_same_name_independent_candidates(self):
        records = [
            record("right", "Backdoor 43", taxonomy="cocktail_bar", category="bar", address="Ripa di Porta Ticinese 43"),
            record("wrong", "Backdoor 43", taxonomy="software_company", category="professional_service", latitude=45.50, longitude=9.24, address="Via Industria 8"),
        ]
        rows = match_suggestions(suggestions("Backdoor 43", category="nightlife"), records)
        self.assertEqual(rows[0]["overture_id"], "right")
        self.assertEqual(rows[0]["match_status"], "auto_match")
        self.assertNotIn("near_tie", rows[0]["risk_flags"])

    def test_low_similarity_remains_unmatched(self):
        rows = match_suggestions(suggestions("Fondazione Prada"), [record("x", "Prado Cafe", taxonomy="cafe", category="cafe")])
        self.assertEqual(rows[0]["match_status"], "unmatched")

    def test_short_acronym_alias_does_not_beat_descriptive_primary_name(self):
        records = [
            record("right", "BAM - Biblioteca degli Alberi Milano", taxonomy="park", category="park", distance=2),
            record("wrong", "Bam! Snc", taxonomy="marketing_agency", category="professional_service", distance=1),
        ]
        rows = match_suggestions(
            suggestions("Biblioteca degli Alberi Milano", ["BAM Milano"], category="nature"),
            records,
        )
        self.assertEqual(rows[0]["overture_id"], "right")

    def test_explicit_editorial_experience_skips_overture_matching(self):
        payload = {
            "city": {"name": "London"},
            "editorial_anchors": {
                "Soho evening": {
                    "latitude": 51.5137,
                    "longitude": -0.1312,
                    "anchor_name": "Soho",
                    "precision": "neighbourhood",
                }
            },
            "categories": {
                "nightlife": [{
                    "name": "Soho evening",
                    "aliases": [],
                    "subtype": "neighborhood evening",
                    "content_kind": "area_experience",
                    "description": "An evening moving between the area's streets and venues.",
                    "area_name": "Soho",
                    "recommended_time": "evening",
                    "geometry_type": "area",
                }]
            },
        }
        rows = match_suggestions(payload, [record("fake", "Soho Evening", taxonomy="bar", category="bar")])
        self.assertEqual(rows[0]["match_status"], "editorial_only")
        self.assertEqual(rows[0]["match_strategy"], "editorial_area_osm_geonames")
        self.assertEqual(rows[0]["overture_id"], "")
        self.assertEqual(rows[0]["candidate_overture_id"], "")
        self.assertEqual(rows[0]["experience_description"], "An evening moving between the area's streets and venues.")
        self.assertEqual(rows[0]["geometry_status"], "editorial_anchor")
        self.assertEqual(rows[0]["latitude"], 51.5137)
        self.assertEqual(rows[0]["editorial_anchor_precision"], "neighbourhood")

    def test_young_traveller_selection_metadata_survives_matching(self):
        payload = {
            "city": {"slug": "milan-it", "name": "Milano"},
            "categories": {
                "food": [{
                    "name": "Trippa",
                    "aliases": ["Trattoria Trippa"],
                    "subtype": "restaurant",
                    "content_kind": "place",
                    "young_traveller_score": 92,
                    "audience_scores": {"local_distinctiveness": 95, "value": 78},
                    "selection_reasons": ["distinctive local cooking", "worth crossing town for"],
                    "trip_styles": ["food", "city_break"],
                    "suitable_for": ["couples", "small_groups"],
                    "budget_level": "moderate",
                    "typical_duration_minutes": 120,
                    "seasonality": ["year_round"],
                }],
            },
        }
        rows = match_suggestions(
            payload,
            [record("trippa", "Trattoria Trippa", taxonomy="restaurant", category="restaurant")],
        )

        self.assertEqual(rows[0]["match_status"], "auto_match")
        self.assertEqual(rows[0]["target_audience"], "general")
        self.assertEqual(rows[0]["young_traveller_score"], 92)
        self.assertEqual(rows[0]["trip_styles"], "food | city_break")
        self.assertEqual(rows[0]["budget_level"], "moderate")
        self.assertIn('"local_distinctiveness":95', rows[0]["audience_scores"])

    def test_rejects_out_of_range_young_traveller_score(self):
        payload = {
            "city": {"name": "Milano"},
            "categories": {"culture": [{"name": "Duomo", "young_traveller_score": 101}]},
        }
        with self.assertRaisesRegex(ValueError, "between 0 and 100"):
            match_suggestions(payload, [])

    def test_legacy_route_subtype_is_editorial_only(self):
        payload = suggestions("Navigli canal walk", category="nature")
        payload["categories"]["nature"][0][2] = "walking route"
        rows = match_suggestions(payload, [record("fake", "Navigli canal walk", taxonomy="trail", category="trail")])
        self.assertEqual(rows[0]["content_kind"], "route_experience")
        self.assertEqual(rows[0]["match_status"], "editorial_only")

    def test_viewpoint_remains_a_matchable_place(self):
        self.assertEqual(infer_content_kind("Torre Branca", "viewpoint"), "place")
        rows = match_suggestions(
            {"city": {"name": "Milano"}, "categories": {"culture": [["Torre Branca", [], "viewpoint"]]}},
            [record("tower", "Torre Branca", taxonomy="tourist_attraction")],
        )
        self.assertEqual(rows[0]["match_status"], "auto_match")

    def test_summary_counts_editorial_experiences_separately(self):
        payload = {
            "city": {"name": "London"},
            "categories": {
                "nightlife": [{
                    "name": "Dalston evening",
                    "aliases": [],
                    "subtype": "neighborhood evening",
                    "content_kind": "area_experience",
                }]
            },
        }
        rows = match_suggestions(payload, [])
        summary = summarize(rows, 0, "test")
        self.assertEqual(summary["editorial_only"], 1)
        self.assertEqual(summary["place_matchable_suggestions"], 0)
        self.assertEqual(summary["retained_catalogue_rate"], 1.0)


if __name__ == "__main__":
    unittest.main()
