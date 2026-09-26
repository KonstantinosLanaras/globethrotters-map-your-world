revoke execute on function public.is_journey_owner(uuid, uuid) from public, anon;
revoke execute on function public.is_journey_member(uuid, uuid) from public, anon;
grant execute on function public.is_journey_owner(uuid, uuid) to authenticated;
grant execute on function public.is_journey_member(uuid, uuid) to authenticated;