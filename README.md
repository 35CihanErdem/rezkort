# RezKort

İzmir tenis kortları için iOS + Android randevu uygulaması (Expo / React Native).

## Ne yapıyor?

- Telefon + e-posta ile kayıt: ad + soyad + e-posta doğrulama kodu + şifre
- Giriş: e-posta / telefon / kullanıcı adı + şifre
- Kortları listele (Bostanlı, Buca, Bornova Aşık Veysel)
- Gün ve saat seç, boş/dolu gör, rezerve et
- **1 telefon = 1 aktif rezervasyon**
- Admin sekmesinden yeni kort ekle

> E-posta kodu: EmailJS anahtarları yoksa simülasyon (Alert). Gerçek gönderim için `EXPO_PUBLIC_EMAILJS_*` ekle (`src/services/email.ts`).

## Çalıştır

Proje **Expo SDK 54** kullanır (Play Store Expo Go ile uyumlu).

```bash
npm start
```

Sonra Expo Go ile QR okut (Android) veya `i` / `a` ile simülatör.

## Not

Veriler şimdilik telefonda AsyncStorage ile tutuluyor. Ortak gerçek zamanlı randevu için sonra backend/veritabanı bağlanacak.
