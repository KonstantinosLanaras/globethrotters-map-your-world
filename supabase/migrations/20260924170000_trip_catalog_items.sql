-- Let a trip plan contain either a community experience or a curated catalogue place.
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
