# Auth Tasarımı — Kayıt, Giriş, Token

**Tarih:** 2026-09-01
**Kapsam:** PLAN.md Faz 4
**Durum:** ✅ Onaylandı (2026-09-01) — altı sorunun da A seçeneği; username ASCII-only

## Bu Doküman Ne Değildir

CLAUDE.md JWT'nin ne taşıyacağını (yalnızca `UserId` + `Username`), şifre hashlemenin
test edilmiş bir kütüphaneyle yapılacağını ve username'in case-insensitive olması
gerektiğini zaten söylüyor. Faz 3 de `ITokenService`, `GlobalExceptionHandler` ve domain
exception'larını teslim etti. Bu doküman onları tekrar etmez; yalnızca Faz 4'ün açık
bıraktığı kararları kayda geçirir. Çelişki olursa CLAUDE.md kazanır.

## Zaten Kararlı Olanlar (tartışmaya açılmıyor)

- `IAuthService` / `AuthService` iş mantığını taşır, `AuthController` ince kalır.
- Şifre hash'i **BCrypt.Net-Next** ile (paket zaten `Grind.Api.csproj`'de).
- Username veritabanında **her zaman küçük harf** durur; normalizasyon servis katmanında.
  (`IUserRepository.GetByUsernameAsync` bunu XML doc'unda şart koşuyor.)
- Username çakışması → `ConflictException` → 409.
- `CreatedAt` UTC.
- Token üretimi `ITokenService.Create(user)` — Faz 3'te bitti, yeniden yazılmayacak.

---

## Karar bekleyen altı soru

### Soru 1 — Hatalı girişte ne dönülecek?

**A — Tek ve nötr 401 (önerim).** Kullanıcı yok da, şifre yanlış da olsa aynı yanıt:
`401` + "Kullanıcı adı veya şifre hatalı." Sebep: farklı yanıt vermek, saldırgana
"bu username kayıtlı" bilgisini verir — Faz 3'te 403 yerine 404 seçerken kapattığımız
enumerasyon sızıntısının aynısı, sadece başka kapıdan.

> **Bununla birlikte gelen bir zorunluluk:** kullanıcı bulunamadığında BCrypt doğrulaması
> hiç çalışmazsa yanıt ~1ms'de döner; kullanıcı varken ~100ms sürer. Bu **zamanlama
> oracle'ı** tek başına username'leri sayar hâle getirir ve nötr mesajı anlamsız kılar.
> Bu yüzden kullanıcı bulunamadığında da sabit bir sahte hash'e karşı doğrulama
> çalıştırılacak. Bu bir "güzel olurdu" değil, A seçeneğinin çalışması için şart.

**B — Ayrıştırılmış hatalar.** "Kullanıcı bulunamadı" 404, "şifre yanlış" 401. Hata
ayıklaması kolay. Bedeli: yukarıdaki sızıntı.

### Soru 2 — Kayıt token dönsün mü?

**A — Evet, `AuthResponse` (token + username) döner, 200 OK (önerim).** İstemcinin
az önce girdiği bilgiyi hemen tekrar POST etmesi için sebep yok; tek gidiş-dönüş.

**B — 201 Created, token yok.** Daha REST'çi. Bedeli: her kayıt iki isteğe çıkar ve
`Location` gösterecek bir `GET /api/users/{id}` endpoint'imiz yok (ve olmayacak).

### Soru 3 — Şifre kuralları

**A — En az 8, en fazla 72 karakter; karmaşıklık kuralı yok (önerim).**
Alt sınır 8: NIST'in güncel tavsiyesi uzunluğu karmaşıklığa tercih ediyor ("en az bir
büyük harf + rakam" kuralları tahmin edilebilir şifre üretiyor).
**Üst sınır 72 bir tercih değil, zorunluluk:** BCrypt girdiyi 72 byte'ta *sessizce*
kesiyor. Sınır koymazsak 100 karakterlik bir şifrenin ilk 72 karakteri doğru olan
herkes giriş yapabilir — kullanıcının haberi bile olmaz.

**B — Karmaşıklık kuralları da eklensin.** (Büyük/küçük/rakam/sembol zorunlu.)
72 sınırı yine gerekli.

### Soru 4 — Username'de hangi karakterler serbest?

**A — Yalnızca ASCII harf + rakam + `_` + `-`, 3–50 karakter (önerim).**
Sebep teknik: **Türkçe İ/ı problemi.** `"İ".ToLowerInvariant()` iki kod noktalı bir
dizi (`i` + birleşen nokta) üretirken PostgreSQL'in `lower()`'ı düz `i` veriyor. Bu tam
olarak Faz 2'de `ExerciseRepository.NameExistsAsync`'i ısıran hata. Username'i ASCII'ye
kısarsak sorun **var olmuyor** — normalizasyon ile veritabanı sonsuza kadar aynı fikirde.
Bedeli açık: "efeyapağan" bir username olamaz, "efeyapagan" olur.

**B — Unicode harfler de serbest.** Türkçe karakterli username yazılabilir. Bedeli:
"İzmir" kaydı veritabanına `i̇zmir` olarak düşer ve kullanıcı "izmir" yazarak giriş
YAPAMAZ — sessiz, açıklaması zor bir hata. Bunu düzeltmek için normalizasyonun
PostgreSQL'in `lower()`'ıyla birebir aynı davranması gerekir; bu Faz 2'de `ILike`
ile ancak sorgu tarafında çözülebilmişti.

### Soru 5 — BCrypt iş faktörü (work factor)

**A — Açıkça 12, isimli bir sabit olarak (önerim).** Kütüphane varsayılanı 11.
Açık yazmak, ileride donanım hızlanınca yükseltilecek yeri görünür kılar (~250ms/hash).

**B — Varsayılanı kullan.** Daha az kod. Bedeli: değerin ne olduğu kodda görünmez.

### Soru 6 — Giriş denemelerine hız sınırı (rate limit)

**A — Şimdi eklenmiyor, not düşülüyor (önerim).** Tek kullanıcılı kişisel bir uygulama;
ASP.NET Core'un yerleşik rate limiting middleware'i gerçek ihtiyaç çıktığında birkaç
satırda eklenir (YAGNI). Uygulama internete açılırsa bu not devreye girer.

**B — Şimdi eklensin.** Brute-force'a karşı baştan korumalı olur. Bedeli: bu ölçekte
erken karmaşıklık.

---

## Önerilen tasarım (A + A + A + A + A + A)

```
src/Grind.Api/
├─ Models/Dtos/Auth/
│  ├─ RegisterRequest.cs     Username, Password  (DataAnnotations)
│  ├─ LoginRequest.cs        Username, Password
│  └─ AuthResponse.cs        Token, ExpiresAtUtc, Username
├─ Services/
│  ├─ IAuthService.cs        RegisterAsync, LoginAsync
│  └─ AuthService.cs         normalizasyon + BCrypt + çakışma + token
└─ Controllers/
   └─ AuthController.cs      POST /api/auth/register, POST /api/auth/login
```

**Hata eşlemesi (hepsi Faz 3'ün handler'ından geçer, yeni kod gerekmez):**
username dolu → `ConflictException` → 409; hatalı giriş → `UnauthorizedException` → 401;
DTO doğrulama ihlali → `[ApiController]`'ın otomatik `ValidationProblemDetails` → 400.

> **Faz 3'ün eksiği:** `Common/Exceptions/`'da 401'e eşlenen bir exception YOK
> (`NotFound` 404, `Validation` 400, `Forbidden` 403, `Conflict` 409). Bu fazda bir
> `UnauthorizedException` eklenip `GlobalExceptionHandler`'ın eşlemesine bağlanacak.

**Nötr hata mesajı kuralı:** PLAN.md'ye Faz 3'ten devreden not, 404-over-403 kararını
hiçbir tipin korumadığını söylüyor. Aynısı burada da geçerli: `UnauthorizedException`'ın
mesajı her iki dalda da birebir aynı sabit olacak ve bir test bunu doğrulayacak.

**Test:** kayıt; aynı username'in reddi (**"Efe" ile "efe" çakışmalı**); şifre yanlışken
ve kullanıcı hiç yokken **aynı** yanıt; token'ın içeriği (`sub` = yeni kullanıcının Id'si);
72 karakterden uzun şifrenin reddi; hash'in düz metin olmadığı. Bu testler veritabanı
istiyor — Docker gerekecek (Faz 1/2 testleri gibi).

---

## Onay

Altı sorunun cevabını onaylaman (ya da değiştirmen) yeterli; sonrasında uygulama planını
yazıp görev görev ilerleyeceğim.
