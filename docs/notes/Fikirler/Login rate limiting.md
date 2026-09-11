---
tarih: 2026-09-11
durum: kabul edildi — uygulanmadı
kapsam: backend / güvenlik
---

# Login rate limiting

## Sorun

`POST /api/auth/login` şu an sınırsız denenebiliyor. İki ayrı risk:

1. **Kaba kuvvet**: şifre denemesi sınırsız.
2. **DoS**: BCrypt work factor 12, her deneme ~220 ms CPU yakıyor. Yani login
   ucuz bir kaynak tüketme yüzeyi — saldırganın maliyeti bir HTTP isteği, sunucunun
   maliyeti çeyrek saniye CPU.

Sınır yokken: ~4.5 deneme/sn → günde ~390.000 deneme.

## Önerilen sayılar

.NET'in yerleşik rate limiting middleware'i (`AddRateLimiter`), sabit pencere:

| Uç | Limit | Pencere | Kuyruk |
|---|---|---|---|
| `POST /api/auth/login` | 10 istek | 5 dakika | 0 |
| `POST /api/auth/register` | 5 istek | 1 saat | 0 |

**Neden 10/5dk:** şifresini yanlış hatırlayan gerçek bir kullanıcı 3-4 denemede
ya girer ya vazgeçer; 10 rahat bir tampon. Saldırgan tarafında ise günlük deneme
390.000'den **2.880**'e iner — iki buçuk kat değil, yüz kat fark.

**Neden kuyruk 0:** istekleri kuyruğa almak DoS'u kötüleştirir — pahalı olan şey
zaten BCrypt'in kendisi. Fazlası anında 429 ile reddedilmeli.

**Neden register daha sıkı:** kayıt nadir bir eylem; toplu hesap açmanın önüne geçer.

## Dikkat edilecekler

- **Bölümleme anahtarı IP.** Uygulama bir reverse proxy arkasına girerse
  `ForwardedHeaders` yapılandırılmadığı sürece TÜM istekler proxy'nin IP'sinden
  geliyor görünür — o zaman bir kullanıcı herkesi kilitler. Deploy anında
  hatırlanmalı.
- **Sadece IP yetmez.** Dağıtık bir saldırı IP limitini aşar. Kullanıcı adı bazlı
  ikinci bir limit tek bir hesabı hedeflemeyi engeller. KISS gereği önce IP,
  gerekirse ikincisi.
- **429 yanıtı ProblemDetails formatında olmalı** ve `Retry-After` başlığı
  taşımalı — `GlobalExceptionHandler`'ın ürettiği diğer hatalarla tutarlı olsun,
  ayrı bir hata şekli çıkmasın.
- Zamanlama saldırısına karşı `AuthService`'teki koruma (kullanıcı yoksa bile
  BCrypt.Verify çalıştırma) **yerinde kalmalı** — rate limiting onun yerine geçmez.
