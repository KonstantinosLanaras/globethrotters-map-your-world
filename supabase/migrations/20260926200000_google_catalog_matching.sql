-- Match transient Google popularity candidates to durable open catalogue rows.
-- A match remains pending until an explicit editorial approval promotes it.

ALTER TABLE public.google_place_candidate_ids
  ADD COLUMN IF NOT EXISTS catalog_item_id uuid
    REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS match_score numeric
    CHECK (match_score IS NULL OR match_score BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS match_method text
    CHECK (match_method IS NULL OR match_method IN ('name_distance_v1')),
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected', 'unmatched')),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE INDEX IF NOT EXISTS google_candidate_match_review_idx
  ON public.google_place_candidate_ids (review_status, city_id, search_category)
  WHERE review_status IN ('pending', 'unmatched');

CREATE OR REPLACE VIEW public.google_candidate_match_review
WITH (security_invoker = true)
AS
SELECT
  candidate.id AS candidate_id,
  candidate.import_run_id,
  city.slug AS city_slug,
  city.name AS city_name,
  candidate.search_category,
  candidate.google_place_id,
  candidate.selection_rank,
  candidate.review_status,
  candidate.match_score,
  candidate.match_method,
  item.id AS catalog_item_id,
  item.name AS catalog_item_name,
  item.source AS catalog_source,
  item.source_id AS catalog_source_id,
  item.canonical_category,
  item.subcategory
FROM public.google_place_candidate_ids AS candidate
JOIN public.catalog_cities AS city ON city.id = candidate.city_id
LEFT JOIN public.catalog_items AS item ON item.id = candidate.catalog_item_id;

-- This function is intentionally service-role only. Calling it represents an
-- independent editorial approval; no candidate is auto-promoted by the import.
CREATE OR REPLACE FUNCTION public.approve_google_catalog_match(candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate public.google_place_candidate_ids%ROWTYPE;
BEGIN
  SELECT * INTO candidate
  FROM public.google_place_candidate_ids
  WHERE id = candidate_id
  FOR UPDATE;

  IF candidate.id IS NULL THEN
    RAISE EXCEPTION 'Google candidate was not found';
  END IF;
  IF candidate.catalog_item_id IS NULL THEN
    RAISE EXCEPTION 'Google candidate has no catalogue match';
  END IF;

  INSERT INTO public.catalog_source_refs (
    catalog_item_id, provider, external_id, selection_rank, last_checked_at
  ) VALUES (
    candidate.catalog_item_id, 'google', candidate.google_place_id,
    candidate.selection_rank, now()
  )
  ON CONFLICT (catalog_item_id, provider) DO UPDATE SET
    external_id = EXCLUDED.external_id,
    selection_rank = EXCLUDED.selection_rank,
    last_checked_at = now();

  UPDATE public.catalog_items
  SET quality_tier = CASE
      WHEN quality_tier IN ('editorial', 'community') THEN quality_tier
      ELSE 'popular'
    END,
    updated_at = now()
  WHERE id = candidate.catalog_item_id;

  UPDATE public.google_place_candidate_ids
  SET review_status = 'approved', reviewed_at = now()
  WHERE id = candidate.id;

  RETURN candidate.catalog_item_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_google_catalog_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_google_catalog_match(uuid) TO service_role;

SELECT
  count(*) FILTER (WHERE review_status = 'pending') AS pending_matches,
  count(*) FILTER (WHERE review_status = 'unmatched') AS unmatched_candidates,
  count(*) FILTER (WHERE review_status = 'approved') AS approved_matches
FROM public.google_place_candidate_ids;
