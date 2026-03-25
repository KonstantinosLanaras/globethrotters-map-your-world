
-- Trip posts: intentional social posts tied to a journey context
CREATE TABLE public.trip_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  caption text DEFAULT '',
  photo_url text DEFAULT NULL,
  experience_id uuid REFERENCES public.experiences(id) ON DELETE SET NULL DEFAULT NULL,
  tagged_user_ids uuid[] DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_posts ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Users can manage own trip posts"
  ON public.trip_posts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public posts visible to authenticated users
CREATE POLICY "Authenticated can view public trip posts"
  ON public.trip_posts FOR SELECT
  TO authenticated
  USING (visibility = 'public');

-- Tagged users can view posts they're tagged in
CREATE POLICY "Tagged users can view posts"
  ON public.trip_posts FOR SELECT
  TO authenticated
  USING (auth.uid() = ANY(tagged_user_ids));
