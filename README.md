# Bayrak Grand Hotel Personel Takip

Next.js + Supabase başlangıç projesi. Giriş ekranı ve ilk panel iskeletini içerir; tam üretim sistemi değildir.

## Yerel kurulum
1. Node.js 20+ kurun.
2. `npm install`
3. `.env.example` dosyasını `.env.local` olarak kopyalayın ve Supabase değerlerini doldurun.
4. `npm run dev`

## Giriş için gerekli alan
Login endpoint'i `profiles.email` alanını kullanarak kullanıcı adını Supabase Auth hesabına eşler. SQL Editor'de çalıştırın:
```sql
alter table public.profiles add column if not exists email text;
create unique index if not exists profiles_email_lower_unique on public.profiles (lower(email)) where email is not null;
```
Sonra yönetici profili `email` alanına Authentication -> Users ekranındaki gerçek yönetici e-postasını yazın. `username` alanı `admin` kalabilir.

## Güvenlik
- `SUPABASE_SERVICE_ROLE_KEY` sadece Vercel server environment variables içinde tutulmalı. `NEXT_PUBLIC_` öneki eklemeyin ve GitHub'a yüklemeyin.
- Bu başlangıç projesinde personel hesapları oluşturma/silme, vardiya, puantaj, izin ve maaş arayüzleri henüz uygulanmadı.
- Canlı kullanımdan önce RLS politikaları ve erişimler test edilmelidir. Yeni çalışan hesaplarını oluşturma işlemi güvenli server-side endpoint/Edge Function ile tamamlanmalıdır.

## GitHub/Vercel
1. GitHub'da private repository oluşturun.
2. Bu klasörün içeriğini repository'ye yükleyin.
3. Vercel'de Add New -> Project ile repository'yi içe aktarın.
4. Vercel Environment Variables alanına `.env.local` değişkenlerini ekleyin.
5. Deploy edin ve gerçek giriş akışını test edin.
