import json
import tempfile
import unittest
from pathlib import Path

import build_europe_rollout_batches as rollout


class EuropeRolloutBatchTests(unittest.TestCase):
    def test_roster_contains_the_50_seeded_cities_and_madeira_once(self):
        slugs = [row[0] for row in rollout.CITY_ROWS]
        self.assertEqual(len(slugs), 51)
        self.assertEqual(len(set(slugs)), 51)
        self.assertEqual(slugs[:3], ["london-gb", "paris-fr", "istanbul-tr"])
        self.assertIn("tallinn-ee", slugs)
        self.assertEqual(slugs.count("madeira-pt"), 1)

    def test_agreed_city_targets_are_present(self):
        targets = {slug: target for slug, _, _, _, target in rollout.CITY_ROWS}
        self.assertEqual(targets["barcelona-es"], 115)
        self.assertEqual(targets["milan-it"], 105)
        self.assertEqual(targets["madeira-pt"], 80)

    def test_rows_are_deduplicated_and_sql_remains_review_only(self):
        rows = [
            {"source_id":"node/1","element_type":"node","feature_type":"viewpoint",
             "name":"Mirador A","lat":41.38,"lon":2.17,"latitude":41.38,
             "longitude":2.17,"category":"nature","subcategory":"viewpoint"},
            {"source_id":"way/2","element_type":"way","feature_type":"viewpoint",
             "name":"Mirador A","lat":41.38001,"lon":2.17,"latitude":41.38001,
             "longitude":2.17,"category":"nature","subcategory":"viewpoint"},
            {"source_id":"node/3","element_type":"node","feature_type":"viewpoint",
             "name":"Mirador B","lat":41.38002,"lon":2.17,"latitude":41.38002,
             "longitude":2.17,"category":"nature","subcategory":"viewpoint"},
        ]
        selected = rollout.select_candidates(rows, 1)
        self.assertEqual(len(selected), 2)
        self.assertEqual(selected[0]["osm_representation_ids"], ["node/1", "way/2"])
        original = rollout.OUT
        with tempfile.TemporaryDirectory() as folder:
            rollout.OUT = Path(folder)
            files = rollout.write_batches("barcelona-es", selected)
            sql = (Path(folder) / files[0]).read_text(encoding="utf-8")
            self.assertIn("'coverage'", sql)
            self.assertIn("'review_required',true", sql)
            self.assertIn("ON CONFLICT (source,source_id) DO NOTHING", sql)
            self.assertIn("openstreetmap.org/node/1", sql)
        rollout.OUT = original


if __name__ == "__main__":
    unittest.main()
