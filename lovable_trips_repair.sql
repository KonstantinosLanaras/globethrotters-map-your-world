-- Run once in Lovable Cloud > SQL editor.
-- Repairs trip creation, catalogue-place sharing and the API schema cache.

ALTER TABLE public.journeys
  ADD COLUMN IF NOT EXISTS destinations text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS privacy text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS open_to_join boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.journey_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (journey_id, user_id)
);

ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own journeys" ON public.journeys;
DROP POLICY IF EXISTS "Users can insert own journeys" ON public.journeys;
DROP POLICY IF EXISTS "Users can update own journeys" ON public.journeys;
DROP POLICY IF EXISTS "Users can delete own journeys" ON public.journeys;

CREATE POLICY "Users can view own journeys" ON public.journeys
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own journeys" ON public.journeys
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own journeys" ON public.journeys
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own journeys" ON public.journeys
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view published public journeys" ON public.journeys;
CREATE POLICY "Anyone can view published public journeys" ON public.journeys
  FOR SELECT TO authenticated
  USING (status = 'published' AND privacy = 'public');

DROP POLICY IF EXISTS "Connections can view published friend journeys" ON public.journeys;
CREATE POLICY "Connections can view published friend journeys" ON public.journeys
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND privacy = 'friends'
    AND EXISTS (
      SELECT 1 FROM public.followers AS connection
      WHERE connection.follower_id = auth.uid()
        AND connection.following_id = journeys.user_id
        AND connection.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can insert own join requests" ON public.journey_join_requests;
DROP POLICY IF EXISTS "Users can view own join requests" ON public.journey_join_requests;
CREATE POLICY "Users can insert own join requests" ON public.journey_join_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.journeys
      WHERE journeys.id = journey_join_requests.journey_id
        AND journeys.status = 'published'
        AND journeys.open_to_join = true
    )
  );
CREATE POLICY "Users can view own join requests" ON public.journey_join_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own journey experiences" ON public.journey_experiences;
DROP POLICY IF EXISTS "Users can insert own journey experiences" ON public.journey_experiences;
DROP POLICY IF EXISTS "Users can delete own journey experiences" ON public.journey_experiences;

CREATE POLICY "Users can view own journey experiences" ON public.journey_experiences
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.journeys
    WHERE journeys.id = journey_experiences.journey_id AND journeys.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own journey experiences" ON public.journey_experiences
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.journeys
    WHERE journeys.id = journey_experiences.journey_id AND journeys.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete own journey experiences" ON public.journey_experiences
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.journeys
    WHERE journeys.id = journey_experiences.journey_id AND journeys.user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journeys TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.journey_experiences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.journey_join_requests TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('journeys', 'journey_experiences')
ORDER BY tablename, policyname;
