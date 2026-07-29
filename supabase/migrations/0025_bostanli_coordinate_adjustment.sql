-- Bostanlı koordinat düzeltmesi
-- 38°27'42.02"N 27°05'06.96"E

update public.facilities
set
  latitude = 38.46167,
  longitude = 27.08527,
  updated_at = now()
where name = 'Bostanlı Tenis Tesisleri';
