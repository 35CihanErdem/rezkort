-- Kendi hesabını super_admin yapmak için (SQL Editor):
-- 1) Authentication → Users'tan email'ini bul
-- 2) Aşağıdaki e-postayı değiştirip çalıştır

update public.profiles
set role = 'super_admin'
where email = 'SENIN_EMAIL@mail.com';

-- Doğrulama:
-- select id, email, role, is_active from public.profiles where email = 'SENIN_EMAIL@mail.com';

-- Staff örneği (belirli belediye):
-- insert into public.staff_memberships (user_id, municipality_id, role, is_active)
-- select p.id, m.id, 'staff', true
-- from public.profiles p
-- cross join public.municipalities m
-- where p.email = 'SENIN_EMAIL@mail.com'
--   and m.name = 'Karşıyaka'
-- on conflict (user_id, municipality_id) do nothing;
