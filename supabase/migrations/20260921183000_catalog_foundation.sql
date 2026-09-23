-- Normalized catalogue for platform-curated places.
-- Provider data is staged separately so licensed/expiring fields are not mixed
-- with the permanent, independently sourced catalogue.

CREATE TABLE public.catalog_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  country text NOT NULL,
  country_code text NOT NULL CHECK (char_length(country_code) = 2),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  market_rank integer,
  search_radius_km integer NOT NULL DEFAULT 25 CHECK (search_radius_km BETWEEN 5 AND 75),
  is_launch_city boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.catalog_cities(id) ON DELETE CASCADE,
  name text NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  canonical_category text NOT NULL CHECK (
    canonical_category IN ('food', 'culture', 'nature', 'hiking', 'nightlife')
  ),
  subcategory text NOT NULL,
  description text,
  source text NOT NULL CHECK (source IN ('curated', 'overture', 'osm', 'wikidata')),
  source_id text NOT NULL,
  source_url text,
  source_confidence numeric CHECK (source_confidence BETWEEN 0 AND 1),
  quality_tier text NOT NULL DEFAULT 'coverage' CHECK (
    quality_tier IN ('coverage', 'popular', 'editorial', 'community')
  ),
  selection_rank integer CHECK (selection_rank IS NULL OR selection_rank > 0),
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);

CREATE INDEX catalog_items_city_category_idx
  ON public.catalog_items (city_id, canonical_category, quality_tier, selection_rank)
  WHERE is_active;
CREATE INDEX catalog_items_coordinates_idx
  ON public.catalog_items (latitude, longitude)
  WHERE is_active;

CREATE TABLE public.catalog_source_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id uuid NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  selection_rank integer CHECK (selection_rank IS NULL OR selection_rank > 0),
  matched_at timestamptz NOT NULL DEFAULT now(),
  last_checked_at timestamptz,
  UNIQUE (provider, external_id),
  UNIQUE (catalog_item_id, provider)
);

CREATE TABLE public.catalog_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  candidate_count integer NOT NULL DEFAULT 0 CHECK (candidate_count >= 0),
  selected_count integer NOT NULL DEFAULT 0 CHECK (selected_count >= 0),
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Google permits Place IDs to be stored. Other Places response fields are
-- ranked transiently by the Edge Function and are never written to storage.
CREATE TABLE public.google_place_candidate_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id uuid NOT NULL REFERENCES public.catalog_import_runs(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES public.catalog_cities(id) ON DELETE CASCADE,
  search_category text NOT NULL CHECK (
    search_category IN ('food', 'culture', 'nature', 'hiking', 'nightlife')
  ),
  google_place_id text NOT NULL,
  selection_rank integer NOT NULL CHECK (selection_rank BETWEEN 1 AND 10),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_run_id, city_id, search_category, google_place_id)
);

CREATE INDEX google_candidate_ids_lookup_idx
  ON public.google_place_candidate_ids (
    import_run_id, city_id, search_category, selection_rank
  );

CREATE TABLE public.provider_type_mappings (
  provider text NOT NULL,
  external_type text NOT NULL,
  canonical_category text NOT NULL CHECK (
    canonical_category IN ('food', 'culture', 'nature', 'hiking', 'nightlife')
  ),
  subcategory text NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (provider, external_type)
);

INSERT INTO public.provider_type_mappings
  (provider, external_type, canonical_category, subcategory, priority)
VALUES
  ('google', 'restaurant', 'food', 'restaurant', 10),
  ('google', 'cafe', 'food', 'cafe', 10),
  ('google', 'bakery', 'food', 'bakery', 10),
  ('google', 'food_court', 'food', 'food_market', 20),
  ('google', 'museum', 'culture', 'museum', 10),
  ('google', 'art_gallery', 'culture', 'art_gallery', 10),
  ('google', 'cultural_center', 'culture', 'cultural_center', 10),
  ('google', 'historical_landmark', 'culture', 'historical_landmark', 10),
  ('google', 'monument', 'culture', 'monument', 10),
  ('google', 'park', 'nature', 'park', 10),
  ('google', 'national_park', 'nature', 'national_park', 10),
  ('google', 'botanical_garden', 'nature', 'botanical_garden', 10),
  ('google', 'beach', 'nature', 'beach', 10),
  ('google', 'hiking_area', 'hiking', 'trail', 10),
  ('google', 'night_club', 'nightlife', 'nightclub', 10),
  ('google', 'bar', 'nightlife', 'bar', 20),
  ('google', 'concert_hall', 'nightlife', 'live_music', 20),
  ('overture', 'restaurant', 'food', 'restaurant', 10),
  ('overture', 'cafe', 'food', 'cafe', 10),
  ('overture', 'museum', 'culture', 'museum', 10),
  ('overture', 'historical_landmark', 'culture', 'historical_landmark', 10),
  ('overture', 'park', 'nature', 'park', 10),
  ('overture', 'botanical_garden', 'nature', 'botanical_garden', 10),
  ('overture', 'hiking_trail', 'hiking', 'trail', 10),
  ('overture', 'nightclub', 'nightlife', 'nightclub', 10)
ON CONFLICT (provider, external_type) DO UPDATE SET
  canonical_category = EXCLUDED.canonical_category,
  subcategory = EXCLUDED.subcategory,
  priority = EXCLUDED.priority,
  is_active = true;

ALTER TABLE public.catalog_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_source_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_place_candidate_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_type_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active catalog cities"
  ON public.catalog_cities FOR SELECT
  TO anon, authenticated
  USING (is_active);

CREATE POLICY "Public can view active catalog items"
  ON public.catalog_items FOR SELECT
  TO anon, authenticated
  USING (is_active);

CREATE POLICY "Public can view provider mappings"
  ON public.provider_type_mappings FOR SELECT
  TO anon, authenticated
  USING (is_active);

-- No client write policies are intentionally defined. Catalogue ingestion uses
-- the server-side service role and staging data is never exposed publicly.
