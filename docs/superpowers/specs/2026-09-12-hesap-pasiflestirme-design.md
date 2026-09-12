# Hesap Pasifleştirme Tasarımı — Soft Delete, Login ile Geri Açma

**Tarih:** 2026-09-12
**Kapsam:** PLAN.md Faz 13 (13.0 soft/hard kararı, 13.1-13.3 verinin korunduğunun kanıtı, 13.4
`DELETE /api/auth/me`)
**Durum:** ✅ Onaylandı (2026-09-12). İki soru soruldu: silme tipi → **soft delete** ("verilerin
kaybolmasını istemiyoruz"), geri açma → **login otomatik geri açar**. Kalan kararlar tasarım
sırasında alındı ve aşağıda gerekçeleriyle kayıtlı.

## Bu Doküman Ne Değildir

CLAUDE.md kimlik/yetki desenini (JWT yalnızca kimlik taşır; yetki gerektiren her istekte kullanıcının
GÜNCEL durumu veritabanından okunur), sahiplik kuralını ve katman düzenini zaten tanımlıyor. Faz 4
auth'u (BCrypt, küçük harf normalizasyonu, nötr 401, zamanlama savunması) kurdu. Bu doküman onları
tekrar etmez; yalnızca Faz 13'ün açık bıraktığı kararları kayda geçirir. Çelişki olursa CLAUDE.md
kazanır.

## Zaten Kararlı Olanlar (tartışmaya açılmıyor)

- **Hiçbir satır silinmez.** Oturumlar, setler, rekorlar, tartılar, yorumlar, egzersizler ve
  şablonlar olduğu gibi kalır. Global egzersizlere (`UserId = null`) zaten dokunulmuyor.
- **Login'in nötrlüğü korunur:** kullanıcı yok, şifre yanlış ve hesap pasif — üçü de AYNI 401
  mesajını alır (`Kullanıcı adı veya şifre hatalı.`) ve BCrypt doğrulaması her dalda çalışır (Faz 4'ün
  zamanlama savunması bozulmaz).
- **Zaman** UTC saklanır.
- **Katman kuralı:** `DbContext`'e yalnızca `Repositories/` ve `Data/` dokunur; controller ince.

---

## Kararlar

### Karar 1 — Pasiflik alanı: `User.DeletedAt` (nullable), bool değil

`DateTime?`, PostgreSQL'de `timestamp with time zone`. `DeletedAt IS NULL` = aktif.

Gerekçe: bir `bool IsDeleted` "pasif mi" sorusunu cevaplar ama "ne zamandan beri" sorusunu
cevaplamaz; ikisini birden isteyen bir kayıt için ikinci bir sütun gerekirdi. Tek nullable damga
aynı bilgiyi bedelsiz taşır ve ileride "30 gündür pasif olanları gerçekten sil" gibi bir purge
işi çıkarsa hazır veriyi zaten sağlar.

Migration: `dotnet ef migrations add HesapPasiflestirme`. Konfigürasyon değişikliği YOK — Npgsql
`DateTime`'ı kural gereği `timestamptz`'ye eşliyor ve `ColumnMappingTests` tüm `DateTime`
alanlarını zaten tarıyor.

**Adı neden `DeletedAt`:** kullanıcıya gösterilen fiil "hesabı sil" (Faz 13.4 `DELETE /api/auth/me`).
Alan adının bu fiille aynı kelimeyi kullanması, kodda "silinmiş ama duruyor" ayrımını okunur kılar.
Reddedilen: `DeactivatedAt` (uç adıyla ayrışırdı), `IsActive` (ters mantık, null'suz varsayılan
gerektirir ve mevcut satırlar için migration'da veri doldurma işi çıkarır).

### Karar 2 — Login pasif hesabı otomatik geri açar (kullanıcı kararı)

`LoginAsync` sırası değişmez, sonuna bir adım eklenir:

1. Kullanıcıyı adıyla bul (pasif olanlar da dönmeli — bulunmazsa geri açma imkânsız olurdu).
2. BCrypt doğrulaması **her zaman** çalışır (Faz 4'ün kısa devre yasağı aynen geçerli).
3. Kullanıcı yok ya da şifre yanlışsa → nötr 401.
4. **Şifre doğruysa ve hesap pasifse:** `DeletedAt = null`, tek `SaveChangesAsync`, sonra token.

Kritik sıra: pasiflik kontrolü **şifre doğrulamasından SONRA** gelir. Önce gelseydi, yanlış şifreyle
bile "bu hesap pasif" bilgisi sızardı ve Faz 4'ün nötrlük kararı delinirdi.

Ayrı bir `POST /api/auth/reactivate` ucu AÇILMAZ (YAGNI): doğru şifreyle giriş yapmak zaten niyetin
kendisidir, ikinci bir uç aynı işi ikinci bir yerde doğrulamak olurdu.

### Karar 3 — Elde duran JWT anında geçersizleşir: her kimlikli istekte aktiflik kontrolü

Token ömrü 7 gün (`Jwt:ExpiryMinutes = 10080`). Kontrol olmasaydı pasifleştirilen bir hesap, elindeki
token'la bir hafta boyunca tüm verisine erişmeye devam ederdi — "hesabımı sildim" ifadesini anlamsız
kılan bir boşluk.

Kontrol `AddJwtBearer`'ın `OnTokenValidated` olayında yapılır: token imza/ömür doğrulamasını geçtikten
sonra, istekteki `UserId` için `IUserRepository.ExistsActiveAsync` çağrılır; sonuç `false` ise
`context.Fail(...)` çağrılır ve istek 401 alır.

Neden burası:
- Kimlik doğrulama hattının içinde, istek başına TAM BİR KEZ çalışır.
- Başarısızlığı, fallback politikasının ürettiği 401'le aynı şekle düşer — yeni bir hata biçimi
  doğmaz.
- `[AllowAnonymous]` uçları (register/login) token taşımadığı için bu yoldan hiç geçmez; pasif
  kullanıcının giriş yapıp geri açması engellenmez.

Reddedilenler: `UseAuthentication`'dan sonra bir middleware (aynı işi hattın dışında yapar, 401
gövdesini kendimiz üretmemiz gerekir) ve bir `IAuthorizationHandler` (yalnızca politika değerlendiren
uçlarda çalışır; kimlik doğrulamanın kendisiyle ilgili bir gerçeği yetkilendirmeye taşımak yanlış
katman).

**Bilinen bedel:** kimlikli her istek bir ek okuma yapar — birincil anahtar üzerinde `AnyAsync`, tek
satır, entity materyalize edilmez. Kişisel ölçekte önemsiz. Bir gün sorun olursa çözüm kısa ömürlü
bir bellek içi önbellektir; şimdi eklemek YAGNI.

### Karar 4 — Pasif hesabın kullanıcı adı REZERVE kalır

`UsernameExistsAsync` `DeletedAt`'e bakmaz: pasif bir hesabın adıyla kayıt olmak 409 verir.

Gerekçe: ad serbest bırakılsaydı, adı kapan yeni kullanıcı eski hesabın adını taşırdı ve sahibi geri
döndüğünde giriş yapacağı ad başkasında olurdu. Ayrıca "kayıt ol" akışının pasif bir hesabı ele
geçirmesi (aynı adla kayıt olup yeni şifre belirlemek) doğrudan bir hesap devralma açığı olurdu.

Bunun sonucu açıkça kabul ediliyor: **geri dönüşün tek yolu doğru şifreyle giriş yapmaktır.** Şifresini
unutan pasif bir kullanıcı için kendi kendine bir yol yok — şifre sıfırlama akışı bu projede hiç yok
(e-posta yok), yani bu yeni bir eksiklik değil.

### Karar 5 — `DELETE /api/auth/me`, gövdede şifre teyidiyle

- `[Authorize]`; kullanıcı `ICurrentUserService.UserId`'den gelir, dışarıdan id alınmaz (IDOR yüzeyi
  yok).
- Gövde: `DeleteAccountRequest { Password }`. Şifre yanlışsa 401 (`Kullanıcı adı veya şifre hatalı.`
  ile aynı sabit mesaj — burada kimlik zaten biliniyor, ayrı bir mesaj yazmak bir şey kazandırmaz).
- Başarı: **204 No Content.**
- Doğrulama sırası: kullanıcıyı yükle → BCrypt doğrula → `DeletedAt = Now` → tek `SaveChangesAsync`.

DELETE'in gövde taşıması alışılmadıktır ama ASP.NET Core ve `HttpClient` bunu destekler, PLAN.md 13.4
bu ucu adıyla istiyor ve şifre teyidi bir gövde gerektiriyor. Reddedilen: şifreyi query string'e
koymak (sunucu loglarına ve tarayıcı geçmişine düşer) ve `POST /api/auth/deactivate` (plandaki adla
ayrışırdı).

### Karar 6 — Zaman `TimeProvider`'dan gelir; `AuthService` de artık onu kullanır

`DeletedAt`'in testte deterministik olması gerekiyor, bu yüzden `AuthService` enjekte edilen
`TimeProvider`'ı alır ve hem `CreatedAt` hem `DeletedAt` için onu kullanır (bugün `DateTime.UtcNow`'u
doğrudan çağırıyor). Program.cs'teki "kimler TimeProvider kullanıyor" yorumu güncellenir.

### Karar 7 — Gerçek silme (purge) kapsam DIŞI

Hiçbir hard-delete yolu yazılmaz. Uygulama kendi dışında gerçek kullanıcılara açılırsa KVKK/GDPR'ın
silinme hakkı devreye girer ve o noktada `User`'a RESTRICT veren FK'ler yüzünden sıralı bir purge
gerekir (PLAN.md'nin eski 13.1 sırası bu iş için not olarak kalır). Bugün yazmak YAGNI.

---

## Tasarım

```
src/Grind.Api/
├─ Models/Entities/User.cs                    (+ DeletedAt)
├─ Data/Migrations/<zaman>_HesapPasiflestirme.cs   (üretilir)
├─ Repositories/IUserRepository.cs / UserRepository.cs   (+ ExistsActiveAsync)
├─ Models/Dtos/Auth/DeleteAccountRequest.cs    (yeni)
├─ Services/IAuthService.cs / AuthService.cs   (+ DeactivateAsync, login'de geri açma, TimeProvider)
├─ Controllers/AuthController.cs               (+ DELETE me)
├─ Common/DependencyInjection.cs               (+ OnTokenValidated aktiflik kontrolü)
└─ Program.cs                                  (yalnızca TimeProvider yorumu)
```

**Uçlar:**

| Metot | Yol | Anlam | Durumlar |
|---|---|---|---|
| DELETE | `/api/auth/me` | hesabı pasifleştir (şifre teyidiyle) | 204, 400, 401 |
| POST | `/api/auth/login` | *(değişti)* pasif hesabı doğru şifreyle geri açar | 200, 400, 401 |

**Servis sözleşmesi:**

```csharp
public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);

    /// <summary>Şifre doğruysa pasif hesabı yeniden aktifleştirir. Aksi hâlde nötr 401.</summary>
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);

    /// <summary>Hesabı pasifleştirir; hiçbir veri silinmez. Şifre yanlışsa UnauthorizedException.</summary>
    Task DeactivateAsync(DeleteAccountRequest request, CancellationToken cancellationToken = default);
}
```

**Repository eklemesi:**

```csharp
/// <summary>Kimlikli her istekte çağrılır: yalnızca varlık + aktiflik, entity materyalize edilmez.</summary>
Task<bool> ExistsActiveAsync(long id, CancellationToken cancellationToken = default);
```

### Hata durumları

| Durum | Sonuç |
|---|---|
| Şifre alanı boş | 400 |
| Yanlış şifreyle hesap silme | 401, `DeletedAt` değişmez |
| Pasif hesabın token'ıyla herhangi bir kimlikli istek | 401 |
| Pasif hesap + doğru şifre ile login | 200, hesap aktifleşir, yeni token |
| Pasif hesap + yanlış şifre ile login | 401 (nötr), hesap pasif kalır |
| Pasif hesabın adıyla kayıt | 409, şifre EZİLMEZ |

---

## Test yüzeyi

1. **Repository:** `ExistsActiveAsync` aktifte true, pasifte false, olmayan id'de false.
2. **Servis:**
   - Pasifleştirme `DeletedAt`'i saatten yazar; kullanıcının oturum/set/tartı/yorum satırları
     **sayıca değişmez** (PLAN 13.2'nin "veri duruyor" kanıtı, veritabanından okunarak).
   - Yanlış şifre → `UnauthorizedException`, `DeletedAt` null kalır.
   - Pasif hesap + doğru şifre → login geri açar (DB'de `DeletedAt` null) ve token döner.
   - Pasif hesap + yanlış şifre → nötr 401 ve hesap pasif kalır.
   - Pasif hesabın adıyla kayıt → 409 ve şifre hash'i değişmez (hesap devralma yok).
   - Başka kullanıcının satırları etkilenmez (PLAN 13.3).
   - Global egzersizler etkilenmez (PLAN 13.2).
3. **Cross-cutting (gerçek host):** pasifleştirmeden ÖNCE alınmış token, pasifleştirmeden sonra
   kimlikli bir uçta 401 alır; login ile geri açtıktan sonra yeni token yine 200 alır.
4. **Uçtan uca:** tokensiz `DELETE /api/auth/me` 401; şifresiz gövde 400; yanlış şifre 401; doğru
   şifre 204; pasifleştirme sonrası veri uçları 401; geri açtıktan sonra pasifleştirmeden önce
   girilen verinin hâlâ orada olması.

---

## Bilinçli olarak kapsam dışı

- Gerçek silme (purge) ve KVKK/GDPR silinme hakkı akışı (Karar 7).
- Şifre sıfırlama / kurtarma (projede e-posta yok; pasif hesap için de yeni bir eksiklik değil).
- Pasifleştirme sonrası "geri alma penceresi", zamanlanmış temizlik, pasif hesaplara e-posta.
- **Bilinen sınır:** geri açma, o an süresi dolmamış ESKİ token'ları da yeniden çalışır hâle getirir
  (durum bilgisi tutmayan JWT'nin doğası; iptal listesi tutulmuyor). Hesabı geri açan zaten şifreyi
  bilen kişidir.
- **Bilinen bedel:** kimlikli her istek bir ek aktiflik okuması yapar (Karar 3).
