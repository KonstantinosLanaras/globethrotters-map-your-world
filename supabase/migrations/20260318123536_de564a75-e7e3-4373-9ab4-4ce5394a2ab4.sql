
ALTER TABLE public.journeys
  ADD COLUMN IF NOT EXISTS destinations text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS cover_image_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS privacy text NOT NULL DEFAULT 'public';
