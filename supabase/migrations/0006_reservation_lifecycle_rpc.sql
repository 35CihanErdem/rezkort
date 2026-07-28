-- Reservation lifecycle hardening:
-- - enforce active+late-cancel slot blocking
-- - RPC-only style booking/cancel rules

-- Late cancellation keeps slot closed (not rebookable).
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'reservations_status_check'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations drop constraint reservations_status_check;
  end if;
end $$;

alter table public.reservations
  add constraint reservations_status_check
  check (status in ('active', 'cancelled', 'cancelled_late', 'completed', 'no_show'));

drop index if exists public.uq_reservations_active_slot;
create unique index uq_reservations_active_slot
  on public.reservations(court_id, date, start_hour)
  where status in ('active', 'cancelled_late');

-- Enforce RPC path for citizen inserts (staff/superadmin still can insert manually if needed).
drop policy if exists reservations_insert_self on public.reservations;
create policy reservations_insert_rpc_only
on public.reservations
for insert
to authenticated
with check (
  public.is_super_admin()
  or exists (
    select 1
    from public.courts c
    join public.facilities f on f.id = c.facility_id
    join public.staff_memberships sm on sm.municipality_id = f.municipality_id
    where c.id = reservations.court_id
      and sm.user_id = auth.uid()
      and sm.role in ('staff', 'admin')
      and sm.is_active = true
  )
);

create or replace function public.book_reservation(
  p_court_id uuid,
  p_date date,
  p_start_hour int,
  p_end_hour int,
  p_source text default 'mobile',
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

  if p_source not in ('mobile', 'admin', 'staff', 'qr') then
    raise exception 'INVALID_RESERVATION_SOURCE';
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
      reservation_source,
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
      p_source,
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

drop function if exists public.cancel_reservation(uuid, text);
create or replace function public.cancel_reservation(
  p_reservation_id uuid,
  p_reason text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_res public.reservations%rowtype;
  v_court public.courts%rowtype;
  v_facility public.facilities%rowtype;
  v_rule public.reservation_rules%rowtype;
  v_now_local timestamp := timezone('Europe/Istanbul', now());
  v_slot_start timestamp;
  v_remaining_minutes int;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into v_res
  from public.reservations
  where id = p_reservation_id
    and user_id = v_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'RESERVATION_NOT_FOUND_OR_NOT_ACTIVE';
  end if;

  select * into v_court from public.courts where id = v_res.court_id;
  select * into v_facility from public.facilities where id = v_court.facility_id;
  select * into v_rule from public.reservation_rules where municipality_id = v_facility.municipality_id;

  if not found then
    v_rule.minimum_remaining_minutes := 30;
  end if;

  v_slot_start := (v_res.date::timestamp + make_interval(hours => v_res.start_hour));
  v_remaining_minutes := floor(extract(epoch from (v_slot_start - v_now_local)) / 60);

  update public.reservations
  set
    status = case
      when v_remaining_minutes >= v_rule.minimum_remaining_minutes then 'cancelled'
      else 'cancelled_late'
    end,
    cancelled_at = now(),
    notes = coalesce(p_reason, notes),
    updated_at = now()
  where id = v_res.id
  returning * into v_res;

  return v_res;
end;
$$;

grant execute on function public.book_reservation(uuid, date, int, int, text, text) to authenticated;
grant execute on function public.cancel_reservation(uuid, text) to authenticated;
