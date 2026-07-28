-- RezKort RLS policies

-- ---------------------------
-- Helpers
-- ---------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  );
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
  ) or public.is_admin();
$$;

-- ---------------------------
-- Enable RLS
-- ---------------------------

alter table public.municipalities enable row level security;
alter table public.facilities enable row level security;
alter table public.courts enable row level security;
alter table public.profiles enable row level security;
alter table public.staff_memberships enable row level security;
alter table public.reservations enable row level security;
alter table public.waitlist enable row level security;
alter table public.penalties enable row level security;
alter table public.notifications enable row level security;
alter table public.devices enable row level security;
alter table public.reservation_rules enable row level security;
alter table public.maintenance enable row level security;
alter table public.audit_logs enable row level security;

-- ---------------------------
-- municipalities
-- ---------------------------

drop policy if exists municipalities_read_all on public.municipalities;
create policy municipalities_read_all
on public.municipalities
for select
to authenticated
using (true);

drop policy if exists municipalities_admin_write on public.municipalities;
create policy municipalities_admin_write
on public.municipalities
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------
-- facilities
-- ---------------------------

drop policy if exists facilities_read_all on public.facilities;
create policy facilities_read_all
on public.facilities
for select
to authenticated
using (true);

drop policy if exists facilities_staff_write on public.facilities;
create policy facilities_staff_write
on public.facilities
for all
to authenticated
using (public.is_staff_of_municipality(municipality_id))
with check (public.is_staff_of_municipality(municipality_id));

-- ---------------------------
-- courts
-- ---------------------------

drop policy if exists courts_read_all on public.courts;
create policy courts_read_all
on public.courts
for select
to authenticated
using (true);

drop policy if exists courts_staff_write on public.courts;
create policy courts_staff_write
on public.courts
for all
to authenticated
using (
  exists (
    select 1
    from public.facilities f
    where f.id = courts.facility_id
      and public.is_staff_of_municipality(f.municipality_id)
  )
)
with check (
  exists (
    select 1
    from public.facilities f
    where f.id = courts.facility_id
      and public.is_staff_of_municipality(f.municipality_id)
  )
);

-- ---------------------------
-- profiles
-- ---------------------------

drop policy if exists profiles_read_self_or_admin on public.profiles;
create policy profiles_read_self_or_admin
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- ---------------------------
-- staff_memberships
-- ---------------------------

drop policy if exists staff_memberships_read_admin_or_self on public.staff_memberships;
create policy staff_memberships_read_admin_or_self
on public.staff_memberships
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists staff_memberships_admin_write on public.staff_memberships;
create policy staff_memberships_admin_write
on public.staff_memberships
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------
-- reservations
-- ---------------------------

drop policy if exists reservations_read_self_or_staff on public.reservations;
create policy reservations_read_self_or_staff
on public.reservations
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.courts c
    join public.facilities f on f.id = c.facility_id
    where c.id = reservations.court_id
      and public.is_staff_of_municipality(f.municipality_id)
  )
);

drop policy if exists reservations_insert_self on public.reservations;
create policy reservations_insert_self
on public.reservations
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists reservations_update_self_or_staff on public.reservations;
create policy reservations_update_self_or_staff
on public.reservations
for update
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.courts c
    join public.facilities f on f.id = c.facility_id
    where c.id = reservations.court_id
      and public.is_staff_of_municipality(f.municipality_id)
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.courts c
    join public.facilities f on f.id = c.facility_id
    where c.id = reservations.court_id
      and public.is_staff_of_municipality(f.municipality_id)
  )
);

-- ---------------------------
-- waitlist
-- ---------------------------

drop policy if exists waitlist_read_self_or_staff on public.waitlist;
create policy waitlist_read_self_or_staff
on public.waitlist
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.courts c
    join public.facilities f on f.id = c.facility_id
    where c.id = waitlist.court_id
      and public.is_staff_of_municipality(f.municipality_id)
  )
);

drop policy if exists waitlist_insert_self on public.waitlist;
create policy waitlist_insert_self
on public.waitlist
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists waitlist_update_self_or_staff on public.waitlist;
create policy waitlist_update_self_or_staff
on public.waitlist
for update
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.courts c
    join public.facilities f on f.id = c.facility_id
    where c.id = waitlist.court_id
      and public.is_staff_of_municipality(f.municipality_id)
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.courts c
    join public.facilities f on f.id = c.facility_id
    where c.id = waitlist.court_id
      and public.is_staff_of_municipality(f.municipality_id)
  )
);

-- ---------------------------
-- penalties / notifications / devices
-- ---------------------------

drop policy if exists penalties_read_self_or_staff on public.penalties;
create policy penalties_read_self_or_staff
on public.penalties
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists penalties_admin_write on public.penalties;
create policy penalties_admin_write
on public.penalties
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists notifications_read_self on public.notifications;
create policy notifications_read_self
on public.notifications
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_write_self_or_admin on public.notifications;
create policy notifications_write_self_or_admin
on public.notifications
for all
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists devices_read_self on public.devices;
create policy devices_read_self
on public.devices
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists devices_write_self on public.devices;
create policy devices_write_self
on public.devices
for all
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- ---------------------------
-- reservation_rules / maintenance
-- ---------------------------

drop policy if exists reservation_rules_read_all on public.reservation_rules;
create policy reservation_rules_read_all
on public.reservation_rules
for select
to authenticated
using (true);

drop policy if exists reservation_rules_staff_write on public.reservation_rules;
create policy reservation_rules_staff_write
on public.reservation_rules
for all
to authenticated
using (public.is_staff_of_municipality(municipality_id))
with check (public.is_staff_of_municipality(municipality_id));

drop policy if exists maintenance_read_all on public.maintenance;
create policy maintenance_read_all
on public.maintenance
for select
to authenticated
using (true);

drop policy if exists maintenance_staff_write on public.maintenance;
create policy maintenance_staff_write
on public.maintenance
for all
to authenticated
using (
  exists (
    select 1
    from public.courts c
    join public.facilities f on f.id = c.facility_id
    where c.id = maintenance.court_id
      and public.is_staff_of_municipality(f.municipality_id)
  )
)
with check (
  exists (
    select 1
    from public.courts c
    join public.facilities f on f.id = c.facility_id
    where c.id = maintenance.court_id
      and public.is_staff_of_municipality(f.municipality_id)
  )
);

-- ---------------------------
-- audit_logs
-- ---------------------------

drop policy if exists audit_logs_read_admin on public.audit_logs;
create policy audit_logs_read_admin
on public.audit_logs
for select
to authenticated
using (public.is_admin());

drop policy if exists audit_logs_insert_service_role on public.audit_logs;
create policy audit_logs_insert_service_role
on public.audit_logs
for insert
to authenticated
with check (auth.role() = 'service_role');
