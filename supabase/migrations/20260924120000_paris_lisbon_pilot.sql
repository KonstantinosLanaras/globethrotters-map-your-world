-- Paris/Lisbon MVP pilot: 10 editorial recommendations per city,
-- balanced at two items in each canonical category.
--
-- This migration is intentionally idempotent. Re-running the equivalent
-- Lovable SQL-editor script refreshes the editorial fields without creating
-- duplicate catalogue entries.

WITH pilot(city_slug, source_id, name, lat, lng, category, subcategory, description, rank) AS (
  VALUES
    -- Paris: the original three seeds plus seven additions.
    ('paris-fr', 'paris-louvre', 'Louvre Museum', 48.8606, 2.3376, 'culture', 'museum', 'Plan a focused visit around one collection instead of trying to see the entire museum.', 1),
    ('paris-fr', 'paris-montmartre', 'Montmartre morning walk', 48.8867, 2.3431, 'culture', 'neighbourhood_walk', 'Walk the quieter streets around the hill early, before continuing to Sacré-Cœur.', 2),
    ('paris-fr', 'paris-canal', 'Canal Saint-Martin', 48.8722, 2.3652, 'nature', 'urban_waterfront', 'A relaxed canal-side route for cafés, independent shops and an evening picnic.', 3),
    ('paris-fr', 'pilot-paris-marche-enfants-rouges', 'Marché des Enfants Rouges', 48.8628, 2.3610, 'food', 'food_market', 'Browse a compact historic market with a mix of produce stalls and counters serving lunch.', 4),
    ('paris-fr', 'pilot-paris-rue-montorgueil', 'Rue Montorgueil food walk', 48.8640, 2.3473, 'food', 'neighbourhood_food', 'Build an informal tasting walk around bakeries, cheese shops, produce stalls and cafés.', 5),
    ('paris-fr', 'pilot-paris-luxembourg-gardens', 'Luxembourg Gardens', 48.8462, 2.3372, 'nature', 'park', 'Pause around the lawns, tree-lined paths and basin between the Latin Quarter and Saint-Germain.', 6),
    ('paris-fr', 'pilot-paris-coulee-verte', 'Coulée Verte René-Dumont', 48.8451, 2.3761, 'hiking', 'urban_hike', 'Follow a planted former railway from Bastille on an easy elevated and street-level urban walk.', 7),
    ('paris-fr', 'pilot-paris-buttes-chaumont-loop', 'Buttes-Chaumont park loop', 48.8809, 2.3828, 'hiking', 'park_walk', 'Use the park’s slopes, bridges and viewpoints for a short hillier walk in northeast Paris.', 8),
    ('paris-fr', 'pilot-paris-oberkampf-evening', 'Oberkampf evening', 48.8650, 2.3780, 'nightlife', 'nightlife_district', 'Explore the bars and live-music spots around Rue Oberkampf while keeping the evening flexible.', 9),
    ('paris-fr', 'pilot-paris-bastille-rue-de-lappe', 'Bastille and Rue de Lappe', 48.8531, 2.3720, 'nightlife', 'nightlife_district', 'Start near Bastille and continue through a dense stretch of casual bars and late-night venues.', 10),

    -- Lisbon: the original three seeds plus seven additions.
    ('lisbon-pt', 'lisbon-belem', 'Belém riverfront and Jerónimos', 38.6979, -9.2065, 'culture', 'historical_landmark', 'Combine the monastery area, riverside monuments and a traditional pastel de nata stop.', 1),
    ('lisbon-pt', 'lisbon-alfama', 'Alfama and Graça viewpoints', 38.7139, -9.1302, 'culture', 'neighbourhood_walk', 'A hilly route through historic lanes linking several of Lisbon’s best viewpoints.', 2),
    ('lisbon-pt', 'lisbon-lx', 'LX Factory', 38.7037, -9.1782, 'food', 'food_market', 'A former industrial complex with restaurants, small shops and creative spaces.', 3),
    ('lisbon-pt', 'pilot-lisbon-time-out-market', 'Mercado da Ribeira food hall', 38.7071, -9.1456, 'food', 'food_market', 'Sample several Lisbon kitchens in one stop, then continue along the Cais do Sodré waterfront.', 4),
    ('lisbon-pt', 'pilot-lisbon-jardim-estrela', 'Jardim da Estrela', 38.7148, -9.1607, 'nature', 'park', 'Take a quiet break under mature trees near the Estrela Basilica and surrounding neighbourhood.', 5),
    ('lisbon-pt', 'pilot-lisbon-monsanto-forest', 'Monsanto Forest Park', 38.7330, -9.1910, 'nature', 'urban_forest', 'Escape the dense centre for woodland, picnic areas and broad viewpoints over Lisbon.', 6),
    ('lisbon-pt', 'pilot-lisbon-seven-hills', 'Lisbon seven-hills walk', 38.7137, -9.1394, 'hiking', 'urban_hike', 'Link central viewpoints on foot for a demanding urban route with steep streets and frequent stops.', 7),
    ('lisbon-pt', 'pilot-lisbon-tapada-necessidades', 'Tapada das Necessidades walk', 38.7083, -9.1705, 'hiking', 'park_walk', 'Walk the informal paths and shaded corners of a historic garden west of the city centre.', 8),
    ('lisbon-pt', 'pilot-lisbon-bairro-alto', 'Bairro Alto evening', 38.7111, -9.1442, 'nightlife', 'nightlife_district', 'Explore compact streets filled with small bars, choosing the atmosphere as you go.', 9),
    ('lisbon-pt', 'pilot-lisbon-cais-do-sodre', 'Cais do Sodré and Pink Street', 38.7066, -9.1433, 'nightlife', 'nightlife_district', 'Combine late bars and music venues around Cais do Sodré with an easy connection to the riverfront.', 10)
)
INSERT INTO public.catalog_items (
  city_id, source_id, name, latitude, longitude, canonical_category,
  subcategory, description, source, source_confidence, quality_tier,
  selection_rank, metadata, last_verified_at
)
SELECT
  city.id,
  pilot.source_id,
  pilot.name,
  pilot.lat,
  pilot.lng,
  pilot.category,
  pilot.subcategory,
  pilot.description,
  'curated',
  1,
  'editorial',
  pilot.rank,
  jsonb_build_object('collection', 'paris_lisbon_mvp_pilot'),
  now()
FROM pilot
JOIN public.catalog_cities AS city ON city.slug = pilot.city_slug
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
