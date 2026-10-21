import unittest
import tempfile
from pathlib import Path

import build_catalog_batches as batches
from build_catalog_batches import choose


MARKET = {"target": 2}


def record(osm_id, name, lat, lon=2.17, category="nature", subcategory="viewpoint", element_type="node"):
    return {
        "source_id": f"{element_type}/{osm_id}", "element_type": element_type,
        "feature_type": subcategory, "name": name, "lat": lat, "lon": lon,
        "latitude": lat, "longitude": lon, "category": category,
        "subcategory": subcategory,
    }


class CandidateGroupingTests(unittest.TestCase):
    def test_same_osm_identity_in_multiple_queries_is_one_candidate(self):
        first = record("55", "Mirador A", 41.38)
        duplicate = dict(first)
        selected, unique_count = choose([first, duplicate], MARKET, "barcelona-es")
        self.assertEqual(unique_count, 1)
        self.assertEqual(len(selected), 1)
        self.assertEqual(selected[0]["osm_representation_ids"], ["node/55"])

    def test_close_distinct_named_attractions_are_not_merged(self):
        first = record("1", "Mirador del Migdia", 41.38)
        second = record("2", "Mirador de l'Alcalde", 41.38001)
        selected, unique_count = choose([first, second], MARKET, "barcelona-es")
        self.assertEqual(unique_count, 2)
        self.assertEqual(len(selected), 2)

    def test_same_named_same_type_geometry_aliases_group_only_when_close(self):
        first = record("1", "Mirador de la Font", 41.38)
        nearby = record("2", "Mirador de la Font", 41.38005, element_type="way")
        far = record("3", "Mirador de la Font", 41.382, element_type="relation")
        selected, unique_count = choose([first, nearby, far], MARKET, "barcelona-es")
        self.assertEqual(unique_count, 2)
        self.assertEqual(len(selected), 2)

    def test_sql_batches_are_small_guarded_idempotent_and_unpublished(self):
        original_out = batches.OUT
        with tempfile.TemporaryDirectory() as folder:
            batches.OUT = Path(folder)
            rows = [record(str(i), f"Place {i}", 41.38 + i * 0.001) for i in range(21)]
            for row in rows:
                row["osm_representation_ids"] = [row["source_id"]]
            batches.make_sql("barcelona-es", rows)
            parts = sorted(Path(folder).glob("*.sql"))
            self.assertEqual(len(parts), 2)
            first = parts[0].read_text(encoding="utf-8")
            self.assertIn("RAISE EXCEPTION 'Missing catalog city", first)
            self.assertIn("'coverage'", first)
            self.assertIn("ON CONFLICT (source,source_id) DO NOTHING", first)
            self.assertIn("osm_representation_ids", first)
            self.assertNotIn("source_confidence", first)
        batches.OUT = original_out


if __name__ == "__main__":
    unittest.main()
