-- Bostanlı Atakent tesisinde 5 kort (şu an seed'de 2 vardı)

with f as (
  select id
  from public.facilities
  where name = 'Bostanlı Tenis Tesisleri'
  limit 1
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
select
  f.id,
  v.name,
  'hard',
  true,
  60,
  'Atakent açık kort',
  'active',
  8,
  22
from f
cross join (
  values
    ('Bostanlı Kort 3'),
    ('Bostanlı Kort 4'),
    ('Bostanlı Kort 5')
) as v(name)
on conflict (facility_id, name) do nothing;
