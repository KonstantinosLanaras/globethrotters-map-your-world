-- Run this once in Lovable Cloud > SQL editor.
-- It removes the journeys <-> journey_members RLS recursion while preserving
-- access for trip owners and accepted trip members.

CREATE OR REPLACE FUNCTION public.is_journey_owner(_journey_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.journeys
    WHERE id = _journey_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_accepted_journey_member(_journey_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.journey_members
    WHERE journey_id = _journey_id
      AND user_id = auth.uid()
      AND status = 'accepted'
  );
$$;

REVOKE ALL ON FUNCTION public.is_journey_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_accepted_journey_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_journey_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_accepted_journey_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "Members can view joined journeys" ON public.journeys;
CREATE POLICY "Members can view joined journeys"
  ON public.journeys
  FOR SELECT
  TO authenticated
  USING (public.is_accepted_journey_member(id));

DROP POLICY IF EXISTS "Journey owner can manage members" ON public.journey_members;
CREATE POLICY "Journey owner can manage members"
  ON public.journey_members
  FOR ALL
  TO authenticated
  USING (public.is_journey_owner(journey_id))
  WITH CHECK (public.is_journey_owner(journey_id));

NOTIFY pgrst, 'reload schema';

-- Verification: both policies should reference a helper function rather than
-- selecting directly from the opposite table.
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN (
    'Members can view joined journeys',
    'Journey owner can manage members'
  )
ORDER BY tablename, policyname;
