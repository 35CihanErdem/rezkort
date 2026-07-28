-- Enforce booking rules at DB level:
-- 1) Slot availability
-- 2) User max active reservations per municipality rule
-- 3) Past time cannot be booked

create or replace function public.book_reservation(
  p_court_id uuid,
  p_date date,
  p_start_hour int,
  p_end_hour int,
  p_notes text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_court public.courts%rowtype;
  v_facility public.facilities%rowtype;
  v_rule public.reservation_rules%rowtype;
  v_now_local timestamp := timezone('Europe/Istanbul', now());
  v_active_count int;
  v_reservation public.reservations%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_start_hour < 0 or p_start_hour > 23 then
    raise exception 'INVALID_START_HOUR';
  end if;
  if p_end_hour < 1 or p_end_hour > 24 or p_end_hour <= p_start_hour then
    raise exception 'INVALID_END_HOUR';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id
    and is_active = true;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  select *
  into v_court
  from public.courts
  where id = p_court_id
    and status = 'active';

  if not found then
    raise exception 'COURT_NOT_AVAILABLE';
  end if;

  if p_start_hour < v_court.open_hour
     or p_end_hour > v_court.close_hour then
    raise exception 'OUTSIDE_WORKING_HOURS';
  end if;

  select *
  into v_facility
  from public.facilities
  where id = v_court.facility_id;

  if not found then
    raise exception 'FACILITY_NOT_FOUND';
  end if;

  select *
  into v_rule
  from public.reservation_rules
  where municipality_id = v_facility.municipality_id;

  -- Fallback defaults if rule is missing.
  if not found then
    v_rule.max_active_reservations := 1;
    v_rule.max_days_ahead := 7;
  end if;

  if p_date < date(v_now_local)
     or (p_date = date(v_now_local) and p_start_hour <= extract(hour from v_now_local)::int) then
    raise exception 'PAST_SLOT_NOT_ALLOWED';
  end if;

  if p_date > date(v_now_local) + v_rule.max_days_ahead then
    raise exception 'TOO_FAR_IN_FUTURE';
  end if;

  -- Per-user lock to avoid race conditions.
  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  select count(*)
  into v_active_count
  from public.reservations r
  where r.user_id = v_user_id
    and r.status = 'active'
    and (
      r.date > date(v_now_local)
      or (r.date = date(v_now_local) and r.end_hour > extract(hour from v_now_local)::int)
    );

  if v_active_count >= v_rule.max_active_reservations then
    raise exception 'ACTIVE_RESERVATION_LIMIT_REACHED';
  end if;

  begin
    insert into public.reservations (
      court_id,
      user_id,
      phone,
      date,
      start_hour,
      end_hour,
      status,
      notes
    )
    values (
      p_court_id,
      v_user_id,
      v_profile.phone,
      p_date,
      p_start_hour,
      p_end_hour,
      'active',
      p_notes
    )
    returning *
    into v_reservation;
  exception
    when unique_violation then
      raise exception 'SLOT_ALREADY_BOOKED';
  end;

  return v_reservation;
end;
$$;

grant execute on function public.book_reservation(uuid, date, int, int, text) to authenticated;
