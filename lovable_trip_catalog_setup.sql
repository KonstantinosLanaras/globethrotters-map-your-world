-- Run once in Lovable Cloud > SQL editor.
-- Enables adding curated city places and restaurants to trip plans.

ALTER TABLE public.journey_experiences
  ALTER COLUMN experience_id DROP NOT NULL;

ALTER TABLE public.journey_experiences
  ADD COLUMN IF NOT EXISTS catalog_item_id uuid
  REFERENCES public.catalog_items(id) ON DELETE CASCADE;

ALTER TABLE public.journey_experiences
  DROP CONSTRAINT IF EXISTS journey_experiences_one_item_check;

ALTER TABLE public.journey_experiences
  ADD CONSTRAINT journey_experiences_one_item_check
  CHECK (num_nonnulls(experience_id, catalog_item_id) = 1);

CREATE UNIQUE INDEX IF NOT EXISTS journey_experiences_journey_catalog_uidx
  ON public.journey_experiences (journey_id, catalog_item_id)
  WHERE catalog_item_id IS NOT NULL;

-- Verification: should return catalog_item_id as nullable uuid.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'journey_experiences'
  AND column_name IN ('experience_id', 'catalog_item_id')
ORDER BY column_name;
