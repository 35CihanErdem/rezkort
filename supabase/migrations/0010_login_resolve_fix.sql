-- Login phone matching daha toleranslı + grant yenile

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
  v_digits text;
  v_username text;
begin
  if v_raw = '' then
    return null;
  end if;

  if position('@' in v_raw) > 0 then
    select email into v_email
    from public.profiles
    where lower(email) = lower(v_raw)
    limit 1;
    return v_email;
  end if;

  v_digits := regexp_replace(v_raw, '\D', '', 'g');
  if left(v_digits, 2) = '90' and length(v_digits) = 12 then
    v_phone := '+' || v_digits;
  elsif left(v_digits, 1) = '0' and length(v_digits) = 11 then
    v_phone := '+90' || substr(v_digits, 2);
  elsif left(v_digits, 1) = '5' and length(v_digits) = 10 then
    v_phone := '+90' || v_digits;
  elsif left(v_raw, 1) = '+' then
    v_phone := regexp_replace(v_raw, '\s+', '', 'g');
  else
    v_phone := null;
  end if;

  if v_phone is not null then
    select email into v_email
    from public.profiles
    where phone = v_phone
       or regexp_replace(phone, '\D', '', 'g') = regexp_replace(v_phone, '\D', '', 'g')
    limit 1;
    if v_email is not null then
      return v_email;
    end if;
  end if;

  v_username := lower(regexp_replace(v_raw, '\s+', '', 'g'));
  select email into v_email
  from public.profiles
  where username = v_username
     or username = replace(v_username, '+', '')
     or (v_digits <> '' and username = v_digits)
     or (v_phone is not null and username = replace(v_phone, '+', ''))
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
grant execute on function public.check_signup_availability(text, text, text) to anon, authenticated;
grant execute on function public.upsert_own_profile(text, text, text, text, text) to authenticated;
