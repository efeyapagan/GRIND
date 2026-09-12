# Faz 13 — Hesap Pasifleştirme Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcı hesabını kapatabilsin — **hiçbir veri silinmeden**. Pasif hesap giriş yapamaz,
elindeki token anında geçersizleşir; doğru şifreyle tekrar giriş yapmak hesabı geri açar ve tüm
geçmiş yerinde durur.

**Architecture:** Önce `User.DeletedAt` (nullable UTC damgası) ve migration gelir, yanına kimlikli her
istekte kullanılacak ucuz bir aktiflik sorgusu (`ExistsActiveAsync`). Sonra servis: pasifleştirme
(şifre teyidiyle) ve login'in pasif hesabı geri açması. Ardından cross-cutting parça: `AddJwtBearer`'ın
`OnTokenValidated` olayında aktiflik kontrolü — 7 günlük token'ın pasifleştirmeyi bir hafta yok
saymasını engelleyen şey budur. En son ince bir `DELETE /api/auth/me` ucu ve uçtan uca testler.

**Tech Stack:** .NET 10, ASP.NET Core Web API, EF Core 10 (Npgsql), PostgreSQL 17 (Docker, host port
5433), xUnit, BCrypt.Net-Next.

**Spec:** `docs/superpowers/specs/2026-09-12-hesap-pasiflestirme-design.md` (onaylandı 2026-09-12)

## Global Constraints

Her görevin gereksinimleri bu bölümü örtük olarak içerir.

- **Hiçbir satır silinmez.** Bu fazda `Remove`, `ExecuteDelete` ya da cascade tetikleyen bir işlem
  YOKTUR. Pasifleştirme yalnızca `User.DeletedAt`'i doldurur.
- **Katman kuralı:** `DbContext`'e yalnızca `Repositories/` ve `Data/` dokunur. Controller ince kalır,
  `if`/`try` taşımaz. Hata çevirisi `GlobalExceptionHandler`'da.
- **Login'in nötrlüğü (Faz 4 kararı, bozulmayacak):** kullanıcı yok, şifre yanlış ve hesap pasif —
  üçü de aynı mesajı alır: `Kullanıcı adı veya şifre hatalı.` BCrypt doğrulaması HER dalda çalışır;
  `user is null || !Verify(...)` gibi kısa devre yapan bir ifade YAZILMAZ.
- **Sıra kritik (spec Karar 2):** pasiflik kontrolü şifre doğrulamasından SONRA gelir. Önce gelirse
  yanlış şifreyle "bu hesap pasif" bilgisi sızar.
- **Kullanıcı adı rezerve kalır (spec Karar 4):** `UsernameExistsAsync` `DeletedAt`'e BAKMAZ; pasif
  hesabın adıyla kayıt 409 verir ve mevcut şifre hash'i EZİLMEZ.
- **`GetByUsernameAsync` pasif kullanıcıları da döndürür** — aksi hâlde geri açma imkânsız olur.
- **Kimlik dışarıdan alınmaz:** pasifleştirme `ICurrentUserService.UserId` kullanır, gövdeden id almaz.
- **Zaman:** `DateTime.UtcNow` doğrudan çağrılmaz; `AuthService` enjekte edilen `TimeProvider`'ı kullanır.
- **Sabit mesajlar (birebir):** `Kullanıcı adı veya şifre hatalı.` (mevcut `AuthService.InvalidCredentials`)
  · `Şifre zorunlu.` · `Şifre en fazla 72 bayt olabilir (BCrypt sınırı).`
- **Migration yalnızca komutla üretilir:** `dotnet dotnet-ef migrations add HesapPasiflestirme
  --project src/Grind.Api`. Üretilen dosya ELLE DÜZENLENMEZ.
- **Test:**
  - Veritabanı isteyen testler `[Trait("Category", "Database")]` taşır ve transaction + rollback
    deseniyle yazılır. (İstisna: `WebApplicationFactory` kullanan uçtan uca testler — istek kendi DI
    scope'unda çalıştığı için rollback numarası işlemez; kullanıcı adları `Guid` ile benzersizleştirilir.)
  - Veritabanı çalışıyor olmalı: repo kökünde `docker compose up -d`.
  - Test adları Türkçe.
  - Test projesinde global using olarak yalnızca `Xunit` var; diğer her namespace dosya başına yazılır.
- **Commit mesajları** Türkçe, `feat(...)`/`test(...)`/`refactor(...)`/`fix(...)` önekli, ASCII
  karakterlerle. Her mesaj şu satırla biter:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

---

## Dosya Haritası

**Yeni:**
- `src/Grind.Api/Models/Dtos/Auth/DeleteAccountRequest.cs`
- `src/Grind.Api/Data/Migrations/<zaman>_HesapPasiflestirme.cs` (+ `.Designer.cs`, üretilir)
- `tests/Grind.Tests/Integration/AccountDeactivationTests.cs`

**Değişen:**
- `src/Grind.Api/Models/Entities/User.cs` (+ `DeletedAt`)
- `src/Grind.Api/Data/Migrations/AppDbContextModelSnapshot.cs` (üretilir)
- `src/Grind.Api/Repositories/IUserRepository.cs` / `UserRepository.cs` (+ `ExistsActiveAsync`)
- `src/Grind.Api/Services/IAuthService.cs` / `AuthService.cs` (+ `DeactivateAsync`, login'de geri
  açma, `TimeProvider`)
- `src/Grind.Api/Controllers/AuthController.cs` (+ `DELETE me`)
- `src/Grind.Api/Common/DependencyInjection.cs` (+ `OnTokenValidated` aktiflik kontrolü)
- `src/Grind.Api/Program.cs` (yalnızca `TimeProvider` yorumu)
- `tests/Grind.Tests/Repositories/UserRepositoryTests.cs` (+3)
- `tests/Grind.Tests/Services/AuthServiceTests.cs` (fabrika + yeni testler)

---

### Task 1: `User.DeletedAt` + migration + `ExistsActiveAsync`

**Files:**
- Modify: `src/Grind.Api/Models/Entities/User.cs`
- Create (üretilir): `src/Grind.Api/Data/Migrations/<zaman>_HesapPasiflestirme.cs` + `.Designer.cs`
- Modify (üretilir): `src/Grind.Api/Data/Migrations/AppDbContextModelSnapshot.cs`
- Modify: `src/Grind.Api/Repositories/IUserRepository.cs`
- Modify: `src/Grind.Api/Repositories/UserRepository.cs`
- Test: `tests/Grind.Tests/Repositories/UserRepositoryTests.cs`

**Interfaces:**
- Consumes: yok.
- Produces:
  - `User.DeletedAt`: `DateTime?`, PostgreSQL `timestamp with time zone`, nullable. `null` = aktif.
  - `IUserRepository.ExistsActiveAsync(long id, CancellationToken cancellationToken = default)` →
    `Task<bool>`; `Id` eşleşen VE `DeletedAt == null` olan satır varsa true.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/Grind.Tests/Repositories/UserRepositoryTests.cs` sınıfının SONUNA (son `}`'den önce) ekle.
Dosyanın mevcut `using` listesini koru; `Grind.Api.Models.Entities` ve `Grind.Api.Repositories`
zaten orada olmalı, değilse ekle:

```csharp

    // ---- Faz 13: hesap pasifleştirme ----

    /// <summary>Kimlikli her istekte çağrılan kontrol: aktif kullanıcı için true.</summary>
    [Fact]
    public async Task Aktif_kullanici_ExistsActiveAsync_ile_bulunur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.Add(user);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        Assert.True(await new UserRepository(context).ExistsActiveAsync(user.Id));
    }

    /// <summary>
    /// AYIRT EDİCİ: satır DURUYOR ama pasif. Sorgu yalnızca varlığa baksaydı bu test geçmezdi ve
    /// pasifleştirilen bir hesap elindeki token'la 7 gün daha çalışmaya devam ederdi.
    /// </summary>
    [Fact]
    public async Task Pasif_kullanici_ExistsActiveAsync_ile_bulunmaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        user.DeletedAt = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        context.Add(user);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        Assert.False(await new UserRepository(context).ExistsActiveAsync(user.Id));
    }

    [Fact]
    public async Task Olmayan_kullanici_ExistsActiveAsync_ile_bulunmaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        Assert.False(await new UserRepository(context).ExistsActiveAsync(-1));
    }
```

- [ ] **Step 2: Testlerin derlenmediğini doğrula**

Run: `dotnet build tests/Grind.Tests`
Expected: FAIL — `DeletedAt` ve `ExistsActiveAsync` yok (CS1061).

- [ ] **Step 3: Entity alanını ekle**

`src/Grind.Api/Models/Entities/User.cs` içinde `public DateTime CreatedAt { get; set; }` satırının
ALTINA ekle:

```csharp

    /// <summary>
    /// Hesabın pasifleştirildiği an (UTC); <c>null</c> ise hesap aktiftir (Faz 13 spec Karar 1).
    /// Pasifleştirme HİÇBİR satırı silmez — kullanıcının oturumları, setleri, rekorları, tartıları ve
    /// yorumları olduğu gibi kalır; doğru şifreyle giriş yapmak hesabı geri açar.
    /// </summary>
    public DateTime? DeletedAt { get; set; }
```

`UserConfiguration`'a DOKUNMA: Npgsql `DateTime`'ı kural gereği `timestamptz`'ye eşliyor ve mevcut
`ColumnMappingTests.Tum_datetime_property_leri_timestamptz_olur` bu alanı otomatik olarak kapsıyor
(nullable `DateTime`'ları da tarıyor).

- [ ] **Step 4: Migration'ı üret ve uygula**

Run: `dotnet dotnet-ef migrations add HesapPasiflestirme --project src/Grind.Api`
(`dotnet dotnet-ef` bulunamazsa önce `dotnet tool restore`.)

Üretilen migration'ı OKU (düzenleme). `Up` yalnızca şunu içermeli:
`AddColumn<DateTime>(name: "DeletedAt", table: "Users", type: "timestamp with time zone", nullable: true)`,
`Down` ise onun `DropColumn`'u. Başka bir şey varsa DUR ve raporla.

Run: `dotnet dotnet-ef database update --project src/Grind.Api`
Run: `dotnet dotnet-ef migrations has-pending-model-changes --project src/Grind.Api`
Expected: `No changes have been made to the model since the last migration.`

- [ ] **Step 5: Repository metodunu yaz**

`src/Grind.Api/Repositories/IUserRepository.cs` içine, `UsernameExistsAsync`'in ALTINA ekle:

```csharp

    /// <summary>
    /// Kullanıcı VAR MI ve AKTİF Mİ (<c>DeletedAt IS NULL</c>). Kimlikli her istekte bir kez çağrılır
    /// (Faz 13 spec Karar 3), bu yüzden entity materyalize etmez: birincil anahtar üzerinde tek
    /// <c>EXISTS</c> sorgusu.
    /// </summary>
    Task<bool> ExistsActiveAsync(long id, CancellationToken cancellationToken = default);
```

`src/Grind.Api/Repositories/UserRepository.cs` içine, `UsernameExistsAsync`'in ALTINA ekle:

```csharp

    public Task<bool> ExistsActiveAsync(long id, CancellationToken cancellationToken = default)
        => Set.AnyAsync(u => u.Id == id && u.DeletedAt == null, cancellationToken);
```

`GetByUsernameAsync` ve `UsernameExistsAsync` DEĞİŞMEZ: birincisi pasif kullanıcıyı da döndürmeli
(geri açma onu gerektiriyor), ikincisi pasif adı rezerve tutmalı (spec Karar 4).

- [ ] **Step 6: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~UserRepositoryTests|FullyQualifiedName~ColumnMappingTests|FullyQualifiedName~ModelShapeTests"`
Expected: PASS.

- [ ] **Step 7: Tüm test paketini çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/Grind.Api/Models/Entities/User.cs src/Grind.Api/Data/Migrations src/Grind.Api/Repositories/IUserRepository.cs src/Grind.Api/Repositories/UserRepository.cs tests/Grind.Tests/Repositories/UserRepositoryTests.cs
git commit -m "feat(data): hesap pasiflik damgasi ve aktiflik sorgusu" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `AuthService` — pasifleştirme ve login ile geri açma

**Files:**
- Create: `src/Grind.Api/Models/Dtos/Auth/DeleteAccountRequest.cs`
- Modify: `src/Grind.Api/Services/IAuthService.cs`
- Modify: `src/Grind.Api/Services/AuthService.cs`
- Modify: `src/Grind.Api/Program.cs` (yalnızca yorum)
- Test: `tests/Grind.Tests/Services/AuthServiceTests.cs`

**Interfaces:**
- Consumes: `User.DeletedAt` (Task 1); mevcut `IUserRepository.GetByIdAsync` (izlemeli),
  `GetByUsernameAsync`, `IUnitOfWork.SaveChangesAsync`, `ICurrentUserService.UserId`.
- Produces:
  - `DeleteAccountRequest { string Password }`
  - `IAuthService.DeactivateAsync(DeleteAccountRequest request, CancellationToken cancellationToken = default)` → `Task`
  - `AuthService` kurucusu artık: `(IUserRepository, IUnitOfWork, ITokenService, ICurrentUserService, TimeProvider)`

- [ ] **Step 1: Başarısız testleri yaz**

`tests/Grind.Tests/Services/AuthServiceTests.cs`:

(a) Dosyanın başındaki `using` listesine ekle (yoksa):

```csharp
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
```

(b) Sınıfın içine, `Settings` özelliğinin ALTINA sahte kullanıcı ve saat yardımcılarını ekle:

```csharp
    /// <summary>TR 20:00 (UTC 17:00), 10 Mart — pasifleştirme damgası testte deterministik olsun.</summary>
    private static readonly DateTime An = new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    private sealed class SahteSaat(DateTime utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(utcNow, TimeSpan.Zero);
    }

    private sealed class StubCurrentUser(long userId) : Grind.Api.Common.Security.ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }
```

(c) Mevcut `CreateAsync` fabrikası artık beş bağımlılık veriyor. Gövdesindeki `new AuthService(...)`
çağrısını şununla değiştir (fabrikanın imzası aynı kalır; `StubCurrentUser(0)` kullanılır çünkü bu
testlerin çoğu kimlikli çağrı yapmaz):

```csharp
        var service = new AuthService(
            new UserRepository(context), new UnitOfWork(context), new TokenService(Settings),
            new StubCurrentUser(0), new SahteSaat(An));
```

(d) Sınıfın SONUNA (son `}`'den önce) yeni testleri ekle:

```csharp

    // ---- Faz 13: hesap pasifleştirme ----

    /// <summary>
    /// Pasifleştirmenin sözü: damga düşer ama VERİ DURUR. Sayımlar veritabanından okunuyor —
    /// izleyicideki nesneye bakmak, silinmiş bir satırı fark etmezdi.
    /// </summary>
    [Fact]
    public async Task Pasiflestirme_damgayi_yazar_ve_veriyi_silmez()
    {
        var (_, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            var repository = new UserRepository(context);
            var kayit = new AuthService(
                repository, new UnitOfWork(context), new TokenService(Settings),
                new StubCurrentUser(0), new SahteSaat(An));
            await kayit.RegisterAsync(Register(username));
            var user = (await repository.GetByUsernameAsync(username))!;

            var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            var session = TestDatabase.NewSession(user);
            context.AddRange(exercise, session);
            await context.SaveChangesAsync();

            var service = new AuthService(
                repository, new UnitOfWork(context), new TokenService(Settings),
                new StubCurrentUser(user.Id), new SahteSaat(An));

            await service.DeactivateAsync(new DeleteAccountRequest { Password = Password });

            context.ChangeTracker.Clear();
            var satir = await context.Set<User>().SingleAsync(u => u.Id == user.Id);
            Assert.Equal(An, satir.DeletedAt);
            Assert.Equal(1, await context.Set<Exercise>().CountAsync(e => e.UserId == user.Id));
            Assert.Equal(1, await context.Set<WorkoutSession>().CountAsync(s => s.UserId == user.Id));
        }
    }

    [Fact]
    public async Task Yanlis_sifreyle_pasiflestirme_reddedilir()
    {
        var (_, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            var repository = new UserRepository(context);
            var kayit = new AuthService(
                repository, new UnitOfWork(context), new TokenService(Settings),
                new StubCurrentUser(0), new SahteSaat(An));
            await kayit.RegisterAsync(Register(username));
            var user = (await repository.GetByUsernameAsync(username))!;

            var service = new AuthService(
                repository, new UnitOfWork(context), new TokenService(Settings),
                new StubCurrentUser(user.Id), new SahteSaat(An));

            await Assert.ThrowsAsync<UnauthorizedException>(
                () => service.DeactivateAsync(new DeleteAccountRequest { Password = "bambaska-bir-sifre" }));

            context.ChangeTracker.Clear();
            var satir = await context.Set<User>().SingleAsync(u => u.Id == user.Id);
            Assert.Null(satir.DeletedAt);
        }
    }

    /// <summary>Geri açma (spec Karar 2): doğru şifreyle giriş pasif hesabı yeniden aktifleştirir.</summary>
    [Fact]
    public async Task Pasif_hesap_dogru_sifreyle_giriste_geri_acilir()
    {
        var (service, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            await service.RegisterAsync(Register(username));
            var repository = new UserRepository(context);
            var user = (await repository.GetByUsernameAsync(username))!;
            user.DeletedAt = An;
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            var response = await service.LoginAsync(new LoginRequest { Username = username, Password = Password });

            Assert.False(string.IsNullOrWhiteSpace(response.Token));
            context.ChangeTracker.Clear();
            var satir = await context.Set<User>().SingleAsync(u => u.Id == user.Id);
            Assert.Null(satir.DeletedAt);
        }
    }

    /// <summary>
    /// AYIRT EDİCİ (spec Karar 2): pasiflik kontrolü şifreden SONRA gelmeli. Önce gelseydi yanlış
    /// şifreyle de farklı bir davranış görülür ve hesabın pasifliği sızardı; burada hem mesaj nötr
    /// kalmalı hem de hesap pasif kalmalı.
    /// </summary>
    [Fact]
    public async Task Pasif_hesap_yanlis_sifreyle_giriste_acilmaz()
    {
        var (service, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            await service.RegisterAsync(Register(username));
            var repository = new UserRepository(context);
            var user = (await repository.GetByUsernameAsync(username))!;
            user.DeletedAt = An;
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            var hata = await Assert.ThrowsAsync<UnauthorizedException>(
                () => service.LoginAsync(new LoginRequest { Username = username, Password = "bambaska-bir-sifre" }));

            Assert.Equal(AuthService.InvalidCredentials, hata.Message);
            context.ChangeTracker.Clear();
            var satir = await context.Set<User>().SingleAsync(u => u.Id == user.Id);
            Assert.Equal(An, satir.DeletedAt);
        }
    }

    /// <summary>
    /// Spec Karar 4: pasif hesabın adı REZERVE. Kayıt 409 vermeliydi; vermeseydi aynı adla kayıt olan
    /// biri pasif hesabın şifresini ezip hesabı devralabilirdi — bu yüzden hash'in değişmediği de
    /// ayrıca doğrulanıyor.
    /// </summary>
    [Fact]
    public async Task Pasif_hesabin_adiyla_kayit_reddedilir_ve_sifre_ezilmez()
    {
        var (service, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            await service.RegisterAsync(Register(username));
            var repository = new UserRepository(context);
            var user = (await repository.GetByUsernameAsync(username))!;
            var eskiHash = user.PasswordHash;
            user.DeletedAt = An;
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            await Assert.ThrowsAsync<ConflictException>(() => service.RegisterAsync(
                new RegisterRequest { Username = username, Password = "yepyeni-bir-sifre" }));

            context.ChangeTracker.Clear();
            var satir = await context.Set<User>().SingleAsync(u => u.Id == user.Id);
            Assert.Equal(eskiHash, satir.PasswordHash);
            Assert.Equal(An, satir.DeletedAt);
        }
    }

    /// <summary>Başka kullanıcının hesabı ve verisi etkilenmez (PLAN 13.3).</summary>
    [Fact]
    public async Task Pasiflestirme_baska_kullaniciyi_etkilemez()
    {
        var (_, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var repository = new UserRepository(context);
            var kayit = new AuthService(
                repository, new UnitOfWork(context), new TokenService(Settings),
                new StubCurrentUser(0), new SahteSaat(An));

            var silinecek = UniqueUsername();
            var kalan = UniqueUsername();
            await kayit.RegisterAsync(Register(silinecek));
            await kayit.RegisterAsync(Register(kalan));
            var silinecekUser = (await repository.GetByUsernameAsync(silinecek))!;
            var kalanUser = (await repository.GetByUsernameAsync(kalan))!;

            var service = new AuthService(
                repository, new UnitOfWork(context), new TokenService(Settings),
                new StubCurrentUser(silinecekUser.Id), new SahteSaat(An));
            await service.DeactivateAsync(new DeleteAccountRequest { Password = Password });

            context.ChangeTracker.Clear();
            var digeri = await context.Set<User>().SingleAsync(u => u.Id == kalanUser.Id);
            Assert.Null(digeri.DeletedAt);
        }
    }

    /// <summary>Global egzersizler (UserId = null) hiçbir zaman etkilenmez (PLAN 13.2).</summary>
    [Fact]
    public async Task Pasiflestirme_global_egzersizlere_dokunmaz()
    {
        var (_, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var repository = new UserRepository(context);
            var kayit = new AuthService(
                repository, new UnitOfWork(context), new TokenService(Settings),
                new StubCurrentUser(0), new SahteSaat(An));
            var username = UniqueUsername();
            await kayit.RegisterAsync(Register(username));
            var user = (await repository.GetByUsernameAsync(username))!;
            var globalSayisi = await context.Set<Exercise>().CountAsync(e => e.UserId == null);

            var service = new AuthService(
                repository, new UnitOfWork(context), new TokenService(Settings),
                new StubCurrentUser(user.Id), new SahteSaat(An));
            await service.DeactivateAsync(new DeleteAccountRequest { Password = Password });

            context.ChangeTracker.Clear();
            Assert.Equal(globalSayisi, await context.Set<Exercise>().CountAsync(e => e.UserId == null));
        }
    }
```

Gerekli `using`'ler: `Grind.Api.Common.Exceptions` (zaten var), `Grind.Api.Models.Dtos.Auth` (zaten
var), `Grind.Api.Models.Entities`, `Microsoft.EntityFrameworkCore`.

- [ ] **Step 2: Testlerin derlenmediğini doğrula**

Run: `dotnet build tests/Grind.Tests`
Expected: FAIL — `DeleteAccountRequest` ve `DeactivateAsync` yok; `AuthService` kurucusu 5 argüman almıyor.

- [ ] **Step 3: DTO'yu yaz**

`src/Grind.Api/Models/Dtos/Auth/DeleteAccountRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;
using Grind.Api.Common.Validation;

namespace Grind.Api.Models.Dtos.Auth;

/// <summary>
/// Hesabı pasifleştirmeden önce şifre teyidi (Faz 13 spec Karar 5). 72 baytlık üst sınır
/// <see cref="LoginRequest"/> ile aynı gerekçeyle burada da var: BCrypt.Verify daha uzun girdiyi
/// sessizce keser.
/// </summary>
public class DeleteAccountRequest
{
    [Required(ErrorMessage = "Şifre zorunlu.")]
    [MaxUtf8Bytes(72, ErrorMessage = "Şifre en fazla 72 bayt olabilir (BCrypt sınırı).")]
    public string Password { get; set; } = string.Empty;
}
```

- [ ] **Step 4: Servisi genişlet**

`src/Grind.Api/Services/IAuthService.cs` — `LoginAsync`'in dokümanını güncelle ve yeni metodu ekle:

```csharp
    /// <summary>
    /// Kullanıcı yoksa da şifre yanlışsa da AYNI UnauthorizedException'ı fırlatır. Şifre doğruysa ve
    /// hesap pasifse hesabı yeniden aktifleştirir (Faz 13 spec Karar 2).
    /// </summary>
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Giriş yapmış kullanıcının hesabını pasifleştirir: yalnızca <c>DeletedAt</c> damgalanır, HİÇBİR
    /// satır silinmez. Şifre yanlışsa UnauthorizedException.
    /// </summary>
    Task DeactivateAsync(DeleteAccountRequest request, CancellationToken cancellationToken = default);
```

`src/Grind.Api/Services/AuthService.cs`:

1. Kurucuyu genişlet:

```csharp
public class AuthService(
    IUserRepository userRepository,
    IUnitOfWork unitOfWork,
    ITokenService tokenService,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IAuthService
```

2. `RegisterAsync` içindeki `CreatedAt = DateTime.UtcNow` yerine `CreatedAt = Now()`.

3. `LoginAsync` içinde, `return Respond(user);` satırının ÜSTÜNE ekle:

```csharp
        if (user.DeletedAt is not null)
        {
            // Şifre DOĞRULANDIKTAN sonra: pasiflik bilgisi yanlış şifreyle sızmamalı (spec Karar 2).
            // Ayrı bir "geri aç" ucu yok — doğru şifreyle giriş yapmak niyetin kendisidir.
            user.DeletedAt = null;
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

```

4. `LoginAsync`'in ALTINA yeni metodu ekle:

```csharp
    public async Task DeactivateAsync(
        DeleteAccountRequest request, CancellationToken cancellationToken = default)
    {
        // Kimlik token'dan gelir, gövdeden değil: pasifleştirilecek hesap her zaman çağıranın kendisi.
        var user = await userRepository.GetByIdAsync(currentUser.UserId, cancellationToken)
                   ?? throw new UnauthorizedException(InvalidCredentials);

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedException(InvalidCredentials);
        }

        // Yalnızca damga: oturumlar, setler, rekorlar, tartılar ve yorumlar olduğu gibi kalır.
        user.DeletedAt = Now();
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
```

5. `Normalize`'in yanına ekle:

```csharp
    private DateTime Now() => timeProvider.GetUtcNow().UtcDateTime;
```

- [ ] **Step 5: Program.cs yorumunu güncelle**

`src/Grind.Api/Program.cs` içindeki `TimeProvider` yorumunda `AuthService`'i "hâlâ `DateTime.UtcNow`
kullananlar" listesinden ÇIKAR: cümlenin sonundaki `— AuthService, ExerciseService ve` ifadesini
`— ExerciseService ve` yap. (`AuthService` artık `TimeProvider` kullanıyor; `DeletedAt`'in testte
deterministik olması gerekiyordu.)

- [ ] **Step 6: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~AuthServiceTests"`
Expected: PASS.

- [ ] **Step 7: Tüm test paketini çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/Grind.Api/Models/Dtos/Auth/DeleteAccountRequest.cs src/Grind.Api/Services/IAuthService.cs src/Grind.Api/Services/AuthService.cs src/Grind.Api/Program.cs tests/Grind.Tests/Services/AuthServiceTests.cs
git commit -m "feat(auth): hesap pasiflestirme ve giriste geri acma" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Pasif hesabın token'ı anında geçersizleşir

**Files:**
- Modify: `src/Grind.Api/Common/DependencyInjection.cs`
- Test: `tests/Grind.Tests/Integration/AccountDeactivationTests.cs` (yeni)

**Interfaces:**
- Consumes: `IUserRepository.ExistsActiveAsync` (Task 1); mevcut `AppClaims.UserId`.
- Produces: kimlikli her istekte çalışan aktiflik kontrolü. Pasif hesabın token'ı 401 alır;
  `[AllowAnonymous]` uçları (register/login) etkilenmez.

- [ ] **Step 1: Başarısız testi yaz**

`tests/Grind.Tests/Integration/AccountDeactivationTests.cs` oluştur. Bu test hesabı DOĞRUDAN
veritabanından pasifleştirir — böylece Task 4'ün ucu olmadan da çalışır:

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca: gerçek uygulama, gerçek JWT. Bu testler gerçek veritabanına yazar (istek uygulamanın
/// kendi DI scope'unda çalıştığı için transaction/rollback numarası işlemez), bu yüzden kullanıcı
/// adları Guid ile benzersizleştirilir.
/// </summary>
[Trait("Category", "Database")]
public class AccountDeactivationTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private const string Password = "yeterince-uzun-sifre";

    private static string UniqueUsername() => $"kap_{Guid.NewGuid():N}"[..20];

    /// <summary>Kayıt olur, token'ı yerleştirilmiş bir istemci ve kullanıcı adını döndürür.</summary>
    private async Task<(HttpClient Client, string Username)> RegisteredClientAsync()
    {
        var client = factory.CreateClient();
        var username = UniqueUsername();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = username,
            Password = Password
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);

        return (client, username);
    }

    /// <summary>Ucu beklemeden, doğrudan veritabanından pasifleştirir.</summary>
    private static async Task DeactivateInDatabaseAsync(string username)
    {
        await using var context = TestDatabase.CreateContext();
        var user = await context.Set<User>().SingleAsync(u => u.Username == username);
        user.DeletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Faz 13 spec Karar 3: token 7 gün geçerli. Aktiflik her istekte okunmasaydı, pasifleştirilen
    /// hesap elindeki token'la bir hafta boyunca tüm verisine erişmeye devam ederdi.
    /// </summary>
    [Fact]
    public async Task Pasiflestirilen_hesabin_eski_tokeni_401_alir()
    {
        var (client, username) = await RegisteredClientAsync();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/exercises")).StatusCode);

        await DeactivateInDatabaseAsync(username);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/exercises")).StatusCode);
    }

    /// <summary>Geri açma yolu kapanmamalı: login [AllowAnonymous], token taşımaz, kontrolden geçmez.</summary>
    [Fact]
    public async Task Pasif_hesap_giris_yapip_yeni_tokenla_calisabilir()
    {
        var (client, username) = await RegisteredClientAsync();
        await DeactivateInDatabaseAsync(username);

        var login = await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Username = username,
            Password = Password
        });

        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        var yeni = factory.CreateClient();
        yeni.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);

        Assert.Equal(HttpStatusCode.OK, (await yeni.GetAsync("/api/exercises")).StatusCode);
    }
}
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~AccountDeactivationTests"`
Expected: FAIL — `Pasiflestirilen_hesabin_eski_tokeni_401_alir` 401 yerine 200 görür (kontrol henüz yok).
İkinci test şimdiden geçebilir.

- [ ] **Step 3: Aktiflik kontrolünü ekle**

`src/Grind.Api/Common/DependencyInjection.cs`:

1. Dosyanın başına ekle:

```csharp
using System.Globalization;
using Grind.Api.Repositories;
```

2. `AddJwtBearer(options => { ... })` bloğunun içinde, `options.TokenValidationParameters = ...`
atamasının ALTINA (bloğun sonuna) ekle:

```csharp

                // Token imzayı ve ömrü geçse bile hesap pasifleştirilmişse istek kimliksiz sayılır
                // (Faz 13 spec Karar 3). CLAUDE.md'nin kuralı: zamanla değişebilen bir öznitelik
                // token'a gömülmez, her istekte GÜNCEL durum veritabanından okunur. Token 7 gün
                // geçerli olduğu için bu kontrol olmasaydı pasifleştirme bir hafta boyunca etkisiz
                // kalırdı. [AllowAnonymous] uçları (register/login) token taşımadığı için buradan
                // geçmez — pasif kullanıcının giriş yapıp hesabını geri açması engellenmez.
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        var raw = context.Principal?.FindFirst(AppClaims.UserId)?.Value;

                        if (!long.TryParse(
                                raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var userId))
                        {
                            context.Fail("Token geçerli bir kullanıcı kimliği taşımıyor.");
                            return;
                        }

                        // İstek scope'undan: repository scoped, bu olay ise singleton seçenekler
                        // içinde yaşıyor.
                        var users = context.HttpContext.RequestServices.GetRequiredService<IUserRepository>();

                        if (!await users.ExistsActiveAsync(userId, context.HttpContext.RequestAborted))
                        {
                            context.Fail("Hesap pasif.");
                        }
                    }
                };
```

`context.Fail(...)` mesajı istemciye GİTMEZ; yanıt, fallback politikasının ürettiği 401'in aynısıdır.

- [ ] **Step 4: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~AccountDeactivationTests|FullyQualifiedName~CrossCuttingRegistrationTests|FullyQualifiedName~AuthorizationFallbackTests"`
Expected: PASS.

- [ ] **Step 5: Tüm test paketini çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS. Bu adım kritik: kontrol kimlikli HER isteği etkiliyor, yani tüm uçtan uca testler
onun üzerinden geçiyor.

- [ ] **Step 6: Commit**

```bash
git add src/Grind.Api/Common/DependencyInjection.cs tests/Grind.Tests/Integration/AccountDeactivationTests.cs
git commit -m "feat(auth): pasif hesabin tokeni her istekte reddedilir" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: `DELETE /api/auth/me` + uçtan uca testler

**Files:**
- Modify: `src/Grind.Api/Controllers/AuthController.cs`
- Test: `tests/Grind.Tests/Integration/AccountDeactivationTests.cs`

**Interfaces:**
- Consumes: `IAuthService.DeactivateAsync`, `DeleteAccountRequest` (Task 2); Task 3'ün aktiflik kontrolü.
- Produces: `DELETE /api/auth/me` → 204 / 400 / 401.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/Grind.Tests/Integration/AccountDeactivationTests.cs` sınıfının SONUNA ekle. `DELETE`
gövdesi `HttpClient.DeleteAsync` ile gönderilemez, bu yüzden istek elle kuruluyor:

```csharp

    private static HttpRequestMessage DeleteMe(string? password) => new(HttpMethod.Delete, "/api/auth/me")
    {
        Content = JsonContent.Create(new DeleteAccountRequest { Password = password ?? string.Empty })
    };

    [Fact]
    public async Task Tokensiz_hesap_silme_401_verir()
    {
        var response = await factory.CreateClient().SendAsync(DeleteMe(Password));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Sifresiz_govde_400_verir()
    {
        var (client, _) = await RegisteredClientAsync();

        var response = await client.SendAsync(DeleteMe(null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>Yanlış şifre hesabı kapatmamalı: istemci sonrasında hâlâ çalışabilmeli.</summary>
    [Fact]
    public async Task Yanlis_sifreyle_hesap_silme_401_verir_ve_hesap_acik_kalir()
    {
        var (client, _) = await RegisteredClientAsync();

        var response = await client.SendAsync(DeleteMe("bambaska-bir-sifre"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/exercises")).StatusCode);
    }

    /// <summary>
    /// Fazın tam turu: veri gir → hesabı kapat → token ölür → doğru şifreyle giriş hesabı geri açar →
    /// KAPATMADAN ÖNCE girilen veri hâlâ orada.
    /// </summary>
    [Fact]
    public async Task Hesap_silinir_token_oluru_ve_giris_veriyle_birlikte_geri_getirir()
    {
        var (client, username) = await RegisteredClientAsync();
        var egzersizAdi = $"Gogus {Guid.NewGuid():N}";
        var olusturma = await client.PostAsJsonAsync("/api/exercises", new
        {
            name = egzersizAdi,
            category = "Push"
        });
        olusturma.EnsureSuccessStatusCode();

        var silme = await client.SendAsync(DeleteMe(Password));

        Assert.Equal(HttpStatusCode.NoContent, silme.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/exercises")).StatusCode);

        var login = await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Username = username,
            Password = Password
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        var yeni = factory.CreateClient();
        yeni.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);

        var liste = await yeni.GetStringAsync("/api/exercises");
        Assert.Contains(egzersizAdi, liste);
    }
```

- [ ] **Step 2: Testlerin başarısız olduğunu doğrula**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~AccountDeactivationTests"`
Expected: FAIL — `/api/auth/me` rotası yok; kimlikli istekler 404, tokensiz istek fallback yüzünden
şimdiden 401 alabilir.

- [ ] **Step 3: Ucu ekle**

`src/Grind.Api/Controllers/AuthController.cs` içine, `Login`'in ALTINA ekle:

```csharp

    /// <summary>
    /// Hesabı pasifleştirir: HİÇBİR veri silinmez, kullanıcı giriş yapamaz hâle gelir ve elindeki
    /// token anında geçersizleşir. Doğru şifreyle tekrar giriş yapmak hesabı geri açar; kullanıcı adı
    /// bu süre boyunca rezerve kalır (spec Karar 4). Şifre teyidi gövdededir.
    /// </summary>
    [HttpDelete("me")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DeleteMe(
        DeleteAccountRequest request, CancellationToken cancellationToken)
    {
        await authService.DeactivateAsync(request, cancellationToken);

        return NoContent();
    }
```

`AuthController` zaten `Microsoft.AspNetCore.Authorization`'ı kullanıyor (`[AllowAnonymous]` için),
yeni `using` gerekmez.

- [ ] **Step 4: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~AccountDeactivationTests|FullyQualifiedName~AuthEndpointsTests|FullyQualifiedName~SwaggerDocumentTests"`
Expected: PASS.

- [ ] **Step 5: Release derlemesi ve tüm test paketi**

Run: `dotnet build -c Release`
Expected: 0 uyarı, 0 hata.

Run: `dotnet test tests/Grind.Tests`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/Grind.Api/Controllers/AuthController.cs tests/Grind.Tests/Integration/AccountDeactivationTests.cs
git commit -m "feat(api): hesap silme ucu" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5 (kontrolcü): Dokümantasyon — PLAN.md ve CLAUDE.md

Final tüm-branch incelemesinden ve düzeltmelerinden SONRA kontrolcü (ana oturum) yapar; test sayıları
ancak o noktada kesinleşir.

- [ ] **Step 1: Test sayısını komutla belirle** — `dotnet test tests/Grind.Tests` özetinden.

- [ ] **Step 2: PLAN.md**
  - Durum Özeti'nde Faz 13 → ✅.
  - Faz 13 başlığının altına spec ve plan bağlantıları.
  - 13.0 sorusunun cevabı (soft delete) ve 13.1-13.4'ün yeni hâli: **sıralı hard delete YAPILMADI**,
    yerine pasifleştirme geldi; 13.1'in eski silme sırası, ileride purge gerekirse diye not olarak
    korunur.
  - Test maddesi (katman başına dosyalar ve toplam).
  - "Faz 13'ten devreden notlar": purge/KVKK, şifre sıfırlamanın yokluğu, geri açmanın eski token'ları
    da diriltmesi, kimlikli her istekteki ek okuma.
  - Backend planının bittiğini ve sıradaki adımın frontend kararı olduğunu yaz.

- [ ] **Step 3: CLAUDE.md**
  - Domain Modeli'nde `User` satırına `DeletedAt` eklenir.
  - Yeni bir "Karar (hesap pasifleştirme)" notu: soft delete, login ile geri açma, adın rezerve
    kalması, her istekte aktiflik kontrolü, purge'ün kapsam dışı olması.

- [ ] **Step 4: Commit**

```bash
git add PLAN.md CLAUDE.md
git commit -m "docs: Faz 13 tamamlandi, backend plani kapandi" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Plan öz-incelemesi (yazım sırasında yapıldı)

- **Spec kapsamı:**

  | Spec kararı | Görev |
  |---|---|
  | Karar 1 (`DeletedAt`, migration) | Task 1 |
  | Karar 2 (login geri açar, sıra kritik) | Task 2 |
  | Karar 3 (her istekte aktiflik) | Task 3 |
  | Karar 4 (ad rezerve) | Task 2 (test) + Task 1 (`UsernameExistsAsync` değişmez) |
  | Karar 5 (`DELETE /api/auth/me`) | Task 4 |
  | Karar 6 (`TimeProvider`) | Task 2 |
  | Karar 7 (purge kapsam dışı) | hiçbir görev — bilinçli boşluk, Task 5'te not |
  | Test yüzeyi 1-4 | sırasıyla Task 1, Task 2, Task 3, Task 4 |

- **İsim tutarlılığı:** `ExistsActiveAsync(long, CancellationToken)` Task 1 ve 3'te aynı;
  `DeactivateAsync(DeleteAccountRequest, CancellationToken)` Task 2 ve 4'te aynı; `AuthService`
  kurucusunun beş argümanı Task 2'de tanımlanıp aynı görevin testlerinde kullanılıyor.
- **Dosya çakışması:** `AccountDeactivationTests.cs` Task 3'te oluşturulup Task 4'te genişletiliyor
  (sıralı, çakışma yok). Başka hiçbir dosyaya iki görev dokunmuyor.
- **Bilinen risk:** Task 3 kimlikli HER isteği etkiliyor; bu yüzden hem Task 3 hem Task 4 tüm test
  paketini çalıştırmak zorunda.
