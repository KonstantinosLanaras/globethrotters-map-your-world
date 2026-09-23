-- Privacy-light attribution for external provider links. This table records
-- the selected provider and destination, but no user identifier.
CREATE TABLE IF NOT EXISTS public.outbound_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('maps', 'tours', 'stays')),
  entity_type text NOT NULL CHECK (entity_type IN ('experience', 'destination')),
  entity_name text NOT NULL,
  destination text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outbound_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record outbound clicks"
  ON public.outbound_clicks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(entity_name) BETWEEN 1 AND 200
    AND length(destination) BETWEEN 1 AND 200
  );

-- Intentionally no client SELECT policy. Aggregation should be performed by a
-- trusted backend or service-role analytics job.
