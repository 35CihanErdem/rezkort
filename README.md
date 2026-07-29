# REZCOURT

İzmir tenis kortları için iOS + Android randevu uygulaması (Expo SDK 54 / React Native + Supabase).

## Ne yapıyor?

- **Supabase Auth** ile kayıt (ad, soyad, telefon, e-posta, şifre)
- E-posta doğrulaması zorunlu (Confirm email)
- Giriş: e-posta / telefon / kullanıcı adı + şifre
- Şifremi unuttum (Supabase reset maili)
- Hesaptan e-posta / telefon güncelleme
- Kort listesi, rezervasyon, iptal
- **1 telefon = 1 aktif rezervasyon** (RPC)

## Ortam

`.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_or_publishable_key
```

Supabase Dashboard:

- Authentication → Providers → Email → **Confirm email: ON**
- Authentication → URL Configuration → Redirect URLs: `rezkort://**`

## Çalıştır

```bash
npm start
```

## Yapı

```
src/
  lib/supabase.ts
  services/auth.service.ts
  services/profile.service.ts
  context/AuthContext.tsx
  types/auth.ts
  types/profile.ts
```
