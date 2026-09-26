-- Run once in Lovable > More > Cloud > SQL editor.
-- This creates sourced destination metrics for the Explore filters.

CREATE TABLE IF NOT EXISTS public.city_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.catalog_cities(id) ON DELETE CASCADE,
  metric text NOT NULL CHECK (metric IN (
    'budget', 'safety', 'food', 'culture', 'nature', 'nightlife',
    'adventure', 'transport', 'family', 'solo', 'couple', 'climate', 'crowds'
  )),
  value numeric NOT NULL CHECK (value BETWEEN 0 AND 100),
  band text,
  month smallint CHECK (month BETWEEN 1 AND 12),
  month_key smallint GENERATED ALWAYS AS (coalesce(month, 0)) STORED,
  source_kind text NOT NULL CHECK (source_kind IN ('official', 'open_data', 'published_ranking', 'llm_editorial', 'community', 'hybrid')),
  source_name text NOT NULL,
  source_url text,
  methodology_version text NOT NULL,
  model_name text,
  confidence numeric NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  sample_size integer CHECK (sample_size IS NULL OR sample_size >= 0),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_at date NOT NULL DEFAULT current_date,
  valid_until date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS city_metrics_source_version_unique_idx
  ON public.city_metrics (city_id, metric, source_kind, source_name, month_key, methodology_version);
CREATE INDEX IF NOT EXISTS city_metrics_current_lookup_idx
  ON public.city_metrics (city_id, metric, month_key, is_active, effective_at DESC);
ALTER TABLE public.city_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active city metrics" ON public.city_metrics;
CREATE POLICY "Public can read active city metrics" ON public.city_metrics
  FOR SELECT TO anon, authenticated
  USING (is_active AND (valid_until IS NULL OR valid_until >= current_date));

CREATE OR REPLACE VIEW public.city_metric_current WITH (security_invoker = true) AS
SELECT city_id, city_slug, city_name, country, metric, value, band, month,
  source_kind, source_name, source_url, methodology_version, model_name,
  confidence, sample_size, effective_at, valid_until
FROM (
  SELECT metric.city_id, city.slug AS city_slug, city.name AS city_name, city.country,
    metric.metric, metric.value, metric.band, metric.month, metric.source_kind,
    metric.source_name, metric.source_url, metric.methodology_version,
    metric.model_name, metric.confidence, metric.sample_size, metric.effective_at,
    metric.valid_until,
    row_number() OVER (
      PARTITION BY metric.city_id, metric.metric, metric.month_key
      ORDER BY CASE
        WHEN metric.source_kind = 'community' AND coalesce(metric.sample_size, 0) >= 25 THEN 1
        WHEN metric.source_kind = 'official' THEN 2
        WHEN metric.source_kind = 'open_data' THEN 3
        WHEN metric.source_kind = 'published_ranking' THEN 4
        WHEN metric.source_kind = 'hybrid' THEN 5
        WHEN metric.source_kind = 'llm_editorial' THEN 6
        ELSE 7 END,
        metric.effective_at DESC, metric.confidence DESC
    ) AS preference_rank
  FROM public.city_metrics AS metric
  JOIN public.catalog_cities AS city ON city.id = metric.city_id
  WHERE metric.is_active AND city.is_active
    AND (metric.valid_until IS NULL OR metric.valid_until >= current_date)
) AS ranked
WHERE preference_rank = 1;

GRANT SELECT ON public.city_metric_current TO anon, authenticated;
NOTIFY pgrst, 'reload schema';

SELECT to_regclass('public.city_metrics') IS NOT NULL AS city_metrics_ready;
