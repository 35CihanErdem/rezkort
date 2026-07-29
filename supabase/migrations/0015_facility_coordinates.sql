-- Facility coordinates for in-app map + external navigation

alter table public.facilities
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

comment on column public.facilities.latitude is 'WGS84 enlem';
comment on column public.facilities.longitude is 'WGS84 boylam';

-- İzmir seed tesisleri (yaklaşık konumlar)
update public.facilities
set
  latitude = 38.46131,
  longitude = 27.08494,
  updated_at = now()
where name = 'Bostanlı Tenis Tesisleri'
  and (latitude is null or longitude is null);

update public.facilities
set
  latitude = 38.38451,
  longitude = 27.17917,
  updated_at = now()
where name = 'Buca Tenis Tesisleri'
  and (latitude is null or longitude is null);

update public.facilities
set
  latitude = 38.46630,
  longitude = 27.21128,
  updated_at = now()
where name = 'Aşık Veysel Rekreasyon Alanı'
  and (latitude is null or longitude is null);
