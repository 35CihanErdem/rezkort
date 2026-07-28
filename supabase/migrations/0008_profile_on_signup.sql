-- Auto-create profile on auth.users insert (bypasses RLS via security definer)
-- Fixes: new row violates row-level security policy for table "profiles"

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), '');
  v_first text := nullif(trim(coalesce(new.raw_user_meta_data->>'first_name', '')), '');
  v_last text := nullif(trim(coalesce(new.raw_user_meta_data->>'last_name', '')), '');
  v_username text := nullif(trim(lower(coalesce(new.raw_user_meta_data->>'username', ''))), '');
begin
  -- Metadata yoksa placeholder; uygulamadan mutlaka gelmeli.
  if v_phone is null then
    v_phone := '+900000000000';
  end if;
  if v_first is null then
    v_first := 'Kullanıcı';
  end if;
  if v_last is null then
    v_last := 'Yeni';
  end if;
  if v_username is null then
    v_username := replace(coalesce(new.id::text, 'user'), '-', '');
  end if;

  insert into public.profiles (
    id,
    phone,
    email,
    first_name,
    last_name,
    username,
    role,
    phone_verified,
    email_verified,
    is_active
  )
  values (
    new.id,
    v_phone,
    coalesce(new.email, ''),
    v_first,
    v_last,
    v_username,
    'citizen',
    coalesce((new.raw_user_meta_data->>'phone_verified')::boolean, true),
    true,
    true
  )
  on conflict (id) do update set
    phone = excluded.phone,
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    username = excluded.username,
    phone_verified = excluded.phone_verified,
    email_verified = excluded.email_verified,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Client-side fallback: kendi profilini security definer ile yazar
create or replace function public.upsert_own_profile(
  p_phone text,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_username text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.profiles;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  insert into public.profiles (
    id,
    phone,
    email,
    first_name,
    last_name,
    username,
    role,
    phone_verified,
    email_verified,
    is_active
  )
  values (
    v_uid,
    p_phone,
    p_email,
    p_first_name,
    p_last_name,
    lower(p_username),
    'citizen',
    true,
    true,
    true
  )
  on conflict (id) do update set
    phone = excluded.phone,
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    username = excluded.username,
    phone_verified = true,
    email_verified = true,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.upsert_own_profile(text, text, text, text, text) from public;
grant execute on function public.upsert_own_profile(text, text, text, text, text) to authenticated;
