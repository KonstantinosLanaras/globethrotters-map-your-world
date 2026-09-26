-- One-time editorial seed for the 50 active European catalogue cities.
-- These values are explicitly model-authored estimates, not community scores
-- or claims derived from live/public sources. Stronger sources added later
-- automatically take precedence through public.city_metric_current.

WITH editorial_seed(
  city_slug, budget_band, affordability, food, culture, nature, nightlife, note
) AS (
  VALUES
    ('london-gb', 'high', 34, 88, 98, 68, 92, 'Exceptional breadth; nature reflects urban green space rather than wilderness.'),
    ('paris-fr', 'high', 36, 98, 98, 70, 86, 'Exceptional food and culture with high visitor costs.'),
    ('istanbul-tr', 'low', 78, 94, 96, 68, 80, 'Strong value and cultural depth; prices vary sharply by district.'),
    ('rome-it', 'medium', 58, 96, 99, 68, 76, 'World-leading heritage and food; nightlife is broad but less club-led.'),
    ('barcelona-es', 'medium', 55, 94, 92, 84, 92, 'Beach and hills strengthen nature access; visitor costs are rising.'),
    ('madrid-es', 'medium', 62, 92, 90, 66, 94, 'Excellent food, museums and late-night culture; immediate nature is more limited.'),
    ('amsterdam-nl', 'high', 38, 84, 92, 74, 88, 'Very strong museums and nightlife with expensive accommodation.'),
    ('milan-it', 'high', 42, 90, 88, 62, 82, 'Strong design, food and aperitivo culture; nearby nature usually requires travel.'),
    ('prague-cz', 'medium', 68, 82, 92, 68, 86, 'Strong heritage and nightlife with moderate visitor prices.'),
    ('vienna-at', 'medium', 56, 86, 96, 76, 72, 'Exceptional institutional culture and green space; nightlife is calmer.'),
    ('lisbon-pt', 'medium', 63, 92, 88, 82, 86, 'Coast and viewpoints lift nature access; affordability has declined.'),
    ('athens-gr', 'medium', 68, 90, 98, 78, 84, 'Exceptional ancient culture with good coastal and hill access.'),
    ('berlin-de', 'medium', 58, 84, 92, 74, 98, 'Exceptional nightlife and strong culture; costs are no longer low.'),
    ('dublin-ie', 'high', 30, 78, 82, 72, 88, 'Strong pub and live-music culture but very high accommodation costs.'),
    ('venice-it', 'high', 38, 88, 99, 78, 54, 'Exceptional heritage and lagoon setting; nightlife is comparatively limited.'),
    ('florence-it', 'medium', 52, 96, 99, 76, 66, 'Exceptional art and Tuscan food; evening variety is more restrained.'),
    ('munich-de', 'high', 44, 86, 88, 88, 80, 'Strong culture with exceptional access to lakes and Alps at a high price.'),
    ('copenhagen-dk', 'high', 25, 94, 88, 76, 78, 'Outstanding dining and design with some of Europe''s highest visitor costs.'),
    ('budapest-hu', 'medium', 72, 86, 90, 70, 92, 'Strong value, architecture and nightlife; prices vary in tourist areas.'),
    ('brussels-be', 'medium', 54, 90, 86, 66, 80, 'Excellent food and arts depth; nature access is mainly urban and regional.'),
    ('edinburgh-gb', 'high', 42, 82, 94, 90, 80, 'Exceptional heritage and immediate hill access; festival periods are costly.'),
    ('porto-pt', 'medium', 68, 92, 86, 82, 78, 'Strong food and river-coast setting with increasingly moderate prices.'),
    ('stockholm-se', 'high', 32, 82, 88, 94, 74, 'Archipelago access is exceptional; food and lodging are expensive.'),
    ('oslo-no', 'high', 22, 78, 84, 98, 68, 'Exceptional fjord and forest access with very high visitor costs.'),
    ('reykjavik-is', 'high', 18, 72, 80, 99, 62, 'A gateway to exceptional landscapes but among Europe''s costliest destinations.'),
    ('zurich-ch', 'high', 16, 82, 84, 96, 66, 'Exceptional lake and mountain access with extremely high prices.'),
    ('geneva-ch', 'high', 18, 84, 86, 94, 64, 'Excellent lake and Alpine access; visitor costs are extremely high.'),
    ('nice-fr', 'high', 40, 88, 84, 92, 78, 'Strong Riviera food and coast access; peak-season prices are high.'),
    ('krakow-pl', 'low', 76, 86, 94, 70, 84, 'Rich heritage and good value with a lively compact centre.'),
    ('warsaw-pl', 'medium', 70, 84, 86, 68, 82, 'Broad modern food and culture scene with relatively good value.'),
    ('dubrovnik-hr', 'high', 40, 84, 94, 94, 64, 'Exceptional coastal heritage; seasonality raises prices and narrows nightlife.'),
    ('split-hr', 'medium', 60, 86, 88, 96, 80, 'Excellent island and mountain access with a seasonal evening scene.'),
    ('salzburg-at', 'high', 42, 82, 96, 96, 54, 'Exceptional music heritage and Alpine access; nightlife is limited.'),
    ('seville-es', 'medium', 70, 94, 96, 66, 88, 'Exceptional Andalusian food and culture with strong evening life.'),
    ('valencia-es', 'medium', 70, 94, 86, 88, 82, 'Excellent food, beaches and parks with comparatively good value.'),
    ('malaga-es', 'medium', 66, 88, 82, 90, 84, 'Strong coast access and nightlife with a growing museum scene.'),
    ('naples-it', 'low', 75, 99, 94, 92, 82, 'Exceptional food, heritage and bay-volcano access; quality varies by area.'),
    ('bologna-it', 'medium', 64, 99, 88, 70, 78, 'One of Europe''s strongest food cities with a lively student evening scene.'),
    ('turin-it', 'medium', 66, 90, 90, 84, 74, 'Strong food and museums with good Alpine access and calmer nightlife.'),
    ('lyon-fr', 'medium', 54, 98, 88, 72, 74, 'Exceptional culinary depth with strong culture and moderate nightlife.'),
    ('bordeaux-fr', 'medium', 55, 94, 88, 80, 74, 'Wine and food are exceptional; coast and nature require short trips.'),
    ('marseille-fr', 'medium', 68, 90, 86, 98, 84, 'Exceptional Calanques and coast access with a distinctive food and nightlife scene.'),
    ('hamburg-de', 'medium', 52, 86, 88, 78, 90, 'Strong waterfront culture and nightlife with moderate-to-high costs.'),
    ('frankfurt-de', 'high', 44, 82, 78, 70, 74, 'International food scene and good transport, but visitor costs are high.'),
    ('cologne-de', 'medium', 58, 84, 86, 68, 88, 'Strong arts, beer culture and nightlife; nature is mostly urban-regional.'),
    ('rotterdam-nl', 'medium', 52, 86, 86, 72, 82, 'Distinctive architecture and diverse food with solid evening options.'),
    ('the-hague-nl', 'high', 44, 84, 88, 86, 68, 'Strong museums and beach access; nightlife is quieter than nearby cities.'),
    ('antwerp-be', 'medium', 58, 90, 90, 68, 82, 'Strong fashion, art, food and nightlife in a compact city.'),
    ('bruges-be', 'high', 46, 86, 96, 72, 52, 'Exceptional preserved heritage; evening options are limited and prices tourist-led.'),
    ('tallinn-ee', 'medium', 70, 84, 92, 80, 80, 'Strong medieval and digital culture with good coastal access and value.')
), expanded AS (
  SELECT
    city.id AS city_id,
    metric.metric,
    metric.value,
    metric.band,
    seed.note
  FROM editorial_seed AS seed
  JOIN public.catalog_cities AS city ON city.slug = seed.city_slug
  CROSS JOIN LATERAL (
    VALUES
      ('budget'::text, seed.affordability::numeric, seed.budget_band::text),
      ('food'::text, seed.food::numeric, NULL::text),
      ('culture'::text, seed.culture::numeric, NULL::text),
      ('nature'::text, seed.nature::numeric, NULL::text),
      ('nightlife'::text, seed.nightlife::numeric, NULL::text)
  ) AS metric(metric, value, band)
)
INSERT INTO public.city_metrics (
  city_id, metric, value, band, source_kind, source_name,
  methodology_version, model_name, confidence, evidence,
  effective_at, valid_until, is_active, updated_at
)
SELECT
  city_id,
  metric,
  value,
  band,
  'llm_editorial',
  'Globethrotters one-time AI editorial estimate',
  'llm-editorial-static-v1',
  'OpenAI GPT-5',
  0.65,
  jsonb_build_object(
    'note', note,
    'basis', 'One-time model editorial judgment; no live source retrieval',
    'scale', '0-100 Europe-wide comparative scale'
  ),
  DATE '2026-09-26',
  DATE '2027-03-25',
  true,
  now()
FROM expanded
ON CONFLICT (
  city_id, metric, source_kind, source_name, month_key, methodology_version
) DO UPDATE SET
  value = EXCLUDED.value,
  band = EXCLUDED.band,
  model_name = EXCLUDED.model_name,
  confidence = EXCLUDED.confidence,
  evidence = EXCLUDED.evidence,
  effective_at = EXCLUDED.effective_at,
  valid_until = EXCLUDED.valid_until,
  is_active = true,
  updated_at = now();

-- Verification: expected result is 50 cities, 250 metrics, and no missing rows.
SELECT
  count(DISTINCT city_id) AS cities_scored,
  count(*) AS metrics_stored,
  count(*) FILTER (WHERE metric = 'budget') AS budget_rows,
  count(*) FILTER (WHERE metric = 'food') AS food_rows,
  count(*) FILTER (WHERE metric = 'culture') AS culture_rows,
  count(*) FILTER (WHERE metric = 'nature') AS nature_rows,
  count(*) FILTER (WHERE metric = 'nightlife') AS nightlife_rows
FROM public.city_metrics
WHERE source_kind = 'llm_editorial'
  AND source_name = 'Globethrotters one-time AI editorial estimate'
  AND methodology_version = 'llm-editorial-static-v1';
