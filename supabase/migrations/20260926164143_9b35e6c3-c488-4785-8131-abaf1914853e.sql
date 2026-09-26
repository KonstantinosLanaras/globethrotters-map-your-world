CREATE OR REPLACE FUNCTION public.is_journey_invitee(_journey_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.journey_members where journey_id = _journey_id and user_id = _user_id and status = 'pending')
$$;

CREATE POLICY "Invitees can view journeys they are invited to" ON public.journeys
FOR SELECT TO authenticated USING (public.is_journey_invitee(id, auth.uid()));

DROP POLICY IF EXISTS "Users can update own membership" ON public.journey_members;
CREATE POLICY "Users can update own membership" ON public.journey_members
FOR UPDATE TO authenticated USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND status IN ('accepted','declined') AND role = 'member');

CREATE POLICY "Users can leave or decline membership" ON public.journey_members
FOR DELETE TO authenticated USING (user_id = auth.uid());