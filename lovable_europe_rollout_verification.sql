-- Read-only status for every planned rollout city plus Madeira.
-- Publishable excludes hidden `coverage` discovery candidates.
WITH requested(slug, target_guide) AS (
  VALUES
  ('london-gb', 40),
  ('paris-fr', 40),
  ('istanbul-tr', 40),
  ('rome-it', 40),
  ('barcelona-es', 115),
  ('madrid-es', 40),
  ('amsterdam-nl', 40),
  ('milan-it', 105),
  ('prague-cz', 40),
  ('vienna-at', 40),
  ('lisbon-pt', 40),
  ('athens-gr', 40),
  ('berlin-de', 40),
  ('dublin-ie', 40),
  ('venice-it', 40),
  ('florence-it', 40),
  ('munich-de', 40),
  ('copenhagen-dk', 40),
  ('budapest-hu', 40),
  ('brussels-be', 40),
  ('edinburgh-gb', 40),
  ('porto-pt', 40),
  ('stockholm-se', 40),
  ('oslo-no', 40),
  ('reykjavik-is', 40),
  ('zurich-ch', 40),
  ('geneva-ch', 40),
  ('nice-fr', 40),
  ('krakow-pl', 40),
  ('warsaw-pl', 40),
  ('dubrovnik-hr', 40),
  ('split-hr', 40),
  ('salzburg-at', 40),
  ('seville-es', 40),
  ('valencia-es', 40),
  ('malaga-es', 40),
  ('naples-it', 40),
  ('bologna-it', 40),
  ('turin-it', 40),
  ('lyon-fr', 40),
  ('bordeaux-fr', 40),
  ('marseille-fr', 40),
  ('hamburg-de', 40),
  ('frankfurt-de', 40),
  ('cologne-de', 40),
  ('rotterdam-nl', 40),
  ('the-hague-nl', 40),
  ('antwerp-be', 40),
  ('bruges-be', 40),
  ('tallinn-ee', 40),
  ('madeira-pt', 80)
), city_counts AS (
  SELECT city.slug,
    count(item.id) FILTER (WHERE item.is_active) AS active_total,
    count(item.id) FILTER (WHERE item.is_active AND item.quality_tier IN ('popular','editorial','community')) AS publishable,
    count(item.id) FILTER (WHERE item.is_active AND item.quality_tier='coverage') AS hidden_coverage,
    count(item.id) FILTER (WHERE item.is_active AND item.source='osm') AS active_osm
  FROM public.catalog_cities city
  LEFT JOIN public.catalog_items item ON item.city_id=city.id
  GROUP BY city.slug
)
SELECT requested.slug, requested.target_guide,
       city_counts.slug IS NOT NULL AS city_seeded,
       coalesce(city_counts.active_total,0) AS active_total,
       coalesce(city_counts.publishable,0) AS publishable_experiences,
       coalesce(city_counts.hidden_coverage,0) AS hidden_coverage_candidates,
       coalesce(city_counts.active_osm,0) AS active_osm_records
FROM requested LEFT JOIN city_counts USING (slug)
ORDER BY requested.slug;

-- Category breakdown for all active records in the rollout destinations.
WITH requested(slug,target_guide) AS (VALUES
  ('london-gb', 40), ('paris-fr', 40), ('istanbul-tr', 40), ('rome-it', 40), ('barcelona-es', 115), ('madrid-es', 40), ('amsterdam-nl', 40), ('milan-it', 105), ('prague-cz', 40), ('vienna-at', 40),
  ('lisbon-pt', 40), ('athens-gr', 40), ('berlin-de', 40), ('dublin-ie', 40), ('venice-it', 40), ('florence-it', 40), ('munich-de', 40), ('copenhagen-dk', 40), ('budapest-hu', 40), ('brussels-be', 40),
  ('edinburgh-gb', 40), ('porto-pt', 40), ('stockholm-se', 40), ('oslo-no', 40), ('reykjavik-is', 40), ('zurich-ch', 40), ('geneva-ch', 40), ('nice-fr', 40), ('krakow-pl', 40), ('warsaw-pl', 40),
  ('dubrovnik-hr', 40), ('split-hr', 40), ('salzburg-at', 40), ('seville-es', 40), ('valencia-es', 40), ('malaga-es', 40), ('naples-it', 40), ('bologna-it', 40), ('turin-it', 40), ('lyon-fr', 40),
  ('bordeaux-fr', 40), ('marseille-fr', 40), ('hamburg-de', 40), ('frankfurt-de', 40), ('cologne-de', 40), ('rotterdam-nl', 40), ('the-hague-nl', 40), ('antwerp-be', 40), ('bruges-be', 40), ('tallinn-ee', 40), ('madeira-pt', 80)
)
SELECT city.slug,item.canonical_category,
       count(*) FILTER (WHERE item.is_active) AS active_total,
       count(*) FILTER (WHERE item.is_active AND item.quality_tier IN ('popular','editorial','community')) AS publishable,
       count(*) FILTER (WHERE item.is_active AND item.quality_tier='coverage') AS hidden_coverage
FROM public.catalog_cities city
JOIN public.catalog_items item ON item.city_id=city.id
WHERE city.slug IN (SELECT slug FROM requested)
GROUP BY city.slug,item.canonical_category
ORDER BY city.slug,item.canonical_category;

-- Source identity duplicates should return no rows.
WITH requested(slug,target_guide) AS (VALUES
  ('london-gb', 40), ('paris-fr', 40), ('istanbul-tr', 40), ('rome-it', 40), ('barcelona-es', 115), ('madrid-es', 40), ('amsterdam-nl', 40), ('milan-it', 105), ('prague-cz', 40), ('vienna-at', 40),
  ('lisbon-pt', 40), ('athens-gr', 40), ('berlin-de', 40), ('dublin-ie', 40), ('venice-it', 40), ('florence-it', 40), ('munich-de', 40), ('copenhagen-dk', 40), ('budapest-hu', 40), ('brussels-be', 40),
  ('edinburgh-gb', 40), ('porto-pt', 40), ('stockholm-se', 40), ('oslo-no', 40), ('reykjavik-is', 40), ('zurich-ch', 40), ('geneva-ch', 40), ('nice-fr', 40), ('krakow-pl', 40), ('warsaw-pl', 40),
  ('dubrovnik-hr', 40), ('split-hr', 40), ('salzburg-at', 40), ('seville-es', 40), ('valencia-es', 40), ('malaga-es', 40), ('naples-it', 40), ('bologna-it', 40), ('turin-it', 40), ('lyon-fr', 40),
  ('bordeaux-fr', 40), ('marseille-fr', 40), ('hamburg-de', 40), ('frankfurt-de', 40), ('cologne-de', 40), ('rotterdam-nl', 40), ('the-hague-nl', 40), ('antwerp-be', 40), ('bruges-be', 40), ('tallinn-ee', 40), ('madeira-pt', 80)
)
SELECT city.slug,item.source,item.source_id,count(*) AS duplicate_rows
FROM public.catalog_cities city
JOIN public.catalog_items item ON item.city_id=city.id
WHERE city.slug IN (SELECT slug FROM requested) AND item.is_active
GROUP BY city.slug,item.source,item.source_id
HAVING count(*)>1
ORDER BY city.slug,item.source,item.source_id;
