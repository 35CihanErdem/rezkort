-- Buca pin: Google Maps "Hasanağa Bahçesi Tenis Kortu"
-- https://maps.app.goo.gl/wTPJubBNJv3jUMfi8

update public.facilities
set
  address = 'Adatepe Mah. 64. Sk. No:5, Hasanağa Bahçesi / Buca',
  latitude = 38.38451,
  longitude = 27.17917,
  updated_at = now()
where name = 'Buca Tenis Tesisleri';
