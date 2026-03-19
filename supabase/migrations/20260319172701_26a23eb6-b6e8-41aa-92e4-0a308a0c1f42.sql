
-- Favorite experiences table
CREATE TABLE public.favorite_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  experience_id UUID NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, experience_id)
);

ALTER TABLE public.favorite_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorite experiences"
  ON public.favorite_experiences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorite experiences"
  ON public.favorite_experiences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite experiences"
  ON public.favorite_experiences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Favorite trips/journeys table
CREATE TABLE public.favorite_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, journey_id)
);

ALTER TABLE public.favorite_journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorite journeys"
  ON public.favorite_journeys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorite journeys"
  ON public.favorite_journeys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite journeys"
  ON public.favorite_journeys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
