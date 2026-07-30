-- ============================================================
-- 0027: Role model (is_super_admin), membership dates, rules,
--        audit helpers, admin lifecycle RPCs, auto-complete
-- DATABASE FREEZE after this migration (no new tables unless critical)
-- ============================================================

-- ---------------------------
-- 1) Super admin as system flag
-- ---------------------------

alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

update public.profiles
set is_super_admin = true
where role = 'super_admin';

-- Move profile-level staff/admin into memberships (first municipality as fallback)
insert into public.staff_memberships (user_id, municipality_id, role, is_active)
select
  p.id,
  m.id,
  case when p.role = 'admin' then 'admin' else 'staff' end,
  true
from public.profiles p
cross join lateral (
  select id from public.municipalities order by created_at asc limit 1
) m
where p.role in ('staff', 'admin')
  and not exists (
    select 1
    from public.staff_memberships sm
    where sm.user_id = p.id
      and sm.municipality_id = m.id
  );

update public.profiles
set role = 'citizen'
where role in ('staff', 'admin', 'super_admin');

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role = 'citizen');

-- ---------------------------
-- 2) Temporary staff assignments
-- ---------------------------

alter table public.staff_memberships
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

comment on column public.staff_memberships.starts_at is
  'Görev başlangıcı; null = hemen aktif';
comment on column public.staff_memberships.ends_at is
  'Görev bitişi; null = süresiz';

-- Auth helpers BEFORE policies that depend on them
create or replace function public.is_membership_currently_active(sm public.staff_memberships)
returns boolean
language sql
stable
as $$
  select sm.is_active
    and (sm.starts_at is null or sm.starts_at <= now())
    and (sm.ends_at is null or sm.ends_at > now());
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_super_admin = true
      and p.is_active = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.staff_memberships sm
      where sm.user_id = auth.uid()
        and sm.role = 'admin'
        and public.is_membership_currently_active(sm)
    );
$$;

create or replace function public.is_staff_of_municipality(m_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.staff_memberships sm
      where sm.user_id = auth.uid()
        and sm.municipality_id = m_id
        and sm.role in ('staff', 'admin')
        and public.is_membership_currently_active(sm)
    );
$$;

create or replace function public.can_access_admin_panel()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.staff_memberships sm
      where sm.user_id = auth.uid()
        and sm.role in ('staff', 'admin')
        and public.is_membership_currently_active(sm)
    );
$$;

grant execute on function public.can_access_admin_panel() to authenticated;

-- ---------------------------
-- 3) Facilities soft status (no hard delete)
-- ---------------------------

alter table public.facilities
  add column if not exists status text not null default 'active';

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'facilities_status_check'
      and conrelid = 'public.facilities'::regclass
  ) then
    alter table public.facilities drop constraint facilities_status_check;
  end if;
end $$;

alter table public.facilities
  add constraint facilities_status_check
  check (status in ('active', 'maintenance', 'inactive'));

-- ---------------------------
-- 4) Reservation rules expansion
-- ---------------------------

alter table public.reservation_rules
  add column if not exists late_join_minutes int,
  add column if not exists minimum_remaining_minutes int,
  add column if not exists allow_waitlist boolean not null default false,
  add column if not exists allow_qr_checkin boolean not null default false,
  add column if not exists allow_same_day_booking boolean not null default true,
  add column if not exists booking_open_hour int,
  add column if not exists booking_close_hour int;

update public.reservation_rules
set
  late_join_minutes = coalesce(late_join_minutes, 30),
  minimum_remaining_minutes = coalesce(minimum_remaining_minutes, 30),
  booking_open_hour = coalesce(booking_open_hour, 8),
  booking_close_hour = coalesce(booking_close_hour, 22);

alter table public.reservation_rules
  alter column late_join_minutes set default 30,
  alter column late_join_minutes set not null,
  alter column minimum_remaining_minutes set default 30,
  alter column minimum_remaining_minutes set not null,
  alter column booking_open_hour set default 8,
  alter column booking_open_hour set not null,
  alter column booking_close_hour set default 22,
  alter column booking_close_hour set not null;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'reservation_rules_booking_hours_check'
      and conrelid = 'public.reservation_rules'::regclass
  ) then
    alter table public.reservation_rules drop constraint reservation_rules_booking_hours_check;
  end if;
end $$;

alter table public.reservation_rules
  add constraint reservation_rules_booking_hours_check
  check (
    booking_open_hour between 0 and 23
    and booking_close_hour between 1 and 24
    and booking_close_hour > booking_open_hour
  );

-- ---------------------------
-- 5) Audit logs: municipality + RLS read for staff
-- ---------------------------

alter table public.audit_logs
  add column if not exists municipality_id uuid references public.municipalities(id) on delete set null;

create index if not exists idx_audit_logs_created
  on public.audit_logs (created_at desc);

create index if not exists idx_audit_logs_municipality
  on public.audit_logs (municipality_id, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_read_staff on public.audit_logs;
create policy audit_logs_read_staff
on public.audit_logs
for select
to authenticated
using (
  public.is_super_admin()
  or (
    municipality_id is not null
    and public.is_staff_of_municipality(municipality_id)
  )
  or actor_user_id = auth.uid()
);

-- ---------------------------
-- 7) write_audit_log
-- ---------------------------

create or replace function public.write_audit_log(
  p_action text,
  p_entity text,
  p_entity_id uuid default null,
  p_municipality_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns public.audit_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.audit_logs%rowtype;
begin
  insert into public.audit_logs (
    actor_user_id,
    action,
    entity,
    entity_id,
    municipality_id,
    payload
  )
  values (
    auth.uid(),
    p_action,
    p_entity,
    p_entity_id,
    p_municipality_id,
    coalesce(p_payload, '{}'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.write_audit_log(text, text, uuid, uuid, jsonb) to authenticated;

-- ---------------------------
-- 8) Staff assign / remove (no is_super_admin via UI)
-- ---------------------------

create or replace function public.assign_staff_membership(
  p_user_id uuid,
  p_municipality_id uuid,
  p_role text,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null
)
returns public.staff_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.staff_memberships%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_role not in ('staff', 'admin') then
    raise exception 'INVALID_STAFF_ROLE';
  end if;

  -- Super admin OR municipality admin
  if not (
    public.is_super_admin()
    or exists (
      select 1 from public.staff_memberships sm
      where sm.user_id = auth.uid()
        and sm.municipality_id = p_municipality_id
        and sm.role = 'admin'
        and public.is_membership_currently_active(sm)
    )
  ) then
    raise exception 'FORBIDDEN';
  end if;

  insert into public.staff_memberships (
    user_id, municipality_id, role, is_active, starts_at, ends_at
  )
  values (
    p_user_id, p_municipality_id, p_role, true, p_starts_at, p_ends_at
  )
  on conflict (user_id, municipality_id) do update
    set role = excluded.role,
        is_active = true,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at,
        updated_at = now()
  returning * into v_row;

  perform public.write_audit_log(
    'staff.assign',
    'staff_memberships',
    v_row.id,
    p_municipality_id,
    jsonb_build_object(
      'user_id', p_user_id,
      'role', p_role,
      'starts_at', p_starts_at,
      'ends_at', p_ends_at
    )
  );

  return v_row;
end;
$$;

create or replace function public.deactivate_staff_membership(
  p_membership_id uuid
)
returns public.staff_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.staff_memberships%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_row
  from public.staff_memberships
  where id = p_membership_id
  for update;

  if not found then
    raise exception 'MEMBERSHIP_NOT_FOUND';
  end if;

  if not (
    public.is_super_admin()
    or exists (
      select 1 from public.staff_memberships sm
      where sm.user_id = auth.uid()
        and sm.municipality_id = v_row.municipality_id
        and sm.role = 'admin'
        and public.is_membership_currently_active(sm)
    )
  ) then
    raise exception 'FORBIDDEN';
  end if;

  update public.staff_memberships
  set is_active = false, updated_at = now()
  where id = p_membership_id
  returning * into v_row;

  perform public.write_audit_log(
    'staff.deactivate',
    'staff_memberships',
    v_row.id,
    v_row.municipality_id,
    jsonb_build_object('user_id', v_row.user_id, 'role', v_row.role)
  );

  return v_row;
end;
$$;

grant execute on function public.assign_staff_membership(uuid, uuid, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.deactivate_staff_membership(uuid) to authenticated;

-- ---------------------------
-- 9) Admin reservation ops
-- ---------------------------

create or replace function public.admin_cancel_reservation(
  p_reservation_id uuid,
  p_reason text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations%rowtype;
  v_facility public.facilities%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select r.* into v_res
  from public.reservations r
  where r.id = p_reservation_id and r.status = 'active'
  for update;

  if not found then raise exception 'RESERVATION_NOT_FOUND_OR_NOT_ACTIVE'; end if;

  select f.* into v_facility
  from public.courts c
  join public.facilities f on f.id = c.facility_id
  where c.id = v_res.court_id;

  if not public.is_staff_of_municipality(v_facility.municipality_id) then
    raise exception 'FORBIDDEN';
  end if;

  update public.reservations
  set status = 'cancelled',
      cancelled_at = now(),
      notes = coalesce(p_reason, notes),
      updated_at = now()
  where id = v_res.id
  returning * into v_res;

  perform public.write_audit_log(
    'reservation.cancel',
    'reservations',
    v_res.id,
    v_facility.municipality_id,
    jsonb_build_object('reason', p_reason)
  );

  return v_res;
end;
$$;

create or replace function public.admin_check_in_reservation(p_reservation_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations%rowtype;
  v_facility public.facilities%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select r.* into v_res
  from public.reservations r
  where r.id = p_reservation_id and r.status = 'active'
  for update;

  if not found then raise exception 'RESERVATION_NOT_FOUND_OR_NOT_ACTIVE'; end if;

  select f.* into v_facility
  from public.courts c
  join public.facilities f on f.id = c.facility_id
  where c.id = v_res.court_id;

  if not public.is_staff_of_municipality(v_facility.municipality_id) then
    raise exception 'FORBIDDEN';
  end if;

  update public.reservations
  set checked_in = true,
      check_in_at = now(),
      updated_at = now()
  where id = v_res.id
  returning * into v_res;

  perform public.write_audit_log(
    'reservation.check_in',
    'reservations',
    v_res.id,
    v_facility.municipality_id,
    '{}'::jsonb
  );

  return v_res;
end;
$$;

create or replace function public.admin_mark_no_show(p_reservation_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations%rowtype;
  v_facility public.facilities%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select r.* into v_res
  from public.reservations r
  where r.id = p_reservation_id and r.status = 'active'
  for update;

  if not found then raise exception 'RESERVATION_NOT_FOUND_OR_NOT_ACTIVE'; end if;

  select f.* into v_facility
  from public.courts c
  join public.facilities f on f.id = c.facility_id
  where c.id = v_res.court_id;

  if not public.is_staff_of_municipality(v_facility.municipality_id) then
    raise exception 'FORBIDDEN';
  end if;

  update public.reservations
  set status = 'no_show',
      updated_at = now()
  where id = v_res.id
  returning * into v_res;

  perform public.write_audit_log(
    'reservation.no_show',
    'reservations',
    v_res.id,
    v_facility.municipality_id,
    '{}'::jsonb
  );

  return v_res;
end;
$$;

create or replace function public.admin_complete_reservation(p_reservation_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations%rowtype;
  v_facility public.facilities%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select r.* into v_res
  from public.reservations r
  where r.id = p_reservation_id and r.status = 'active'
  for update;

  if not found then raise exception 'RESERVATION_NOT_FOUND_OR_NOT_ACTIVE'; end if;

  select f.* into v_facility
  from public.courts c
  join public.facilities f on f.id = c.facility_id
  where c.id = v_res.court_id;

  if not public.is_staff_of_municipality(v_facility.municipality_id) then
    raise exception 'FORBIDDEN';
  end if;

  update public.reservations
  set status = 'completed',
      completed_at = now(),
      updated_at = now()
  where id = v_res.id
  returning * into v_res;

  perform public.write_audit_log(
    'reservation.complete',
    'reservations',
    v_res.id,
    v_facility.municipality_id,
    '{}'::jsonb
  );

  return v_res;
end;
$$;

-- Auto-complete past slots (call from cron / admin dashboard refresh)
create or replace function public.complete_due_reservations()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now_local timestamp := timezone('Europe/Istanbul', now());
  v_count int;
begin
  with updated as (
    update public.reservations r
    set status = 'completed',
        completed_at = now(),
        updated_at = now()
    where r.status = 'active'
      and (r.date::timestamp + make_interval(hours => r.end_hour)) <= v_now_local
    returning r.id
  )
  select count(*)::int into v_count from updated;

  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.admin_cancel_reservation(uuid, text) to authenticated;
grant execute on function public.admin_check_in_reservation(uuid) to authenticated;
grant execute on function public.admin_mark_no_show(uuid) to authenticated;
grant execute on function public.admin_complete_reservation(uuid) to authenticated;
grant execute on function public.complete_due_reservations() to authenticated;

-- ---------------------------
-- 10) Dashboard stats RPC
-- ---------------------------

create or replace function public.admin_dashboard_stats(p_municipality_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('Europe/Istanbul', now()))::date;
  v_bookings int;
  v_active_courts int;
  v_slots int;
  v_occupied int;
  v_waitlist int;
  v_no_shows int;
begin
  if not public.can_access_admin_panel() then
    raise exception 'FORBIDDEN';
  end if;

  if p_municipality_id is not null
     and not public.is_staff_of_municipality(p_municipality_id)
     and not public.is_super_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select count(*)::int into v_bookings
  from public.reservations r
  join public.courts c on c.id = r.court_id
  join public.facilities f on f.id = c.facility_id
  where r.date = v_today
    and r.status in ('active', 'completed', 'no_show', 'cancelled', 'cancelled_late')
    and (p_municipality_id is null or f.municipality_id = p_municipality_id)
    and (p_municipality_id is not null or public.is_super_admin() or public.is_staff_of_municipality(f.municipality_id));

  select count(*)::int into v_active_courts
  from public.courts c
  join public.facilities f on f.id = c.facility_id
  where c.status = 'active'
    and coalesce(f.status, 'active') = 'active'
    and (p_municipality_id is null or f.municipality_id = p_municipality_id)
    and (p_municipality_id is not null or public.is_super_admin() or public.is_staff_of_municipality(f.municipality_id));

  select
    coalesce(sum(greatest(c.close_hour - c.open_hour, 0)), 0)::int,
    coalesce(sum(
      case when r.id is not null then 1 else 0 end
    ), 0)::int
  into v_slots, v_occupied
  from public.courts c
  join public.facilities f on f.id = c.facility_id
  left join public.reservations r
    on r.court_id = c.id
   and r.date = v_today
   and r.status in ('active', 'completed', 'no_show', 'cancelled_late')
  where c.status = 'active'
    and (p_municipality_id is null or f.municipality_id = p_municipality_id)
    and (p_municipality_id is not null or public.is_super_admin() or public.is_staff_of_municipality(f.municipality_id));

  select count(*)::int into v_waitlist
  from public.waitlist w
  join public.courts c on c.id = w.court_id
  join public.facilities f on f.id = c.facility_id
  where w.status = 'waiting'
    and (p_municipality_id is null or f.municipality_id = p_municipality_id)
    and (p_municipality_id is not null or public.is_super_admin() or public.is_staff_of_municipality(f.municipality_id));

  select count(*)::int into v_no_shows
  from public.reservations r
  join public.courts c on c.id = r.court_id
  join public.facilities f on f.id = c.facility_id
  where r.date = v_today
    and r.status = 'no_show'
    and (p_municipality_id is null or f.municipality_id = p_municipality_id)
    and (p_municipality_id is not null or public.is_super_admin() or public.is_staff_of_municipality(f.municipality_id));

  return jsonb_build_object(
    'today_bookings', coalesce(v_bookings, 0),
    'active_courts', coalesce(v_active_courts, 0),
    'occupancy_pct', case
      when coalesce(v_slots, 0) = 0 then 0
      else round((coalesce(v_occupied, 0)::numeric / v_slots::numeric) * 100, 1)
    end,
    'waitlist_waiting', coalesce(v_waitlist, 0),
    'today_no_shows', coalesce(v_no_shows, 0)
  );
end;
$$;

grant execute on function public.admin_dashboard_stats(uuid) to authenticated;
