# REZCOURT

İzmir tenis kortları — **mobil vatandaş** (Expo) + **web admin** (Next.js) · ortak Supabase.

## Ne yapıyor? (Mobil)

- Kayıt / giriş / profil
- Kort listesi, rezervasyon, iptal, randevularım
- Yerel hatırlatma bildirimleri
- Admin/staff paneli **yok** (web’de)

## Web Admin

Ayrı uygulama: [`admin/`](admin/README.md)

```bash
cd admin
cp .env.example .env.local
npm install
npm run dev
```

## Ortam (mobil)

`.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_or_publishable_key
```

Supabase’de migration’ları sırayla çalıştır; özellikle **`0027_role_model_audit_admin_ops.sql`** (roller + audit + admin RPC). Sonrası **database freeze**.

Super admin (yalnızca SQL):

```sql
update public.profiles
set is_super_admin = true, role = 'citizen'
where email = 'senin@email.com';
```

## Çalıştır (mobil)

```bash
npm start
```

## Yapı

```
admin/                 # Next.js belediye paneli
src/                   # Expo vatandaş uygulaması
supabase/migrations/   # Ortak şema (freeze: 0027 sonrası)
```
