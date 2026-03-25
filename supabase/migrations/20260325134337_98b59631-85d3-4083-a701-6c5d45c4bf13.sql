
-- Change default visibility for NEW places and experiences to 'private'
ALTER TABLE public.places ALTER COLUMN visibility SET DEFAULT 'private';
ALTER TABLE public.experiences ALTER COLUMN visibility SET DEFAULT 'private';

-- Add publish columns to favorite_experiences for enrichment + explicit publish
ALTER TABLE public.favorite_experiences 
  ADD COLUMN IF NOT EXISTS publish_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS publish_note text DEFAULT '',
  ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT NULL;
