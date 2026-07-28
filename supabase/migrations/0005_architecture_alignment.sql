-- RezKort architecture alignment (multi-tenant + production hardening)
-- Applies after 0001/0002/0004

-- ---------------------------
-- Profiles: role model + name split + phone format
-- ---------------------------

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

-- Keep backward compatibility with existing full_name while populating split names.
update public.profiles
set
  first_name = coalesce(first_name, split_part(full_name, ' ', 1)),
  last_name = coalesce(last_name, nullif(trim(replace(full_name, split_part(full_name, ' ', 1), '')), ''))
where full_name is not null;

alter table public.profiles
  alter column first_name set not null,
  alter column last_name set not null;

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
  check (role in ('citizen', 'staff', 'admin', 'super_admin'));

-- Normalize/validate as E.164-like (+90...) format.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'profiles_phone_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles drop constraint profiles_phone_check;
  end if;
end $$;

alter table public.profiles
  add constraint profiles_phone_check
  check (phone ~ '^\+[1-9][0-9]{9,14}$');

-- ---------------------------
-- Reservations / waitlist / penalties / devices / rules
-- ---------------------------

alter table public.reservations
  add column if not exists reservation_source text not null default 'mobile';

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'reservations_reservation_source_check'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations drop constraint reservations_reservation_source_check;
  end if;
end $$;

alter table public.reservations
  add constraint reservations_reservation_source_check
  check (reservation_source in ('mobile', 'admin', 'staff', 'qr'));

alter table public.waitlist
  add column if not exists notified_at timestamptz;

alter table public.penalties
  add column if not exists reservation_id uuid references public.reservations(id) on delete set null;

alter table public.devices
  add column if not exists last_seen_at timestamptz;

alter table public.reservation_rules
  add column if not exists minimum_remaining_minutes int not null default 30
    check (minimum_remaining_minutes >= 0);

-- Notifications type hardening
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'notifications_type_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications drop constraint notifications_type_check;
  end if;
end $$;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('reservation', 'penalty', 'system', 'promotion'));

-- Optional audit metadata
alter table public.audit_logs
  add column if not exists ip_address text,
  add column if not exists user_agent text;

-- ---------------------------
-- Helper functions for RLS
-- ---------------------------

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
      and p.is_active = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.is_super_admin();
$$;

create or replace function public.is_staff_of_municipality(m_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.staff_memberships sm
    where sm.user_id = auth.uid()
      and sm.municipality_id = m_id
      and sm.is_active = true
  ) or public.is_super_admin();
$$;

-- ---------------------------
-- Index improvements
-- ---------------------------

create index if not exists idx_waitlist_user_status_created
  on public.waitlist(user_id, status, created_at desc);

create index if not exists idx_devices_user_last_seen
  on public.devices(user_id, last_seen_at desc);

create index if not exists idx_reservations_user_active_window
  on public.reservations(user_id, status, date, end_hour);

