CREATE TABLE public.destination_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_name text NOT NULL,
  country text NOT NULL,
  activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(place_name, country)
);

ALTER TABLE public.destination_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view destination activities"
  ON public.destination_activities
  FOR SELECT
  TO public
  USING (true);