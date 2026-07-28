-- RezKort MVP + Belediye Pilotu schema
-- PostgreSQL / Supabase

create extension if not exists pgcrypto;

-- ---------------------------
-- Utilities
-- ---------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------
-- Core entities
-- ---------------------------

create table if not exists public.municipalities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  name text not null,
  district text not null,
  address text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (municipality_id, name)
);

create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  name text not null,
  surface_type text not null
    check (surface_type in ('hard', 'clay', 'acrylic')),
  has_lights boolean not null default false,
  reservation_duration int not null default 60
    check (reservation_duration in (30, 60, 90, 120)),
  description text,
  image_url text,
  status text not null default 'active'
    check (status in ('active', 'maintenance', 'inactive')),
  open_hour int not null check (open_hour between 0 and 23),
  close_hour int not null check (close_hour between 1 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (close_hour > open_hour),
  unique (facility_id, name)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null unique
    check (char_length(phone) between 10 and 15),
  email text not null unique,
  full_name text,
  username text unique,
  profile_photo_url text,
  role text not null default 'citizen'
    check (role in ('citizen', 'staff', 'admin')),
  phone_verified boolean not null default false,
  email_verified boolean not null default false,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bir kullanici birden fazla belediyede farkli staff rolleri alabilir.
create table if not exists public.staff_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete cascade,
  role text not null default 'staff'
    check (role in ('staff', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, municipality_id)
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  phone text not null,
  date date not null,
  start_hour int not null check (start_hour between 0 and 23),
  end_hour int not null check (end_hour between 1 and 24),
  status text not null default 'active'
    check (status in ('active', 'cancelled', 'completed', 'no_show')),
  checked_in boolean not null default false,
  check_in_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_hour > start_hour)
);

-- Geçmiş kaydı silmeden slotu tekrar satabilmek için partial unique index.
create unique index if not exists uq_reservations_active_slot
  on public.reservations(court_id, date, start_hour)
  where status = 'active';

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  start_hour int not null check (start_hour between 0 and 23),
  queue_order int not null check (queue_order > 0),
  status text not null default 'waiting'
    check (status in ('waiting', 'notified', 'expired')),
  created_at timestamptz not null default now()
);

-- Ayni kisi ayni slotta tek bir bekleme kaydina sahip olur.
create unique index if not exists uq_waitlist_slot_user
  on public.waitlist(court_id, date, start_hour, user_id);

-- Sadece "waiting" kayitlarda queue order benzersiz olsun.
create unique index if not exists uq_waitlist_active_queue
  on public.waitlist(court_id, date, start_hour, queue_order)
  where status = 'waiting';

create table if not exists public.penalties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  points int not null check (points > 0),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('android', 'ios', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservation_rules (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete cascade unique,
  max_active_reservations int not null default 1 check (max_active_reservations >= 1),
  max_days_ahead int not null default 7 check (max_days_ahead >= 1),
  cancel_before_minutes int not null default 120 check (cancel_before_minutes >= 0),
  no_show_limit int not null default 3 check (no_show_limit >= 1),
  ban_days int not null default 7 check (ban_days >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maintenance (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------
-- Indexes
-- ---------------------------

create index if not exists idx_facilities_municipality
  on public.facilities(municipality_id);

create index if not exists idx_courts_facility_status
  on public.courts(facility_id, status);

create index if not exists idx_profiles_role_active
  on public.profiles(role, is_active);

create index if not exists idx_reservations_user_status_date
  on public.reservations(user_id, status, date desc);

create index if not exists idx_reservations_court_date_status
  on public.reservations(court_id, date, status);

create index if not exists idx_reservations_date_status
  on public.reservations(date, status);

create index if not exists idx_waitlist_lookup
  on public.waitlist(court_id, date, start_hour, status, queue_order);

create index if not exists idx_penalties_user_active
  on public.penalties(user_id, is_active, expires_at);

create index if not exists idx_notifications_user_read_created
  on public.notifications(user_id, is_read, created_at desc);

create index if not exists idx_staff_memberships_user
  on public.staff_memberships(user_id, is_active);

create index if not exists idx_staff_memberships_municipality
  on public.staff_memberships(municipality_id, is_active);

-- ---------------------------
-- Triggers
-- ---------------------------

drop trigger if exists trg_facilities_updated_at on public.facilities;
create trigger trg_facilities_updated_at
before update on public.facilities
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_courts_updated_at on public.courts;
create trigger trg_courts_updated_at
before update on public.courts
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_staff_memberships_updated_at on public.staff_memberships;
create trigger trg_staff_memberships_updated_at
before update on public.staff_memberships
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_reservations_updated_at on public.reservations;
create trigger trg_reservations_updated_at
before update on public.reservations
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_devices_updated_at on public.devices;
create trigger trg_devices_updated_at
before update on public.devices
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_reservation_rules_updated_at on public.reservation_rules;
create trigger trg_reservation_rules_updated_at
before update on public.reservation_rules
for each row execute procedure public.set_updated_at();
