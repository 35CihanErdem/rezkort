-- Table privileges + signup/login helpers
-- "permission denied for table profiles" genellikle GRANT eksikliğinden gelir.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant all on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant all on tables to service_role;

-- Anonim kullanıcı tüm profil satırlarını okumasın; sadece availability/login helper.
revoke select on public.profiles from anon;

-- ---------------------------
-- Signup availability check
-- ---------------------------
create or replace function public.check_signup_availability(
  p_phone text,
  p_email text,
  p_username text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone_taken boolean;
  v_email_taken boolean;
  v_username_taken boolean;
begin
  select exists(
    select 1 from public.profiles where phone = p_phone
  ) into v_phone_taken;

  select exists(
    select 1 from public.profiles where lower(email) = lower(p_email)
  ) into v_email_taken;

  select exists(
    select 1
    from public.profiles
    where p_username is not null
      and username = lower(p_username)
  ) into v_username_taken;

  return jsonb_build_object(
    'phone_taken', v_phone_taken,
    'email_taken', v_email_taken,
    'username_taken', v_username_taken
  );
end;
$$;

revoke all on function public.check_signup_availability(text, text, text) from public;
grant execute on function public.check_signup_availability(text, text, text) to anon, authenticated;

-- ---------------------------
-- Login identifier -> email
-- ---------------------------
create or replace function public.resolve_login_email(p_identifier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw text := trim(p_identifier);
  v_email text;
  v_phone text;
  v_username text;
begin
  if v_raw = '' then
    return null;
  end if;

  -- Email gibi görünüyorsa
  if position('@' in v_raw) > 0 then
    select email into v_email
    from public.profiles
    where lower(email) = lower(v_raw)
    limit 1;
    return v_email;
  end if;

  -- Telefon normalize (TR): 05xx / 5xx / +905xx -> +905xx
  v_phone := regexp_replace(v_raw, '\D', '', 'g');
  if left(v_phone, 2) = '90' and length(v_phone) = 12 then
    v_phone := '+' || v_phone;
  elsif left(v_phone, 1) = '0' and length(v_phone) = 11 then
    v_phone := '+90' || substr(v_phone, 2);
  elsif left(v_phone, 1) = '5' and length(v_phone) = 10 then
    v_phone := '+90' || v_phone;
  elsif left(v_raw, 1) = '+' then
    v_phone := regexp_replace(v_raw, '\s+', '', 'g');
  else
    v_phone := null;
  end if;

  if v_phone is not null then
    select email into v_email
    from public.profiles
    where phone = v_phone
    limit 1;
    if v_email is not null then
      return v_email;
    end if;
  end if;

  v_username := lower(regexp_replace(v_raw, '\s+', '', 'g'));
  select email into v_email
  from public.profiles
  where username = v_username
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

-- Upsert için authenticated update zaten var; insert/select de var.
-- Profil okuma: sadece kendi kaydı (mevcut policy).
