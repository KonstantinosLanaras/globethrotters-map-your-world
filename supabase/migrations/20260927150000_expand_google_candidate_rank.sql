-- Google Nearby returns at most 20 places per request. Preserve all returned
-- candidates for matching and editorial review without increasing API calls.
ALTER TABLE public.google_place_candidate_ids
  DROP CONSTRAINT IF EXISTS google_place_candidate_ids_selection_rank_check;

ALTER TABLE public.google_place_candidate_ids
  ADD CONSTRAINT google_place_candidate_ids_selection_rank_check
  CHECK (selection_rank BETWEEN 1 AND 20);
