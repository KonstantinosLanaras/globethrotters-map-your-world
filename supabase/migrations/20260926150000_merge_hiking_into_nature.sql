-- Hiking is an activity within Nature, not a separate top-level catalogue category.
-- Preserve trail/hike detail in subcategory and tags while normalizing filters.

BEGIN;

ALTER TABLE public.catalog_items
  DROP CONSTRAINT IF EXISTS catalog_items_canonical_category_check;
ALTER TABLE public.google_place_candidate_ids
  DROP CONSTRAINT IF EXISTS google_place_candidate_ids_search_category_check;
ALTER TABLE public.provider_type_mappings
  DROP CONSTRAINT IF EXISTS provider_type_mappings_canonical_category_check;
ALTER TABLE public.recommendation_intents
  DROP CONSTRAINT IF EXISTS recommendation_intents_categories_check;

UPDATE public.catalog_items
SET canonical_category = 'nature', updated_at = now()
WHERE canonical_category = 'hiking';

-- A Google place may have been staged once for Nature and once for Hiking.
-- Remove only the duplicate Hiking row before normalizing the remaining rows.
DELETE FROM public.google_place_candidate_ids AS hiking
WHERE hiking.search_category = 'hiking'
  AND EXISTS (
    SELECT 1
    FROM public.google_place_candidate_ids AS nature
    WHERE nature.import_run_id = hiking.import_run_id
      AND nature.city_id = hiking.city_id
      AND nature.google_place_id = hiking.google_place_id
      AND nature.search_category = 'nature'
  );

UPDATE public.google_place_candidate_ids
SET search_category = 'nature'
WHERE search_category = 'hiking';

UPDATE public.provider_type_mappings
SET canonical_category = 'nature'
WHERE canonical_category = 'hiking';

UPDATE public.recommendation_intents AS intent
SET requested_categories = ARRAY(
    SELECT category
    FROM (
      SELECT
        CASE WHEN value = 'hiking' THEN 'nature' ELSE value END AS category,
        min(position) AS first_position
      FROM unnest(intent.requested_categories) WITH ORDINALITY AS entry(value, position)
      GROUP BY CASE WHEN value = 'hiking' THEN 'nature' ELSE value END
      ORDER BY first_position
    ) AS ordered_categories
  )
WHERE 'hiking' = ANY(intent.requested_categories);

-- Community-created records use the same top-level vocabulary. Their existing
-- tags continue to carry words such as hiking, trail and trek.
UPDATE public.experiences
SET category = 'nature'
WHERE lower(category) IN ('hiking', 'hike');

ALTER TABLE public.catalog_items
  ADD CONSTRAINT catalog_items_canonical_category_check
  CHECK (canonical_category IN ('food', 'culture', 'nature', 'nightlife'));
ALTER TABLE public.google_place_candidate_ids
  ADD CONSTRAINT google_place_candidate_ids_search_category_check
  CHECK (search_category IN ('food', 'culture', 'nature', 'nightlife'));
ALTER TABLE public.provider_type_mappings
  ADD CONSTRAINT provider_type_mappings_canonical_category_check
  CHECK (canonical_category IN ('food', 'culture', 'nature', 'nightlife'));
ALTER TABLE public.recommendation_intents
  ADD CONSTRAINT recommendation_intents_categories_check
  CHECK (requested_categories <@ ARRAY['food', 'culture', 'nature', 'nightlife']::text[]);

NOTIFY pgrst, 'reload schema';

COMMIT;
