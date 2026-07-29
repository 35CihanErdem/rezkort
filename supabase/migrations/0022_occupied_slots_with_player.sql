-- Occupancy: show who booked each slot (name/username only, no phone)

drop function if exists public.get_occupied_slots(date);

create function public.get_occupied_slots(
  p_from_date date default (timezone('Europe/Istanbul', now()))::date
)
returns table (
  id uuid,
  court_id uuid,
  date date,
  start_hour int,
  end_hour int,
  status text,
  user_id uuid,
  player_name text,
  username text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.court_id,
    r.date,
    r.start_hour,
    r.end_hour,
    r.status,
    r.user_id,
    nullif(trim(both from concat_ws(' ', p.first_name, p.last_name)), '') as player_name,
    p.username
  from public.reservations r
  join public.profiles p on p.id = r.user_id
  where r.status in ('active', 'cancelled_late')
    and r.date >= p_from_date;
$$;

revoke all on function public.get_occupied_slots(date) from public;
grant execute on function public.get_occupied_slots(date) to authenticated;

comment on function public.get_occupied_slots(date) is
  'Occupied slots + booker display name/username (no phone/notes)';
