
-- Journeys table: groups experiences into trips
CREATE TABLE public.journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  emoji text DEFAULT '✈️',
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journeys" ON public.journeys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own journeys" ON public.journeys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own journeys" ON public.journeys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own journeys" ON public.journeys FOR DELETE USING (auth.uid() = user_id);

-- Junction table: link experiences to journeys
CREATE TABLE public.journey_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(journey_id, experience_id)
);

ALTER TABLE public.journey_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journey experiences" ON public.journey_experiences FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.journeys WHERE id = journey_experiences.journey_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own journey experiences" ON public.journey_experiences FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.journeys WHERE id = journey_experiences.journey_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own journey experiences" ON public.journey_experiences FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.journeys WHERE id = journey_experiences.journey_id AND user_id = auth.uid()));
