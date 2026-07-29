-- Aşık Veysel pin: 38°27'58.68"N 27°12'40.62"E (2 kort)

update public.facilities
set
  address = 'Aşık Veysel Rekreasyon Alanı, Bornova / İzmir',
  latitude = 38.46630,
  longitude = 27.21128,
  updated_at = now()
where name = 'Aşık Veysel Rekreasyon Alanı';
