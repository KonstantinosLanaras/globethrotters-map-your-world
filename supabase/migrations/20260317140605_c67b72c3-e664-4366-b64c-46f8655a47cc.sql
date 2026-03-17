
-- Add engagement columns to experiences table
ALTER TABLE public.experiences 
  ADD COLUMN IF NOT EXISTS saves_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_score numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_seeded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_sponsored boolean NOT NULL DEFAULT false;

-- Experience saves table
CREATE TABLE IF NOT EXISTS public.experience_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid REFERENCES public.experiences(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(experience_id, user_id)
);

ALTER TABLE public.experience_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all saves" ON public.experience_saves
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own saves" ON public.experience_saves
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saves" ON public.experience_saves
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Experience reviews table
CREATE TABLE IF NOT EXISTS public.experience_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid REFERENCES public.experiences(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(experience_id, user_id)
);

ALTER TABLE public.experience_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON public.experience_reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own reviews" ON public.experience_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON public.experience_reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON public.experience_reviews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Function to update experience engagement metrics
CREATE OR REPLACE FUNCTION public.update_experience_engagement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  exp_id uuid;
  save_ct integer;
  rev_ct integer;
  avg_rat numeric;
BEGIN
  IF TG_TABLE_NAME = 'experience_saves' THEN
    exp_id := COALESCE(NEW.experience_id, OLD.experience_id);
    SELECT count(*) INTO save_ct FROM public.experience_saves WHERE experience_id = exp_id;
    UPDATE public.experiences SET saves_count = save_ct WHERE id = exp_id;
  ELSIF TG_TABLE_NAME = 'experience_reviews' THEN
    exp_id := COALESCE(NEW.experience_id, OLD.experience_id);
    SELECT count(*), COALESCE(avg(rating), 0) INTO rev_ct, avg_rat FROM public.experience_reviews WHERE experience_id = exp_id;
    UPDATE public.experiences SET review_count = rev_ct, rating_avg = avg_rat WHERE id = exp_id;
  END IF;

  -- Update engagement score
  UPDATE public.experiences SET engagement_score = (
    COALESCE(saves_count, 0) * 3 +
    COALESCE(review_count, 0) * 5 +
    COALESCE(rating_avg, 0) * 10 +
    COALESCE(clicks_count, 0) * 0.5
  ) WHERE id = exp_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers
CREATE TRIGGER trg_experience_save_engagement
  AFTER INSERT OR DELETE ON public.experience_saves
  FOR EACH ROW EXECUTE FUNCTION public.update_experience_engagement();

CREATE TRIGGER trg_experience_review_engagement
  AFTER INSERT OR UPDATE OR DELETE ON public.experience_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_experience_engagement();
