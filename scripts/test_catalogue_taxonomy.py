import json
import unittest
from pathlib import Path

from catalogue_taxonomy import VERSION, classify, validate_plan_taxonomy
from export_llm_catalogue import effective_row
from match_llm_to_overture import parse_suggestion
from plan_catalogue_subcategories import plan_rows


class TaxonomyTests(unittest.TestCase):
    def test_sunset_is_an_interest_classified_editorial_activity(self):
        item = {"name": "Sunset at Vraxakia", "subtype": "sunset experience",
                "subcategory": "sunsets_views", "content_kind": "timed_experience"}
        plan = {"taxonomy_version": VERSION, "categories": {"nature": [item]}}
        self.assertTrue(validate_plan_taxonomy(plan))
        self.assertEqual(parse_suggestion(item)["subcategory"], "sunsets_views")

    def test_wrong_category_and_missing_subcategory_are_rejected(self):
        for item in [{"name": "A", "subcategory": "restaurants"}, {"name": "B"}]:
            with self.assertRaises(ValueError):
                validate_plan_taxonomy({"taxonomy_version": VERSION, "categories": {"nature": [item]}})

    def test_temporary_events_cannot_be_published_under_a_valid_group(self):
        row = {"category": "nightlife", "llm_subcategory": "nightlife_areas",
               "llm_subtype": "seasonal event experience", "match_status": "editorial_only"}
        self.assertEqual(effective_row(row)["match_status"], "review")

    def test_broad_labels_are_not_silently_forced_to_restaurants(self):
        self.assertIsNone(classify({"category": "food", "llm_subtype": "food venue"})[0])

    def test_detail_is_preserved_for_named_hike_checks(self):
        row = {"category": "nature", "llm_subtype": "classified hiking route",
               "llm_subcategory": "hikes_trails", "content_kind": "route_experience",
               "match_status": "editorial_only"}
        held = effective_row(row)
        self.assertEqual(held["match_status"], "review")
        self.assertIn("route_source_identity_required", held["risk_flags"])
        self.assertEqual(held["llm_subtype"], "classified hiking route")

    def test_group_does_not_imply_swimming(self):
        self.assertEqual(classify({"canonical_category": "nature", "subcategory": "lake"})[0], "beaches_lakes")

    def test_existing_record_plan_changes_neither_identity_nor_raw_subtype(self):
        row = {"id": "id-1", "city_id": "city-1", "name": "Urban walk", "source": "curated",
               "source_id": "stable-id", "canonical_category": "hiking", "subcategory": "urban_hike",
               "updated_at": "2026-11-11T00:00:00Z"}
        plan = plan_rows([row], {})[0]
        self.assertEqual(plan["new_category"], "nature")
        self.assertEqual(plan["new_key"], "hikes_trails")
        self.assertEqual(plan["source_id"], "stable-id")
        self.assertEqual(row["subcategory"], "urban_hike")

    def test_typescript_and_python_share_identical_taxonomy(self):
        root = Path(__file__).resolve().parent.parent
        data = json.loads((root / "scripts/data/catalogue_taxonomy.json").read_text())
        generated = (root / "supabase/functions/_shared/catalogTaxonomy.ts").read_text()
        literal = generated.split("export const CATALOG_TAXONOMY = ", 1)[1].split(" as const;", 1)[0]
        self.assertEqual(json.loads(literal), data)


if __name__ == "__main__":
    unittest.main()
