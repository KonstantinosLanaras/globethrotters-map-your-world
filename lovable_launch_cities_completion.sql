-- Globethrotters launch-city catalogue completion
-- Run once in Lovable > More > Cloud > SQL editor after
-- lovable_catalog_setup.sql and lovable_catalog_pilot.sql.
-- Safe to re-run: rows are upserted by their stable curated source ID.

WITH launch_item(city_slug, source_id, name, lat, lng, category, subcategory, description, rank) AS (
  VALUES
    ('rome-it', 'launch-rome-testaccio-market', 'Testaccio Market', 41.8777, 12.4752, 'food', 'food_market', 'Try Roman staples and modern street food in a neighbourhood market built over an archaeological site.', 2),
    ('rome-it', 'launch-rome-pantheon-navona', 'Pantheon and Piazza Navona walk', 41.8986, 12.4769, 'culture', 'historical_walk', 'Connect two central landmarks through smaller streets, churches and historic squares.', 2),
    ('rome-it', 'launch-rome-villa-borghese', 'Villa Borghese gardens', 41.9142, 12.4922, 'nature', 'park', 'Take a green break among shaded avenues, small lakes and viewpoints above Piazza del Popolo.', 1),
    ('rome-it', 'launch-rome-orange-garden', 'Orange Garden and Aventine Hill', 41.8857, 12.4800, 'nature', 'garden', 'Combine a quiet walled garden, broad city views and the residential lanes of the Aventine.', 2),
    ('rome-it', 'launch-rome-janiculum-walk', 'Janiculum Hill walk', 41.8916, 12.4615, 'nature', 'urban_hike', 'Climb above Trastevere for fountains, monuments and one of Rome''s widest skyline views.', 2),
    ('rome-it', 'launch-rome-monti-evening', 'Monti evening', 41.8950, 12.4934, 'nightlife', 'nightlife_district', 'Move between wine bars and small streets around Piazza della Madonna dei Monti.', 1),
    ('rome-it', 'launch-rome-pigneto-evening', 'Pigneto nightlife', 41.8890, 12.5284, 'nightlife', 'nightlife_district', 'Explore a more alternative evening area with casual bars, outdoor tables and live events.', 2),

    ('athens-gr', 'launch-athens-varvakios-market', 'Varvakios Central Market', 37.9802, 23.7275, 'food', 'food_market', 'Browse the central market and nearby spice and speciality shops before choosing a simple local lunch.', 1),
    ('athens-gr', 'launch-athens-psyrri-food', 'Psyrri food walk', 37.9788, 23.7257, 'food', 'neighbourhood_food', 'Build an informal route around bakeries, meze, sweets and small restaurants in the historic centre.', 2),
    ('athens-gr', 'launch-athens-national-garden', 'National Garden', 37.9739, 23.7386, 'nature', 'park', 'Use the shaded paths behind Parliament for a quiet pause between central archaeological sites.', 1),
    ('athens-gr', 'launch-athens-niarchos-park', 'Stavros Niarchos Park', 37.9399, 23.6910, 'nature', 'park', 'Walk landscaped slopes toward the canal and combine the park with the cultural centre''s public spaces.', 2),
    ('athens-gr', 'launch-athens-philopappos', 'Philopappos Hill walk', 37.9672, 23.7217, 'nature', 'urban_hike', 'Follow wooded paths to viewpoints facing the Acropolis and continue toward Pnyx Hill.', 2),
    ('athens-gr', 'launch-athens-gazi-evening', 'Gazi evening', 37.9785, 23.7113, 'nightlife', 'nightlife_district', 'Explore bars and music venues around the former gasworks and Kerameikos metro area.', 1),
    ('athens-gr', 'launch-athens-exarchia-evening', 'Exarchia evening', 37.9861, 23.7350, 'nightlife', 'nightlife_district', 'Discover independent bars, cafes and a lively alternative atmosphere around Exarchia Square.', 2),

    ('barcelona-es', 'launch-barcelona-boqueria', 'La Boqueria market', 41.3817, 2.1716, 'food', 'food_market', 'Visit early for produce and market counters, then continue into the smaller streets of the old city.', 1),
    ('barcelona-es', 'launch-barcelona-sant-antoni', 'Sant Antoni Market and neighbourhood', 41.3788, 2.1622, 'food', 'food_market', 'Pair the renovated market with cafes and local streets beyond the busiest visitor routes.', 2),
    ('barcelona-es', 'launch-barcelona-ciutadella', 'Ciutadella Park', 41.3880, 2.1866, 'nature', 'park', 'Cross the city''s central park for gardens, the monumental fountain and an easy picnic stop.', 2),
    ('barcelona-es', 'launch-barcelona-bunkers', 'Bunkers del Carmel walk', 41.4187, 2.1617, 'nature', 'urban_hike', 'Climb through the upper neighbourhoods to a panoramic viewpoint over Barcelona.', 1),
    ('barcelona-es', 'launch-barcelona-aigues', 'Carretera de les Aigues', 41.4193, 2.1285, 'nature', 'hillside_walk', 'Follow a mostly level hillside route along Collserola with continuous views across the city.', 2),
    ('barcelona-es', 'launch-barcelona-born-evening', 'El Born evening', 41.3853, 2.1822, 'nightlife', 'nightlife_district', 'Explore compact medieval streets with wine bars, cocktails and late cultural venues.', 1),
    ('barcelona-es', 'launch-barcelona-poblenou-evening', 'Poblenou evening', 41.4004, 2.2020, 'nightlife', 'nightlife_district', 'Mix neighbourhood terraces with converted industrial venues and the nearby beachfront.', 2),

    ('london-gb', 'launch-london-v-and-a', 'Victoria and Albert Museum', 51.4966, -0.1722, 'culture', 'museum', 'Choose a design theme or collection rather than attempting the full museum in one visit.', 2),
    ('london-gb', 'launch-london-brick-lane', 'Brick Lane food walk', 51.5207, -0.0718, 'food', 'neighbourhood_food', 'Build a flexible tasting route around bakeries, markets and restaurants across Brick Lane and Spitalfields.', 2),
    ('london-gb', 'launch-london-richmond-park', 'Richmond Park', 51.4427, -0.2739, 'nature', 'park', 'Spend a half day on broad paths, open grassland and viewpoints in London''s largest Royal Park.', 2),
    ('london-gb', 'launch-london-thames-greenwich', 'Thames Path to Greenwich', 51.4826, -0.0098, 'nature', 'riverside_walk', 'Follow a riverside section toward maritime Greenwich, adjusting the starting point to your preferred distance.', 1),
    ('london-gb', 'launch-london-parkland-walk', 'Parkland Walk', 51.5763, -0.1272, 'nature', 'urban_hike', 'Walk a wooded former railway between Finsbury Park and Highgate for a quieter side of north London.', 2),
    ('london-gb', 'launch-london-soho-evening', 'Soho evening', 51.5137, -0.1337, 'nightlife', 'nightlife_district', 'Move between historic pubs, cocktail bars and live venues in a compact central district.', 1),
    ('london-gb', 'launch-london-dalston-evening', 'Dalston evening', 51.5456, -0.0753, 'nightlife', 'nightlife_district', 'Explore independent music venues and late bars along Kingsland Road and nearby side streets.', 2)
)
INSERT INTO public.catalog_items (
  city_id, source_id, name, latitude, longitude, canonical_category,
  subcategory, description, source, source_confidence, quality_tier,
  selection_rank, metadata, last_verified_at
)
SELECT
  city.id,
  launch_item.source_id,
  launch_item.name,
  launch_item.lat,
  launch_item.lng,
  launch_item.category,
  launch_item.subcategory,
  launch_item.description,
  'curated',
  1,
  'editorial',
  launch_item.rank,
  jsonb_build_object('collection', 'launch_city_completion_v1'),
  now()
FROM launch_item
JOIN public.catalog_cities AS city ON city.slug = launch_item.city_slug
ON CONFLICT (source, source_id) DO UPDATE SET
  city_id = EXCLUDED.city_id,
  name = EXCLUDED.name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  canonical_category = EXCLUDED.canonical_category,
  subcategory = EXCLUDED.subcategory,
  description = EXCLUDED.description,
  source_confidence = EXCLUDED.source_confidence,
  quality_tier = EXCLUDED.quality_tier,
  selection_rank = EXCLUDED.selection_rank,
  metadata = catalog_items.metadata || EXCLUDED.metadata,
  is_active = true,
  last_verified_at = now(),
  updated_at = now();

-- Verification: Nature should report 4 items; the other categories 2 (10 total).
SELECT
  city.slug AS city_slug,
  item.canonical_category,
  count(*) AS recommendation_count
FROM public.catalog_items AS item
JOIN public.catalog_cities AS city ON city.id = item.city_id
WHERE city.slug IN ('london-gb', 'rome-it', 'barcelona-es', 'athens-gr')
  AND item.is_active
GROUP BY city.slug, item.canonical_category
ORDER BY city.slug, item.canonical_category;
