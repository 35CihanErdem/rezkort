-- Bostanlı pin: Google Maps "Tennis court, Atakent, F36M+GX, 35590 Karşıyaka/İzmir"
-- Plus Code 8GC9F36M+GX

update public.facilities
set
  address = 'Atakent / Bostanlı, Karşıyaka / İzmir',
  latitude = 38.46131,
  longitude = 27.08494,
  updated_at = now()
where name = 'Bostanlı Tenis Tesisleri';
