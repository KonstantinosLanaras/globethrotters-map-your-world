
-- Add verification and trust fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN trust_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN verified_at TIMESTAMPTZ;

-- Authenticity scores for place reviews
CREATE TABLE public.review_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  authenticity_score INTEGER NOT NULL DEFAULT 50 CHECK (authenticity_score >= 0 AND authenticity_score <= 100),
  depth_score INTEGER NOT NULL DEFAULT 0 CHECK (depth_score >= 0 AND depth_score <= 100),
  has_photos BOOLEAN NOT NULL DEFAULT false,
  has_detailed_notes BOOLEAN NOT NULL DEFAULT false,
  has_specific_tags BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(place_id, user_id)
);

ALTER TABLE public.review_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all review scores" ON public.review_scores FOR SELECT USING (true);
CREATE POLICY "Users can insert own review scores" ON public.review_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own review scores" ON public.review_scores FOR UPDATE USING (auth.uid() = user_id);

-- Reports table for flagging content
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_place_id UUID REFERENCES public.places(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'misleading', 'fake', 'other')),
  details TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);

-- Spam flags table for automated detection
CREATE TABLE public.spam_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID REFERENCES public.places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('auto_spam', 'low_quality', 'duplicate', 'suspicious')),
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
  details JSONB DEFAULT '{}',
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.spam_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spam flags" ON public.spam_flags FOR SELECT USING (auth.uid() = user_id);

-- Function to compute authenticity score when a place is updated
CREATE OR REPLACE FUNCTION public.compute_authenticity_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  score INTEGER := 0;
  depth INTEGER := 0;
  photo_count INTEGER := 0;
BEGIN
  -- Base score for having content
  score := 20;

  -- Notes depth (longer, more detailed notes score higher)
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 10 THEN
    score := score + 15;
    depth := depth + 20;
  END IF;
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 50 THEN
    score := score + 10;
    depth := depth + 20;
  END IF;
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 150 THEN
    score := score + 10;
    depth := depth + 20;
  END IF;

  -- Tags contribute to authenticity
  IF NEW.tags IS NOT NULL AND array_length(NEW.tags, 1) > 0 THEN
    score := score + 10;
    depth := depth + 10;
  END IF;
  IF NEW.tags IS NOT NULL AND array_length(NEW.tags, 1) > 2 THEN
    score := score + 5;
    depth := depth + 10;
  END IF;

  -- Rating adds credibility
  IF NEW.rating > 0 THEN
    score := score + 10;
  END IF;

  -- Date visited adds authenticity
  IF NEW.date_visited IS NOT NULL THEN
    score := score + 10;
  END IF;

  -- Check for photos
  SELECT count(*) INTO photo_count FROM public.photos WHERE place_id = NEW.id;
  IF photo_count > 0 THEN
    score := score + 10;
    depth := depth + 20;
  END IF;

  -- Cap scores
  IF score > 100 THEN score := 100; END IF;
  IF depth > 100 THEN depth := 100; END IF;

  -- Upsert review score
  INSERT INTO public.review_scores (place_id, user_id, authenticity_score, depth_score, has_photos, has_detailed_notes, has_specific_tags)
  VALUES (
    NEW.id,
    NEW.user_id,
    score,
    depth,
    photo_count > 0,
    NEW.notes IS NOT NULL AND length(NEW.notes) > 50,
    NEW.tags IS NOT NULL AND array_length(NEW.tags, 1) > 2
  )
  ON CONFLICT (place_id, user_id) DO UPDATE SET
    authenticity_score = score,
    depth_score = depth,
    has_photos = photo_count > 0,
    has_detailed_notes = NEW.notes IS NOT NULL AND length(NEW.notes) > 50,
    has_specific_tags = NEW.tags IS NOT NULL AND array_length(NEW.tags, 1) > 2,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER compute_place_authenticity
  AFTER INSERT OR UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.compute_authenticity_score();

-- Function to update user trust score based on their review quality
CREATE OR REPLACE FUNCTION public.update_user_trust_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_score INTEGER;
  place_count INTEGER;
  trust INTEGER;
BEGIN
  SELECT COALESCE(AVG(authenticity_score), 0)::INTEGER, COUNT(*)
  INTO avg_score, place_count
  FROM public.review_scores
  WHERE user_id = NEW.user_id;

  -- Trust = weighted average of authenticity + volume bonus
  trust := avg_score;
  IF place_count >= 5 THEN trust := trust + 5; END IF;
  IF place_count >= 10 THEN trust := trust + 5; END IF;
  IF place_count >= 25 THEN trust := trust + 5; END IF;
  IF trust > 100 THEN trust := 100; END IF;

  UPDATE public.profiles SET trust_score = trust WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_trust_on_review
  AFTER INSERT OR UPDATE ON public.review_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_user_trust_score();

-- Add trigger for reports updated_at
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_review_scores_updated_at BEFORE UPDATE ON public.review_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
