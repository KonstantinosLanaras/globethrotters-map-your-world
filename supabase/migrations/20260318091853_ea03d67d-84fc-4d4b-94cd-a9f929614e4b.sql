
-- Add category to place_ratings for adaptive questions
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

-- Add food-specific dimensions
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS food_quality_rating integer DEFAULT NULL;
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS atmosphere_rating integer DEFAULT NULL;
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS authenticity_rating integer DEFAULT NULL;

-- Add nature/hiking dimensions
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS scenery_rating integer DEFAULT NULL;
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS difficulty_rating integer DEFAULT NULL;
ALTER TABLE public.place_ratings ADD COLUMN IF NOT EXISTS worth_it_rating integer DEFAULT NULL;

-- Create function to enforce visited-only reviews
CREATE OR REPLACE FUNCTION public.enforce_visited_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.places
    WHERE id = NEW.place_id
      AND user_id = NEW.user_id
      AND type = 'visited'
  ) THEN
    RAISE EXCEPTION 'You can only review places you have visited';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to enforce visited-only reviews
DROP TRIGGER IF EXISTS enforce_visited_before_review ON public.place_ratings;
CREATE TRIGGER enforce_visited_before_review
  BEFORE INSERT ON public.place_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_visited_review();
