-- Recommendation foundation for the future free-form Explorer prompt.
-- This does not change the current MVP questionnaire. It connects a user's
-- saved place to its canonical catalogue item and exposes only aggregate
-- community scores for recommendation ranking.

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS catalog_item_id uuid
  REFERENCES public.catalog_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS places_catalog_item_idx
  ON public.places (catalog_item_id)
  WHERE catalog_item_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS places_user_catalog_item_unique_idx
  ON public.places (user_id, catalog_item_id)
  WHERE catalog_item_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.recommendation_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_query text NOT NULL CHECK (char_length(btrim(raw_query)) BETWEEN 2 AND 500),
  resolved_city_id uuid REFERENCES public.catalog_cities(id) ON DELETE SET NULL,
  requested_categories text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'resolved', 'no_match', 'failed')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_intents_categories_check CHECK (
    requested_categories <@ ARRAY['food', 'culture', 'nature', 'hiking', 'nightlife']::text[]
  )
);

CREATE INDEX IF NOT EXISTS recommendation_intents_user_created_idx
  ON public.recommendation_intents (user_id, created_at DESC);

ALTER TABLE public.recommendation_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own recommendation intents"
  ON public.recommendation_intents;
CREATE POLICY "Users manage own recommendation intents"
  ON public.recommendation_intents
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_catalog_recommendations(
  p_city_slug text,
  p_categories text[] DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  catalog_item_id uuid,
  city_slug text,
  name text,
  latitude double precision,
  longitude double precision,
  category text,
  subcategory text,
  description text,
  source text,
  quality_tier text,
  community_rating numeric,
  community_review_count bigint,
  recommendation_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH community AS (
    SELECT
      saved.catalog_item_id,
      avg(rating.overall_rating)::numeric(3, 2) AS average_rating,
      count(*)::bigint AS review_count
    FROM public.places AS saved
    JOIN public.place_ratings AS rating ON rating.place_id = saved.id
    WHERE saved.catalog_item_id IS NOT NULL
      AND saved.type = 'visited'
    GROUP BY saved.catalog_item_id
  ), ranked AS (
    SELECT
      item.id AS catalog_item_id,
      city.slug AS city_slug,
      item.name,
      item.latitude,
      item.longitude,
      item.canonical_category AS category,
      item.subcategory,
      item.description,
      item.source,
      item.quality_tier,
      coalesce(community.average_rating, 0)::numeric(3, 2) AS community_rating,
      coalesce(community.review_count, 0)::bigint AS community_review_count,
      (
        -- Bayesian smoothing prevents a single review from outranking a place
        -- with a durable community record. Editorial rank handles cold starts.
        (
          (coalesce(community.average_rating, 3.5) * coalesce(community.review_count, 0))
          + (3.5 * 5)
        ) / (coalesce(community.review_count, 0) + 5) * 20
        + CASE item.quality_tier
            WHEN 'popular' THEN 10
            WHEN 'editorial' THEN 8
            WHEN 'community' THEN 6
            ELSE 0
          END
        - (coalesce(item.selection_rank, 50) * 0.05)
      )::numeric(8, 3) AS recommendation_score
    FROM public.catalog_items AS item
    JOIN public.catalog_cities AS city ON city.id = item.city_id
    LEFT JOIN community ON community.catalog_item_id = item.id
    WHERE city.slug = lower(btrim(p_city_slug))
      AND city.is_active
      AND item.is_active
      AND (
        p_categories IS NULL
        OR cardinality(p_categories) = 0
        OR item.canonical_category = ANY(p_categories)
      )
  )
  SELECT *
  FROM ranked
  ORDER BY recommendation_score DESC, community_review_count DESC, name
  LIMIT least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

REVOKE ALL ON FUNCTION public.get_catalog_recommendations(text, text[], integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_catalog_recommendations(text, text[], integer)
  TO anon, authenticated;

