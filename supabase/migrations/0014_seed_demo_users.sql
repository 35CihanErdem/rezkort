-- Deneme kullanıcıları (SQL Editor'da çalıştır)
-- Ortak şifre: Test1234!
-- E-posta zaten varsa auth tekrar eklenmez; profil rolü güncellenir.

do $$
declare
  r record;
  v_id uuid;
  v_exists boolean;
begin
  for r in
    select *
    from (
      values
        (
          'cihaneerdemdiker55@gmail.com'::text,
          'Cihan'::text,
          'Erdem'::text,
          'demo_admin'::text,
          '+905551000001'::text,
          'admin'::text
        ),
        (
          'dikercihan53@gmail.com',
          'Cihan',
          'Diker',
          'demo_staff',
          '+905551000002',
          'staff'
        ),
        (
          'valoranthesap3553@gmail.com',
          'Valo',
          'Test',
          'demo_citizen',
          '+905551000003',
          'citizen'
        ),
        (
          'systemtenis@gmail.com',
          'Sistem',
          'Tenis',
          'demo_staff2',
          '+905551000004',
          'staff'
        )
    ) as t(email, first_name, last_name, username, phone, role)
  loop
    select exists(select 1 from auth.users u where u.email = r.email)
    into v_exists;

    if not v_exists then
      v_id := gen_random_uuid();

      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
      ) values (
        '00000000-0000-0000-0000-000000000000',
        v_id,
        'authenticated',
        'authenticated',
        r.email,
        crypt('Test1234!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
          'phone', r.phone,
          'first_name', r.first_name,
          'last_name', r.last_name,
          'username', r.username,
          'phone_verified', true
        ),
        now(),
        now(),
        '',
        '',
        '',
        ''
      );

      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) values (
        gen_random_uuid(),
        v_id,
        jsonb_build_object(
          'sub', v_id::text,
          'email', r.email,
          'email_verified', true
        ),
        'email',
        v_id::text,
        now(),
        now(),
        now()
      );
    else
      select u.id into v_id from auth.users u where u.email = r.email;

      -- Şifreyi deneme şifresine çek (bilerek)
      update auth.users
      set
        encrypted_password = crypt('Test1234!', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
      where id = v_id;

      if not exists (
        select 1 from auth.identities i
        where i.user_id = v_id and i.provider = 'email'
      ) then
        insert into auth.identities (
          id,
          user_id,
          identity_data,
          provider,
          provider_id,
          last_sign_in_at,
          created_at,
          updated_at
        ) values (
          gen_random_uuid(),
          v_id,
          jsonb_build_object(
            'sub', v_id::text,
            'email', r.email,
            'email_verified', true
          ),
          'email',
          v_id::text,
          now(),
          now(),
          now()
        );
      end if;
    end if;

    -- Trigger citizen yazar; rol + profil alanlarını netleştir
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
      v_id,
      r.phone,
      r.email,
      r.first_name,
      r.last_name,
      r.username,
      r.role,
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
      role = excluded.role,
      phone_verified = true,
      email_verified = true,
      is_active = true,
      updated_at = now();

    raise notice 'OK % → % (% / %)', r.email, r.role, r.username, r.phone;
  end loop;
end;
$$;

-- Kontrol:
-- select email, role, username, phone from public.profiles
-- where email in (
--   'cihaneerdemdiker55@gmail.com',
--   'dikercihan53@gmail.com',
--   'valoranthesap3553@gmail.com',
--   'systemtenis@gmail.com'
-- );
