-- Late-join tolerance for same-day slots that already started.
-- Example: 20:00–21:00 + late_join_minutes=30 → book until 20:30:00 inclusive; 20:30:01 blocked.
-- End hour never extends — remaining play time is whatever is left until end_hour.

alter table public.reservation_rules
  add column if not exists late_join_minutes int not null default 30
    check (late_join_minutes >= 0);

comment on column public.reservation_rules.late_join_minutes is
  'Slot başladıktan sonra kaç dakika geç kalınarak hâlâ rezervasyon alınabilir. Tek tolerans alanı.';

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
  v_slot_start timestamp;
  v_slot_end timestamp;
  v_latest_join timestamp;
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
    v_rule.late_join_minutes := 30;
  end if;

  v_slot_start := (p_date::timestamp + make_interval(hours => p_start_hour));
  v_slot_end := (p_date::timestamp + make_interval(hours => p_end_hour));
  v_latest_join := v_slot_start + make_interval(mins => coalesce(v_rule.late_join_minutes, 30));

  if p_date < date(v_now_local) then
    raise exception 'PAST_SLOT_NOT_ALLOWED';
  end if;

  if p_date = date(v_now_local) then
    -- Slot tamamen bittiyse asla
    if v_now_local >= v_slot_end then
      raise exception 'PAST_SLOT_NOT_ALLOWED';
    end if;

    -- Henüz başlamadıysa OK; başladıysa late_join penceresi içinde olmalı
    -- (bitiş saati uzamaz; kalan süre ne kadarsa o kadar oynar)
    if v_now_local > v_latest_join then
      raise exception 'LATE_JOIN_WINDOW_CLOSED';
    end if;
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
      or (
        r.date = date(v_now_local)
        and (r.date::timestamp + make_interval(hours => r.end_hour)) > v_now_local
      )
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
    returning * into v_reservation;
  exception
    when unique_violation then
      raise exception 'SLOT_ALREADY_BOOKED';
  end;

  return v_reservation;
end;
$$;

-- Super admin her belediyenin kurallarını yazabilsin
drop policy if exists reservation_rules_staff_write on public.reservation_rules;
create policy reservation_rules_staff_write
on public.reservation_rules
for all
to authenticated
using (
  public.is_staff_of_municipality(municipality_id)
  or public.is_super_admin()
)
with check (
  public.is_staff_of_municipality(municipality_id)
  or public.is_super_admin()
);
