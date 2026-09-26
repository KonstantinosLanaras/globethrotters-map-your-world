create or replace function public.is_journey_owner(_journey_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.journeys where id = _journey_id and user_id = _user_id)
$$;
create or replace function public.is_journey_member(_journey_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.journey_members where journey_id = _journey_id and user_id = _user_id and status = 'accepted')
$$;

drop policy if exists "Members can view joined journeys" on public.journeys;
create policy "Members can view joined journeys" on public.journeys for select to authenticated
  using (public.is_journey_member(id, auth.uid()));

drop policy if exists "Journey owner can manage members" on public.journey_members;
create policy "Journey owner can manage members" on public.journey_members for all to authenticated
  using (public.is_journey_owner(journey_id, auth.uid()))
  with check (public.is_journey_owner(journey_id, auth.uid()));

create index if not exists idx_journey_members_journey_user on public.journey_members(journey_id, user_id);
create index if not exists idx_journeys_user on public.journeys(user_id);
create index if not exists idx_journey_experiences_journey on public.journey_experiences(journey_id);