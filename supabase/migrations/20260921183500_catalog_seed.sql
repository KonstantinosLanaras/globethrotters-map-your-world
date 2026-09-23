-- Editable European launch-market list. market_rank controls rollout priority;
-- it is not presented to users as an official tourism ranking.
INSERT INTO public.catalog_cities
  (slug, name, country, country_code, latitude, longitude, market_rank, search_radius_km, is_launch_city)
VALUES
  ('london-gb', 'London', 'United Kingdom', 'GB', 51.5074, -0.1278, 1, 35, true),
  ('paris-fr', 'Paris', 'France', 'FR', 48.8566, 2.3522, 2, 30, true),
  ('istanbul-tr', 'Istanbul', 'Turkey', 'TR', 41.0082, 28.9784, 3, 40, false),
  ('rome-it', 'Rome', 'Italy', 'IT', 41.9028, 12.4964, 4, 30, true),
  ('barcelona-es', 'Barcelona', 'Spain', 'ES', 41.3874, 2.1686, 5, 25, true),
  ('madrid-es', 'Madrid', 'Spain', 'ES', 40.4168, -3.7038, 6, 30, false),
  ('amsterdam-nl', 'Amsterdam', 'Netherlands', 'NL', 52.3676, 4.9041, 7, 20, false),
  ('milan-it', 'Milan', 'Italy', 'IT', 45.4642, 9.1900, 8, 25, false),
  ('prague-cz', 'Prague', 'Czech Republic', 'CZ', 50.0755, 14.4378, 9, 22, false),
  ('vienna-at', 'Vienna', 'Austria', 'AT', 48.2082, 16.3738, 10, 25, false),
  ('lisbon-pt', 'Lisbon', 'Portugal', 'PT', 38.7223, -9.1393, 11, 25, true),
  ('athens-gr', 'Athens', 'Greece', 'GR', 37.9838, 23.7275, 12, 30, true),
  ('berlin-de', 'Berlin', 'Germany', 'DE', 52.5200, 13.4050, 13, 35, false),
  ('dublin-ie', 'Dublin', 'Ireland', 'IE', 53.3498, -6.2603, 14, 25, false),
  ('venice-it', 'Venice', 'Italy', 'IT', 45.4408, 12.3155, 15, 18, false),
  ('florence-it', 'Florence', 'Italy', 'IT', 43.7696, 11.2558, 16, 18, false),
  ('munich-de', 'Munich', 'Germany', 'DE', 48.1351, 11.5820, 17, 25, false),
  ('copenhagen-dk', 'Copenhagen', 'Denmark', 'DK', 55.6761, 12.5683, 18, 22, false),
  ('budapest-hu', 'Budapest', 'Hungary', 'HU', 47.4979, 19.0402, 19, 25, false),
  ('brussels-be', 'Brussels', 'Belgium', 'BE', 50.8503, 4.3517, 20, 22, false),
  ('edinburgh-gb', 'Edinburgh', 'United Kingdom', 'GB', 55.9533, -3.1883, 21, 20, false),
  ('porto-pt', 'Porto', 'Portugal', 'PT', 41.1579, -8.6291, 22, 20, false),
  ('stockholm-se', 'Stockholm', 'Sweden', 'SE', 59.3293, 18.0686, 23, 30, false),
  ('oslo-no', 'Oslo', 'Norway', 'NO', 59.9139, 10.7522, 24, 28, false),
  ('reykjavik-is', 'Reykjavik', 'Iceland', 'IS', 64.1466, -21.9426, 25, 30, false),
  ('zurich-ch', 'Zurich', 'Switzerland', 'CH', 47.3769, 8.5417, 26, 22, false),
  ('geneva-ch', 'Geneva', 'Switzerland', 'CH', 46.2044, 6.1432, 27, 22, false),
  ('nice-fr', 'Nice', 'France', 'FR', 43.7102, 7.2620, 28, 22, false),
  ('krakow-pl', 'Krakow', 'Poland', 'PL', 50.0647, 19.9450, 29, 20, false),
  ('warsaw-pl', 'Warsaw', 'Poland', 'PL', 52.2297, 21.0122, 30, 28, false),
  ('dubrovnik-hr', 'Dubrovnik', 'Croatia', 'HR', 42.6507, 18.0944, 31, 18, false),
  ('split-hr', 'Split', 'Croatia', 'HR', 43.5081, 16.4402, 32, 20, false),
  ('salzburg-at', 'Salzburg', 'Austria', 'AT', 47.8095, 13.0550, 33, 18, false),
  ('seville-es', 'Seville', 'Spain', 'ES', 37.3891, -5.9845, 34, 22, false),
  ('valencia-es', 'Valencia', 'Spain', 'ES', 39.4699, -0.3763, 35, 25, false),
  ('malaga-es', 'Malaga', 'Spain', 'ES', 36.7213, -4.4214, 36, 22, false),
  ('naples-it', 'Naples', 'Italy', 'IT', 40.8518, 14.2681, 37, 25, false),
  ('bologna-it', 'Bologna', 'Italy', 'IT', 44.4949, 11.3426, 38, 20, false),
  ('turin-it', 'Turin', 'Italy', 'IT', 45.0703, 7.6869, 39, 22, false),
  ('lyon-fr', 'Lyon', 'France', 'FR', 45.7640, 4.8357, 40, 24, false),
  ('bordeaux-fr', 'Bordeaux', 'France', 'FR', 44.8378, -0.5792, 41, 22, false),
  ('marseille-fr', 'Marseille', 'France', 'FR', 43.2965, 5.3698, 42, 28, false),
  ('hamburg-de', 'Hamburg', 'Germany', 'DE', 53.5511, 9.9937, 43, 30, false),
  ('frankfurt-de', 'Frankfurt', 'Germany', 'DE', 50.1109, 8.6821, 44, 25, false),
  ('cologne-de', 'Cologne', 'Germany', 'DE', 50.9375, 6.9603, 45, 24, false),
  ('rotterdam-nl', 'Rotterdam', 'Netherlands', 'NL', 51.9244, 4.4777, 46, 22, false),
  ('the-hague-nl', 'The Hague', 'Netherlands', 'NL', 52.0705, 4.3007, 47, 20, false),
  ('antwerp-be', 'Antwerp', 'Belgium', 'BE', 51.2194, 4.4025, 48, 20, false),
  ('bruges-be', 'Bruges', 'Belgium', 'BE', 51.2093, 3.2247, 49, 16, false),
  ('tallinn-ee', 'Tallinn', 'Estonia', 'EE', 59.4370, 24.7536, 50, 20, false)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  country_code = EXCLUDED.country_code,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  market_rank = EXCLUDED.market_rank,
  search_radius_km = EXCLUDED.search_radius_km,
  is_launch_city = EXCLUDED.is_launch_city,
  is_active = true,
  updated_at = now();

WITH seed(city_slug, source_id, name, lat, lng, category, subcategory, description, rank) AS (
  VALUES
    ('paris-fr', 'paris-louvre', 'Louvre Museum', 48.8606, 2.3376, 'culture', 'museum', 'Plan a focused visit around one collection instead of trying to see the entire museum.', 1),
    ('paris-fr', 'paris-montmartre', 'Montmartre morning walk', 48.8867, 2.3431, 'culture', 'neighbourhood_walk', 'Walk the quieter streets around the hill early, before continuing to Sacré-Cœur.', 2),
    ('paris-fr', 'paris-canal', 'Canal Saint-Martin', 48.8722, 2.3652, 'nature', 'urban_waterfront', 'A relaxed canal-side route for cafés, independent shops and an evening picnic.', 3),
    ('lisbon-pt', 'lisbon-belem', 'Belém riverfront and Jerónimos', 38.6979, -9.2065, 'culture', 'historical_landmark', 'Combine the monastery area, riverside monuments and a traditional pastel de nata stop.', 1),
    ('lisbon-pt', 'lisbon-alfama', 'Alfama and Graça viewpoints', 38.7139, -9.1302, 'culture', 'neighbourhood_walk', 'A hilly route through historic lanes linking several of Lisbon’s best viewpoints.', 2),
    ('lisbon-pt', 'lisbon-lx', 'LX Factory', 38.7037, -9.1782, 'food', 'food_market', 'A former industrial complex with restaurants, small shops and creative spaces.', 3),
    ('rome-it', 'rome-colosseum', 'Colosseum and Roman Forum', 41.8902, 12.4922, 'culture', 'historical_landmark', 'Reserve a timed entry and allow enough time for the Forum and Palatine Hill.', 1),
    ('rome-it', 'rome-trastevere', 'Trastevere evening walk', 41.8897, 12.4708, 'food', 'neighbourhood_food', 'Explore side streets and traditional Roman food away from the busiest squares.', 2),
    ('rome-it', 'rome-appian', 'Appian Way by bicycle', 41.8429, 12.5288, 'hiking', 'cycling_route', 'Cycle a preserved Roman road and nearby aqueduct landscapes outside the centre.', 3),
    ('athens-gr', 'athens-acropolis', 'Acropolis and Acropolis Museum', 37.9715, 23.7267, 'culture', 'historical_landmark', 'Visit the archaeological site early, then connect the ruins to their history in the museum.', 1),
    ('athens-gr', 'athens-plaka', 'Plaka and Anafiotika walk', 37.9724, 23.7297, 'culture', 'neighbourhood_walk', 'A compact old-town walk through lanes inspired by Cycladic island architecture.', 2),
    ('athens-gr', 'athens-lycabettus', 'Lycabettus Hill sunset', 37.9817, 23.7430, 'hiking', 'urban_hike', 'Climb or take the funicular for a wide city view; arrive ahead of sunset.', 3),
    ('barcelona-es', 'barcelona-sagrada', 'Sagrada Família', 41.4036, 2.1744, 'culture', 'historical_landmark', 'Book a timed interior visit to understand Gaudí’s light, structure and symbolism.', 1),
    ('barcelona-es', 'barcelona-gracia', 'Gràcia neighbourhood walk', 41.4030, 2.1567, 'culture', 'neighbourhood_walk', 'Explore small plazas, local shops and a calmer side of Barcelona above the old centre.', 2),
    ('barcelona-es', 'barcelona-montjuic', 'Montjuïc gardens and museums', 41.3636, 2.1585, 'nature', 'park', 'Link hillside gardens, viewpoints and a museum visit in one flexible half-day route.', 3),
    ('london-gb', 'london-british', 'British Museum', 51.5194, -0.1270, 'culture', 'museum', 'Choose a small number of galleries and reserve a free entry time during busy periods.', 1),
    ('london-gb', 'london-borough', 'Borough Market and South Bank', 51.5055, -0.0910, 'food', 'food_market', 'Combine a market lunch with a Thames-side walk toward Tate Modern.', 2),
    ('london-gb', 'london-hampstead', 'Hampstead Heath and village', 51.5608, -0.1647, 'nature', 'park', 'A green escape with skyline views, swimming ponds and historic village streets.', 3)
)
INSERT INTO public.catalog_items (
  city_id, source_id, name, latitude, longitude, canonical_category,
  subcategory, description, source, source_confidence, quality_tier,
  selection_rank, last_verified_at
)
SELECT
  city.id, seed.source_id, seed.name, seed.lat, seed.lng, seed.category,
  seed.subcategory, seed.description, 'curated', 1, 'editorial', seed.rank, now()
FROM seed
JOIN public.catalog_cities city ON city.slug = seed.city_slug
ON CONFLICT (source, source_id) DO UPDATE SET
  city_id = EXCLUDED.city_id,
  name = EXCLUDED.name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  canonical_category = EXCLUDED.canonical_category,
  subcategory = EXCLUDED.subcategory,
  description = EXCLUDED.description,
  quality_tier = EXCLUDED.quality_tier,
  selection_rank = EXCLUDED.selection_rank,
  is_active = true,
  last_verified_at = now(),
  updated_at = now();
