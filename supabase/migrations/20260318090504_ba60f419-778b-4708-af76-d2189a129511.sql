
-- Helpful marks: explicit validation signals on experiences
CREATE TABLE public.helpful_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  mark_type text NOT NULL DEFAULT 'helpful',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(experience_id, user_id)
);

ALTER TABLE public.helpful_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can mark experiences as helpful"
  ON public.helpful_marks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own marks"
  ON public.helpful_marks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view helpful marks"
  ON public.helpful_marks FOR SELECT TO authenticated
  USING (true);

-- Contribution impact log: delayed validation rewards
CREATE TABLE public.contribution_impacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  experience_id uuid REFERENCES public.experiences(id) ON DELETE SET NULL,
  place_id uuid REFERENCES public.places(id) ON DELETE SET NULL,
  impact_type text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  source_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contribution_impacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own impacts"
  ON public.contribution_impacts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Add validated_score to profiles for the new reputation model
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS validated_score integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contribution_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS travelers_helped integer NOT NULL DEFAULT 0;

-- Track helpful count on experiences
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS helpful_count integer NOT NULL DEFAULT 0;

-- Trigger to update helpful_count on experiences
CREATE OR REPLACE FUNCTION public.update_experience_helpful_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  exp_id uuid;
  hcount integer;
BEGIN
  exp_id := COALESCE(NEW.experience_id, OLD.experience_id);
  SELECT count(*) INTO hcount FROM public.helpful_marks WHERE experience_id = exp_id;
  UPDATE public.experiences SET helpful_count = hcount WHERE id = exp_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_helpful_count_trigger
  AFTER INSERT OR DELETE ON public.helpful_marks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_experience_helpful_count();

-- Update engagement score formula to include helpful_count
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
  help_ct integer;
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

  SELECT COALESCE(saves_count, 0), COALESCE(review_count, 0), COALESCE(helpful_count, 0)
  INTO save_ct, rev_ct, help_ct
  FROM public.experiences WHERE id = exp_id;

  UPDATE public.experiences SET engagement_score = (
    COALESCE(save_ct, 0) * 3 +
    COALESCE(rev_ct, 0) * 5 +
    COALESCE(help_ct, 0) * 4 +
    COALESCE(rating_avg, 0) * 10 +
    COALESCE(clicks_count, 0) * 0.5
  ) WHERE id = exp_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;
