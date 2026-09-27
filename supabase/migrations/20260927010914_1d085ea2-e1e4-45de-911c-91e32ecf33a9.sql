DROP POLICY IF EXISTS "Public can view active catalog items"
  ON public.catalog_items;

CREATE POLICY "Public can view reviewed catalog items"
  ON public.catalog_items FOR SELECT
  TO anon, authenticated
  USING (
    is_active
    AND quality_tier IN ('popular', 'editorial', 'community')
  );

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
      AND item.quality_tier IN ('popular', 'editorial', 'community')
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

REVOKE ALL ON public.google_candidate_match_review FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_google_catalog_match(uuid) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_google_catalog_match(uuid) TO service_role;