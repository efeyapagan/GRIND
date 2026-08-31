# Cross-cutting Tasarımı — Hata Yönetimi, JWT, Sahiplik

**Tarih:** 2026-08-31
**Kapsam:** PLAN.md Faz 3
**Durum:** ✅ Onaylandı (2026-08-31) — dört sorunun da A seçeneği; FluentValidation eklenmiyor

## Bu Doküman Ne Değildir

CLAUDE.md hata middleware'inin görevlerini, JWT'nin ne taşıyacağını ve sahiplik kuralını zaten
tanımlıyor. Bu doküman onları kopyalamaz; yalnızca Faz 3'ün açık bıraktığı kararları kayda
geçirir. Çelişki olursa CLAUDE.md kazanır.

Faz 3'ün amacı Faz 4'ün controller'ının **ince** olması: hata çevirisi, kimlik ve sahiplik
kontrolü burada bir kez çözülür, her endpoint'te tekrar yazılmaz.

---

## Önce: PLAN.md'de bir çelişki

PLAN.md satır 36 (Faz 0 kararı) FluentValidation'ın **eklenmediğini** yazıyor — gerekçesi
"DataAnnotations + `[ApiController]` otomatik 400'ü bu ölçekte yeterli, karmaşık kurallar zaten
servis katmanında yaşayacak". Ama satır 96 (Faz 3.6) "FluentValidation pipeline" diyor. İkisi
aynı anda doğru olamaz.

**Önerim: Faz 0 kararı geçerli, 3.6'daki satır düzeltilir.** Sebep sadece tutarlılık değil:
`[ApiController]` zaten DataAnnotations ihlallerinde RFC 7807 uyumlu bir `ValidationProblemDetails`
döndürüyor — yani Faz 3'ün asıl işi olan "tutarlı hata formatı" o yolda da kendiliğinden
sağlanıyor. FluentValidation eklemek, bu ölçekte ikinci bir doğrulama mekanizması ve yeni bir
bağımlılık demek. Karmaşık kurallar (sahiplik, isim çakışması, rekor mantığı) zaten servis
katmanında ve DataAnnotations'la ifade edilemez.

---

## Karar bekleyen dört soru

### Soru 1 — Hata yakalama: `IExceptionHandler` mi, elle yazılmış middleware mi?

CLAUDE.md "pipeline'ın başına yakın kaydedilen, tüm isteği saran bir middleware" diyor. Bu tarif
2023'ten önce tek seçenekti; ASP.NET Core 8 ile `IExceptionHandler` geldi.

**A — `IExceptionHandler` (önerim).** `AddExceptionHandler<T>()` + `UseExceptionHandler()`.
Framework'ün kendi exception middleware'i çağırır, yani CLAUDE.md'nin tarif ettiği "isteği saran
middleware" davranışı **aynen** korunur; sadece onu biz elle yazmayız. Kazanç: `ProblemDetails`
üretimi framework'ün `IProblemDetailsService`'iyle entegre, birden fazla handler zincirlenebilir,
ve test etmesi daha kolay (saf bir sınıf, `RequestDelegate` sarmalamaya gerek yok).

**B — Elle yazılmış `IMiddleware`.** CLAUDE.md'nin harfine daha yakın. `try/catch` bizim
kodumuzda, akış tamamen görünür. Bedeli: `ProblemDetails` serileştirmesini ve içerik
müzakeresini elle yapmak, ve framework'ün zaten çözdüğü bir sorunu tekrar çözmek.

### Soru 2 — Başkasının kaydına erişimde 404 mü, 403 mü?

CLAUDE.md "başka bir kullanıcının özel egzersizini görüntüleyemez" diyor ama HTTP durum kodunu
söylemiyor. Bu bir güvenlik kararı.

**A — 404 Not Found (önerim).** Kullanıcı erişemediği bir kaydı, *var olmayan* bir kayıttan
ayırt edemez. 403 dönmek "böyle bir kayıt var ama senin değil" bilgisini sızdırır — saldırgan
id'leri tarayarak hangi id'lerin dolu olduğunu haritalayabilir. Repository katmanı zaten bunu
destekliyor: `GetVisibleByIdAsync` başkasının kaydında `null` dönüyor, yani servis doğal olarak
"bulunamadı" akışına düşüyor.

**B — 403 Forbidden.** Daha dürüst bir hata mesajı, hata ayıklaması kolay. Bedeli: yukarıdaki
sızıntı.

> Not: `ForbiddenException` yine de yazılıyor — ama farklı bir iş için: **global bir egzersizi
> düzenlemeye/arşivlemeye çalışmak** gibi, kaydın varlığının zaten bilindiği durumlar. Orada
> 404 dönmek yanlış olurdu.

### Soru 3 — `ICurrentUserService` kimlik yoksa ne yapsın?

**A — `long UserId { get; }`, kimlik yoksa fırlatır (önerim).** Bu uygulamada register/login
dışındaki her endpoint `[Authorize]` taşıyacak, yani kimliğin olmaması bir *çalışma zamanı
durumu* değil, bir **programlama hatası** (birisi `[Authorize]` koymayı unutmuş). Fırlatmak onu
500 olarak açığa çıkarır — doğru davranış, çünkü sessizce anonim davranmak yetkilendirmeyi
delerdi. Servislerde her çağrıda null kontrolü yazmaktan da kurtarır.

**B — `long? UserId { get; }`, nullable.** Daha dürüst tip. Bedeli: her servis metodunda bir
null kontrolü, ve o kontrolü unutan biri sessizce yanlış davranan kod yazar.

### Soru 4 — Sahiplik kontrolü nerede yaşasın?

CLAUDE.md "ortak sahiplik kontrolü yardımcısı — DRY" diyor.

**A — Statik `OwnershipGuard` sınıfı (önerim).** `EnsureOwned(long? ownerId, long currentUserId)`
ve `IsVisible(long? ownerId, long currentUserId)` gibi saf fonksiyonlar; kural tek yerde, bağımlılığı
yok, testi tek satır. Servisler çağırır.

**B — `ICurrentUserService` üzerinde metot.** Tek bağımlılık. Bedeli: kimlik taşımak ile
yetkilendirme kararı vermek iki ayrı sorumluluk — Single Responsibility'yi bulandırır.

---

## Önerilen tasarım (A + A + A + A)

```
src/Grind.Api/Common/
├─ Exceptions/
│  ├─ NotFoundException.cs      → 404
│  ├─ ValidationException.cs    → 400
│  ├─ ForbiddenException.cs     → 403
│  └─ ConflictException.cs      → 409
├─ ErrorHandling/
│  └─ GlobalExceptionHandler.cs  IExceptionHandler; exception → ProblemDetails
├─ Security/
│  ├─ ICurrentUserService.cs
│  ├─ CurrentUserService.cs      HttpContext'ten UserId + Username
│  ├─ ITokenService.cs
│  ├─ TokenService.cs            JWT üretimi (SADECE UserId + Username)
│  └─ OwnershipGuard.cs          statik, saf
└─ DependencyInjection.cs        AddCrossCutting uzantısı
```

**Hata → durum kodu eşlemesi:** `NotFoundException` 404, `ValidationException` 400,
`ForbiddenException` 403, `ConflictException` 409, eşleşmeyen her şey 500.

**Production'da sızıntı yok:** 500 yanıtının `detail` alanı Development'ta exception mesajını
taşır, Production'da sabit bir metin. Stack trace hiçbir ortamda client'a gitmez. Log tarafında
her ikisi de tam exception + request path + zaman + (varsa) UserId ile yazılır.

**JWT:** simetrik anahtar (user-secrets'taki `Jwt:Key`), issuer/audience/expiry
`appsettings.json`'dan. Token yalnızca `sub` (UserId) ve `unique_name` (Username) taşır —
CLAUDE.md'nin kararı gereği rol/plan claim'i yok. **Refresh token yazılmıyor** (YAGNI: tek
kullanıcılı kişisel bir uygulamada 7 günlük token yeterli, gerçek ihtiyaç çıkarsa eklenir).

**Swagger:** JWT bearer tanımı eklenir, böylece Faz 4'ten itibaren Swagger'dan token'la istek
atılabilir.

**Test:** `GlobalExceptionHandler` ve `OwnershipGuard` saf sınıflar — veritabanı gerekmez.
`CurrentUserService` sahte bir `HttpContext` ile test edilir. `TokenService` ürettiği token'ı
kendi doğrulayıcısıyla çözerek test edilir (claim içeriği ve süre). Yani Faz 3'ün testlerinin
**hiçbiri Docker istemez** — bu faz veritabanına dokunmuyor.

---

## Onay

Dört sorunun cevabını onaylaman (ya da değiştirmen) ve PLAN.md 3.6'daki FluentValidation
çelişkisini nasıl çözeceğimize karar vermen yeterli; sonrasında uygulama planını yazıp görev
görev ilerleyeceğim.
