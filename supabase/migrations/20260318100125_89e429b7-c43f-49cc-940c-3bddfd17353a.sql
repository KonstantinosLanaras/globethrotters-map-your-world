
-- Add new city-level dimension columns to place_ratings
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS english_rating integer DEFAULT NULL;
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS transport_rating integer DEFAULT NULL;
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS food_score integer DEFAULT NULL;
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS culture_score integer DEFAULT NULL;
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS nature_score integer DEFAULT NULL;
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS hiking_score integer DEFAULT NULL;
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS nightlife_score integer DEFAULT NULL;
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS crowd_level text DEFAULT NULL;
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS best_months text[] DEFAULT '{}'::text[];
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS selected_interests text[] DEFAULT '{}'::text[];
