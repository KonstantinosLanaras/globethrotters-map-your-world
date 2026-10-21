-- Read-only catalogue diagnostics. Run after catalogue setup/imports.
-- Distinguishes active rows from rows eligible for the public recommendation
-- policy; this is essential because raw 'coverage' rows are intentionally hidden.

WITH requested(slug, target) AS (
  VALUES ('barcelona-es', 115), ('madeira-pt', 80), ('milan-it', 105)
)
SELECT requested.slug AS requested_city_slug, requested.target,
       city.id IS NOT NULL AS city_is_seeded
FROM requested
LEFT JOIN public.catalog_cities AS city ON city.slug = requested.slug
ORDER BY requested.slug;

SELECT
  city.slug AS city_slug,
  item.canonical_category,
  count(*) FILTER (WHERE item.is_active) AS active_total,
  count(*) FILTER (
    WHERE item.is_active
      AND item.quality_tier IN ('popular', 'editorial', 'community')
  ) AS publicly_eligible,
  count(*) FILTER (WHERE item.is_active AND item.quality_tier = 'coverage') AS hidden_coverage,
  count(*) FILTER (WHERE item.is_active AND item.quality_tier = 'editorial') AS editorial,
  count(*) FILTER (WHERE item.is_active AND item.quality_tier = 'popular') AS popular,
  count(*) FILTER (WHERE item.is_active AND item.quality_tier = 'community') AS community
FROM public.catalog_cities AS city
LEFT JOIN public.catalog_items AS item ON item.city_id = city.id
WHERE city.slug IN ('barcelona-es', 'madeira-pt', 'milan-it')
GROUP BY city.slug, item.canonical_category
ORDER BY city.slug, item.canonical_category;

-- Duplicate checks across same city: exact name or shared normalized source
-- identity. Proximity-only duplicates need the Python matching report because
-- they must be checked against names, aliases, feature types, and coordinates.
SELECT city.slug, item.source, item.source_id, count(*) AS rows
FROM public.catalog_items AS item
JOIN public.catalog_cities AS city ON city.id = item.city_id
WHERE city.slug IN ('barcelona-es', 'madeira-pt', 'milan-it') AND item.is_active
GROUP BY city.slug, item.source, item.source_id
HAVING count(*) > 1
ORDER BY city.slug, item.source, item.source_id;

-- Target check counts only records eligible for public recommendations.
SELECT city.slug,
  count(*) FILTER (WHERE item.is_active AND item.quality_tier IN ('popular', 'editorial', 'community'))
    AS publishable_experiences,
  CASE city.slug
    WHEN 'barcelona-es' THEN 115
    WHEN 'madeira-pt' THEN 80
    WHEN 'milan-it' THEN 105
  END AS agreed_target
FROM public.catalog_cities AS city
LEFT JOIN public.catalog_items AS item ON item.city_id = city.id
WHERE city.slug IN ('barcelona-es', 'madeira-pt', 'milan-it')
GROUP BY city.slug
ORDER BY city.slug;
