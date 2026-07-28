-- full_name sync + harden profile writers

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
  v_full text;
begin
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

  v_full := trim(v_first || ' ' || v_last);

  insert into public.profiles (
    id,
    phone,
    email,
    full_name,
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
    v_full,
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
    full_name = excluded.full_name,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    username = excluded.username,
    phone_verified = excluded.phone_verified,
    email_verified = excluded.email_verified,
    updated_at = now();

  return new;
end;
$$;

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
  v_full text := trim(p_first_name || ' ' || p_last_name);
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  insert into public.profiles (
    id,
    phone,
    email,
    full_name,
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
    v_full,
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
    full_name = excluded.full_name,
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

-- Mevcut kayıtlarda full_name boşsa doldur
update public.profiles
set full_name = trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
where full_name is null
   or btrim(full_name) = '';
