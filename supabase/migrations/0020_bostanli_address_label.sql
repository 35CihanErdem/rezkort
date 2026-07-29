-- Adres metnini netleştir: semt Bostanlı, ilçe Karşıyaka

update public.facilities
set
  district = 'Bostanlı',
  address = 'Atakent / Bostanlı, Karşıyaka / İzmir',
  updated_at = now()
where name = 'Bostanlı Tenis Tesisleri';
