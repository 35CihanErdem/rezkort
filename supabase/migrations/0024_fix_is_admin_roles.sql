-- is_admin() was narrowed to only super_admin in 0005; restore admin + super_admin.
-- App treats both as global admin for user management / RLS.

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
      and p.role = 'super_admin'
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
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
      and p.is_active = true
  );
$$;

-- staff helper: municipality staff OR global admin
create or replace function public.is_staff_of_municipality(m_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_memberships sm
    where sm.user_id = auth.uid()
      and sm.municipality_id = m_id
      and sm.is_active = true
  ) or public.is_admin();
$$;
