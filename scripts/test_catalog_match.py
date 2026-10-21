import unittest

from catalog_match import group_osm_features, match_candidate


def feature(name, lat=41.387, lon=2.17, source_id=None, element_type="node",
            feature_type="viewpoint", **extra):
    return {"name": name, "latitude": lat, "longitude": lon,
            "source_id": source_id, "element_type": element_type,
            "feature_type": feature_type, **extra}


class CatalogMatchTests(unittest.TestCase):
    def test_exact_overture_identity_wins_even_if_other_place_is_nearby(self):
        wanted = feature("Mirador", source_id="ov-1")
        nearby = feature("Mirador", lat=41.3871, source_id="ov-2")
        result = match_candidate({**wanted, "overture_id": "ov-1"}, [nearby, wanted])
        self.assertEqual(result["method"], "exact_overture_id")
        self.assertEqual(result["record"]["source_id"], "ov-1")

    def test_same_physical_osm_feature_with_multiple_geometries_groups_by_id(self):
        rows = [
            feature("Miradouro da Graça", source_id="42", element_type="way"),
            feature("Miradouro da Graça", source_id="42", element_type="way", geometry="centroid"),
        ]
        self.assertEqual(len(group_osm_features(rows)), 1)
        self.assertEqual(len(group_osm_features(rows)[0]), 2)

    def test_close_but_distinct_named_attractions_are_not_grouped(self):
        rows = [feature("Mirador del Migdia", source_id="1"),
                feature("Mirador de l'Alcalde", lat=41.38701, source_id="2")]
        self.assertEqual(len(group_osm_features(rows)), 2)

    def test_same_name_and_type_near_duplicate_osm_nodes_can_group(self):
        rows = [feature("Jardins de Mossèn Costa i Llobera", source_id="1"),
                feature("Jardins de Mossèn Costa i Llobera", lat=41.38701, source_id="2")]
        self.assertEqual(len(group_osm_features(rows)), 1)

    def test_same_name_far_away_does_not_match(self):
        candidate = feature("Mirador", lat=41.387, source_id="osm-1")
        result = match_candidate(candidate, [feature("Mirador", lat=41.39, source_id="ov-1")])
        self.assertEqual(result["status"], "unmatched")

    def test_near_tied_overture_identities_are_held_for_review(self):
        candidate = feature("Parc de la Ciutadella")
        rows = [feature("Parc de la Ciutadella", source_id="a"),
                feature("Parc de la Ciutadella", lat=41.387001, source_id="b")]
        result = match_candidate(candidate, rows)
        self.assertEqual(result["status"], "ambiguous")
        self.assertIsNone(result["record"])

    def test_category_mismatch_is_not_matched(self):
        candidate = feature("Mirador", feature_type="viewpoint")
        wrong_type = feature("Mirador", feature_type="restaurant", source_id="ov-1")
        self.assertEqual(match_candidate(candidate, [wrong_type])["status"], "unmatched")


if __name__ == "__main__":
    unittest.main()
