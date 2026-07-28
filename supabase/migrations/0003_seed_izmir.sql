-- Seed municipalities, facilities, courts, rules
-- Idempotent inserts using ON CONFLICT.

insert into public.municipalities (name)
values
  ('Karşıyaka Belediyesi'),
  ('Buca Belediyesi'),
  ('Bornova Belediyesi')
on conflict (name) do nothing;

with m as (
  select id, name
  from public.municipalities
)
insert into public.facilities (municipality_id, name, district, address)
values
  ((select id from m where name = 'Karşıyaka Belediyesi'), 'Bostanlı Tenis Tesisleri', 'Bostanlı', 'Bostanlı Sahil, Karşıyaka / İzmir'),
  ((select id from m where name = 'Buca Belediyesi'), 'Buca Tenis Tesisleri', 'Buca', 'Buca Belediyesi Spor Tesisleri / İzmir'),
  ((select id from m where name = 'Bornova Belediyesi'), 'Aşık Veysel Rekreasyon Alanı', 'Bornova', 'Aşık Veysel Rekreasyon Alanı, Bornova / İzmir')
on conflict (municipality_id, name) do nothing;

with f as (
  select id, name
  from public.facilities
)
insert into public.courts (
  facility_id,
  name,
  surface_type,
  has_lights,
  reservation_duration,
  description,
  status,
  open_hour,
  close_hour
)
values
  ((select id from f where name = 'Bostanlı Tenis Tesisleri'), 'Bostanlı Kort 1', 'hard', true, 60, 'Deniz kenarı açık kort', 'active', 8, 22),
  ((select id from f where name = 'Bostanlı Tenis Tesisleri'), 'Bostanlı Kort 2', 'hard', true, 60, 'Deniz kenarı açık kort', 'active', 8, 22),
  ((select id from f where name = 'Buca Tenis Tesisleri'), 'Buca Kort 1', 'hard', true, 60, 'Belediye spor tesisi kortu', 'active', 8, 21),
  ((select id from f where name = 'Aşık Veysel Rekreasyon Alanı'), 'Aşık Veysel Kort 1', 'hard', true, 60, 'Rekreasyon alanı kortu', 'active', 8, 22),
  ((select id from f where name = 'Aşık Veysel Rekreasyon Alanı'), 'Aşık Veysel Kort 2', 'hard', true, 60, 'Rekreasyon alanı kortu', 'active', 8, 22)
on conflict (facility_id, name) do nothing;

insert into public.reservation_rules (
  municipality_id,
  max_active_reservations,
  max_days_ahead,
  cancel_before_minutes,
  no_show_limit,
  ban_days
)
select
  m.id,
  case
    when m.name = 'Bornova Belediyesi' then 2
    else 1
  end as max_active_reservations,
  7,
  120,
  3,
  7
from public.municipalities m
on conflict (municipality_id) do update set
  max_active_reservations = excluded.max_active_reservations,
  max_days_ahead = excluded.max_days_ahead,
  cancel_before_minutes = excluded.cancel_before_minutes,
  no_show_limit = excluded.no_show_limit,
  ban_days = excluded.ban_days,
  updated_at = now();
