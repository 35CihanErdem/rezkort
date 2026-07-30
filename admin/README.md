# REZCOURT Admin

Belediye personeli / admin web paneli (Next.js 15 + Supabase).

Mobil uygulama yalnızca vatandaş içindir. Yönetim buradan yapılır.

## Kurulum

1. Supabase SQL Editor’da `supabase/migrations/0027_role_model_audit_admin_ops.sql` çalıştır.
2. Super admin yapmak için (UI yok):

```sql
update public.profiles
set is_super_admin = true, role = 'citizen'
where email = 'senin@email.com';
```

3. Env:

```bash
cd admin
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY doldur
```

4. Çalıştır:

```bash
npm install
npm run dev
```

Aç: http://localhost:3000

## Pilot zincir

Kayıt → Giriş → Rezervasyon (mobil) → Admin görür → Check-in → Completed → Audit log

## Database freeze

0027 sonrası zorunlu olmadıkça yeni tablo eklenmez.
