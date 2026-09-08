# Faz 5 — Exercise Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Egzersiz listeleme/oluşturma/güncelleme/arşivleme + medya ekleme-silme; projenin ilk `[Authorize]`'lu controller'ı ve ilk IDOR yüzeyi.

**Architecture:** `ExercisesController` (ince) → `IExerciseService` (sahiplik kararı, isim çakışması) → `IExerciseRepository` + `IRepository<ExerciseMedia>` + `IUnitOfWork`. Kimlik Faz 3'ün `ICurrentUserService`'inden, hata çevirisi Faz 3'ün `GlobalExceptionHandler`'ından.

**Tech Stack:** ASP.NET Core 10, EF Core 10.0.11, xUnit, `WebApplicationFactory` (Faz 4'te kuruldu).

**Spec:** `docs/superpowers/specs/2026-09-02-exercise-design.md` (onaylandı 2026-09-02: A+A+A+A+A+A)

## Global Constraints

- SOLID / DRY / KISS. Controller iş mantığı İÇERMEZ — `if`/`try` yok.
- `DbContext`'e yalnızca `Repositories/` ve `Data/` dokunur.
- **Sahiplik:** kullanıcı yalnızca kendi (`UserId = currentUserId`) veya global (`UserId = null`) egzersizi görür. Başkasının egzersizi → **404** (403 DEĞİL — 403 kaydın varlığını sızdırır). Global kaydı değiştirme girişimi → **403**.
- Silme yok, arşivleme var (`IsArchived = true`).
- Zaman damgaları UTC.
- Bir iş operasyonu TEK bir `SaveChangesAsync()`.
- `using System.ComponentModel.DataAnnotations;` gelen her dosyada `ValidationException` kısa ad çakışmasına dikkat (alias veya tam nitelikli ad).
- Kimlik SADECE `ICurrentUserService` üzerinden okunur; claim'lere elle uzanılmaz.

## Mevcut kod — değiştirilmeyecek imzalar

- `IExerciseRepository.GetVisibleAsync(long userId, bool includeArchived = false, CancellationToken)` → `IReadOnlyList<Exercise>`, isme göre sıralı.
- `IExerciseRepository.GetVisibleByIdAsync(long id, long userId, CancellationToken)` → başkasının egzersizinde `null`. Arşivlileri bilerek dahil eder.
- `IExerciseRepository.NameExistsAsync(long userId, string name, CancellationToken)` — `EF.Functions.ILike` ile büyük/küçük harf gözetmez, globalleri ve arşivlileri de sayar. (Görev 2 buna `excludeId` ekliyor.)
- `IRepository<T>`: `GetByIdAsync`, `Add`, `Remove`. `IRepository<ExerciseMedia>` DI'da açık jenerik olarak zaten kayıtlı.
- `ICurrentUserService.UserId` (long, kimlik yoksa fırlatır), `OwnershipGuard.EnsureOwnedBy(long? ownerId, long currentUserId, string)`.
- `Exercise.Name` max 100, `Exercise.Category` text(20), `ExerciseMedia.Url` max 500, `ExerciseMedia.MediaType` text(20).
- `GrindApiFactory` (`tests/Grind.Tests/Integration/`) — ortam değişkenleriyle `Jwt__Key` ve connection string sağlar.

## Deneyle doğrulanmış gerçekler (varsayım DEĞİL — plan bunlara dayanıyor)

Bu faz için ayrı ayrı ölçüldü:

1. **Varsayılan System.Text.Json enum'u METİNDEN OKUYAMAZ.** `{"Category":"Push"}` → `JsonException`. `JsonStringEnumConverter` eklenmeden `"Push"` göndermek 400 verir. (Görev 5 bunu ekliyor.)
2. **Tanımsız SAYI değeri sessizce bağlanır.** `{"Category":99}` hem converter'lı hem converter'sız hâlde `(ExerciseCategory)99` üretiyor, `Enum.IsDefined` = `False`. Yani converter tek başına yetmez.
3. **`[EnumDataType(typeof(ExerciseCategory))]` bu tanımsız değeri YAKALIYOR** (99 → 1 doğrulama hatası, `Push` → 0). DTO'larda bu yüzden var.
4. **Yerleşik `[Url]` yetersiz:** `javascript:alert(1)` ve `data:text/html,x` ve göreli yolu reddediyor (iyi) ama **`ftp://a.co/x`'i GEÇİRİYOR**. Onaylanan kural "yalnızca mutlak http/https" olduğu için Görev 3 kendi `HttpUrlAttribute`'unu yazıyor.
5. **Fallback authorization policy Swagger'ı kırmıyor** ve `[AllowAnonymous]`'a saygı gösteriyor. Canlı uygulamada ölçüldü:

   | İstek | Sonuç |
   |---|---|
   | `/swagger/index.html` (kimliksiz) | **200** |
   | `/swagger/v1/swagger.json` (kimliksiz) | **200** |
   | `POST /api/auth/register` (kimliksiz) | **200** — `[AllowAnonymous]` çalışıyor |
   | `/api/yok-boyle-bir-yol` (kimliksiz) | **401** — eşleşmeyen yol da politikaya tabi |
   | `/api/yok-boyle-bir-yol` (token'lı) | **404** — normal davranış geri geliyor |

   Yani kimliksiz istekler rota enumerasyonu yapamıyor, kimliği doğrulanmış geliştirici ise normal 404'ü görüyor. Bu istenen davranış, sürpriz değil — Görev 1'in testi bunu kayda geçiriyor.

> **Not (test veritabanı):** Bu fazın testleri gerçek PostgreSQL ister (`docker compose up -d`). Servis testleri Faz 2/4'teki transaction + rollback desenini kullanır; entegrasyon testleri uygulamanın kendi scope'unda çalıştığı için rollback yapamaz, benzersiz isimler kullanır.

---

### Task 1: Fallback authorization policy

Faz 4'ten devreden not bunu bu fazın başına bırakmıştı: şu an işaretlenmeyen her endpoint anonim erişime açık, yani Faz 5-13 boyunca unutulan bir `[Authorize]` sessizce açık kapı bırakır. İlk korumalı controller'ı yazmadan ÖNCE kapatılıyor.

**Files:**
- Modify: `src/Grind.Api/Common/DependencyInjection.cs`
- Test: `tests/Grind.Tests/Integration/AuthorizationFallbackTests.cs`

**Interfaces:**
- Produces: davranış değişikliği — `[Authorize]`/`[AllowAnonymous]` taşımayan her endpoint kimlik ister. Görev 5'in controller'ı bu dünyada yazılacak.

- [ ] **Adım 1: Başarısız testi yaz**

`tests/Grind.Tests/Integration/AuthorizationFallbackTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Grind.Api.Models.Dtos.Auth;

namespace Grind.Tests.Integration;

[Trait("Category", "Database")]
public class AuthorizationFallbackTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static string UniqueUsername() => $"fb_{Guid.NewGuid():N}"[..20];

    /// <summary>Kayıt olup token alır — fallback politikasının kimlik doğrulanmış tarafını sınamak için.</summary>
    private static async Task<string> TokenAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest { Username = UniqueUsername(), Password = "yeterince-uzun-sifre" });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!.Token;
    }

    [Fact]
    public async Task Kimliksiz_istek_eslesmeyen_yolda_bile_401_alir()
    {
        // Fallback politikası yokken bu 404 dönerdi. 401 dönmesi, işaretlenmemiş hiçbir
        // endpoint'in açıkta kalmadığının ("fail closed") doğrudan kanıtı.
        var response = await factory.CreateClient().GetAsync("/api/yok-boyle-bir-yol");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Kimlikli_istek_eslesmeyen_yolda_normal_404_alir()
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", await TokenAsync(client));

        var response = await client.GetAsync("/api/yok-boyle-bir-yol");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Kayit_ve_giris_kimliksiz_erisilebilir_kalir()
    {
        // [AllowAnonymous] fallback politikasını eziyor; ezmeseydi kayıt olmak imkânsızlaşırdı.
        var response = await factory.CreateClient().PostAsJsonAsync("/api/auth/register",
            new RegisterRequest { Username = UniqueUsername(), Password = "yeterince-uzun-sifre" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Swagger_kimliksiz_erisilebilir_kalir()
    {
        var response = await factory.CreateClient().GetAsync("/swagger/v1/swagger.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
```

> `factory.CreateClient()`'ın Development ortamında çalıştığını (Swagger'ın kayıtlı olması için) doğrula. `WebApplicationFactory` varsayılan olarak `Development` kullanır; kullanmıyorsa `WithWebHostBuilder(b => b.UseEnvironment("Development"))` ile ayarla ve bunu rapora yaz.

- [ ] **Adım 2: Testlerin doğru sebeple kırıldığını gör**

Çalıştır: `dotnet test --filter AuthorizationFallbackTests`
Beklenen: `Kimliksiz_istek_eslesmeyen_yolda_bile_401_alir` **404 aldı, 401 bekleniyordu** diye kırılır. Diğer üçü zaten yeşil olabilir — sorun değil, onlar regresyon koruması.

- [ ] **Adım 3: Politikayı ekle**

`src/Grind.Api/Common/DependencyInjection.cs` içinde `services.AddAuthorization();` satırını şununla değiştir:

```csharp
        // Fallback: [Authorize] ya da [AllowAnonymous] TAŞIMAYAN her endpoint kimlik ister.
        // Böylece yeni bir controller'da [Authorize] yazmayı unutmak endpoint'i açıkta
        // bırakmaz, kapatır. Eşleşmeyen yollar da bu politikaya tabidir: kimliksiz bir
        // istemci 404/401 farkından hangi rotaların var olduğunu çıkaramaz.
        services.AddAuthorization(options =>
        {
            options.FallbackPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
        });
```

Gereken `using Microsoft.AspNetCore.Authorization;` satırını dosyanın başına ekle (zaten varsa tekrarlama).

- [ ] **Adım 4: Testleri çalıştır**

Çalıştır: `dotnet test`
Beklenen: tümü yeşil, sayı 151 → **155**.

- [ ] **Adım 5: Kasıtlı kırma ile testin iş gördüğünü kanıtla**

`FallbackPolicy` satırını geçici olarak yorum satırı yap (`AddAuthorization()` sade hâline dönsün), `dotnet test --filter Kimliksiz_istek_eslesmeyen_yolda_bile_401_alir` çalıştır. Test **KIRMIZI** olmalı (404 döner). Geri al, yeşile döndür. Gördüğünü rapora yaz.

- [ ] **Adım 6: Commit**

```bash
git add src/Grind.Api/Common/DependencyInjection.cs tests/Grind.Tests/Integration/AuthorizationFallbackTests.cs
git commit -m "feat(security): fallback authorization policy - isaretlenmeyen endpoint varsayilan olarak kapali"
```

---

### Task 2: Repository — `excludeId` ve `includeMedia`

Servis katmanının ihtiyaç duyduğu ama bugün var olmayan iki yetenek. İkisi de mevcut metotlara opsiyonel parametre olarak ekleniyor; imzalar geriye dönük uyumlu kalıyor.

**Files:**
- Modify: `src/Grind.Api/Repositories/IExerciseRepository.cs`
- Modify: `src/Grind.Api/Repositories/ExerciseRepository.cs`
- Test: `tests/Grind.Tests/Repositories/ExerciseRepositoryTests.cs` (mevcut dosyaya ekleme)

**Interfaces:**
- Produces: `NameExistsAsync(long userId, string name, long? excludeId = null, CancellationToken)` ve `GetVisibleByIdAsync(long id, long userId, bool includeMedia = false, CancellationToken)`. Görev 4 ikisini de kullanır.

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Repositories/ExerciseRepositoryTests.cs` dosyasına ekle (dosyanın mevcut `[Trait("Category", "Database")]` + transaction/rollback desenini birebir taklit et):

```csharp
    /// <summary>
    /// Yeniden adlandırmanın çalışması için gerekli: kaydın kendi adı kendisiyle çakışmamalı.
    /// Bu olmadan yalnızca kategoriyi değiştirmek bile 409 verirdi.
    /// </summary>
    [Fact]
    public async Task NameExistsAsync_dislanan_kaydi_saymaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        repository.Add(exercise);
        await context.SaveChangesAsync();

        Assert.True(await repository.NameExistsAsync(user.Id, exercise.Name));
        Assert.False(await repository.NameExistsAsync(user.Id, exercise.Name, excludeId: exercise.Id));

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task NameExistsAsync_dislama_varken_baska_kaydi_saymaya_devam_eder()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        var name = $"Egzersiz {Guid.NewGuid():N}";
        var first = TestDatabase.NewExercise(user, name);
        var second = TestDatabase.NewExercise(user, $"{name} ikinci");
        repository.Add(first);
        repository.Add(second);
        await context.SaveChangesAsync();

        // second'ı first'ün adına çevirmeye çalışıyoruz: dışlama second'da olsa bile
        // first hâlâ o adı tutuyor, yani çakışma var.
        Assert.True(await repository.NameExistsAsync(user.Id, name, excludeId: second.Id));

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetVisibleByIdAsync_istenirse_medyayi_yukler()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        exercise.Media.Add(new ExerciseMedia
        {
            MediaType = MediaType.Video,
            Url = "https://ornek.com/video.mp4",
            CreatedAt = DateTime.UtcNow
        });
        repository.Add(exercise);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var withMedia = await repository.GetVisibleByIdAsync(exercise.Id, user.Id, includeMedia: true);

        Assert.NotNull(withMedia);
        Assert.Single(withMedia.Media);
        Assert.Equal("https://ornek.com/video.mp4", withMedia.Media.Single().Url);

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetVisibleByIdAsync_varsayilan_olarak_medyayi_yuklemez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        exercise.Media.Add(new ExerciseMedia
        {
            MediaType = MediaType.Gif,
            Url = "https://ornek.com/hareket.gif",
            CreatedAt = DateTime.UtcNow
        });
        repository.Add(exercise);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var withoutMedia = await repository.GetVisibleByIdAsync(exercise.Id, user.Id);

        Assert.NotNull(withoutMedia);
        Assert.Empty(withoutMedia.Media);

        await transaction.RollbackAsync();
    }
```

Gerekli `using Grind.Api.Models.Entities;` ve `using Grind.Api.Models.Enums;` satırlarını dosyanın başına ekle (yoksa).

> `context.ChangeTracker.Clear()` şart: onsuz EF, az önce eklediğin `Exercise`'i takip ettiği için `Media` koleksiyonu zaten dolu gelir ve iki test de anlamsızlaşır — "medya yüklendi" iddiası `Include` sayesinde değil, change tracker sayesinde geçerdi.

- [ ] **Adım 2: Testlerin doğru sebeple kırıldığını gör**

Çalıştır: `dotnet test --filter ExerciseRepositoryTests`
Beklenen: DERLEME hatası — `excludeId` ve `includeMedia` parametreleri yok.

- [ ] **Adım 3: Arayüzü güncelle**

`src/Grind.Api/Repositories/IExerciseRepository.cs` — iki metodun imzasını ve XML doc'unu güncelle:

```csharp
    /// <summary>
    /// Yalnızca kullanıcının erişebildiği bir egzersizi döndürür; başkasının özel
    /// egzersizinde null döner (IDOR koruması). Arşivlenmiş egzersizler bilerek dahil
    /// edilir — geçmiş <c>SetEntry</c>/<c>TemplateExercise</c> kayıtları bu egzersize
    /// referans verir ve çözülebilir kalmalıdır; burada arşiv filtresi uygulamak
    /// geçmiş kayıtları bozar.
    /// </summary>
    /// <param name="includeMedia">
    /// true ise <c>Media</c> koleksiyonu da yüklenir. Varsayılan false: yazma akışlarının
    /// çoğu medyaya dokunmuyor, gereksiz join yapılmasın.
    /// </param>
    Task<Exercise?> GetVisibleByIdAsync(
        long id, long userId, bool includeMedia = false, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bu isim kullanıcı için zaten dolu mu — kendi egzersizlerinde veya globallerde,
    /// büyük/küçük harf gözetmeden, arşivliler dâhil.
    /// </summary>
    /// <param name="excludeId">
    /// Verilirse bu Id'li kayıt sayılmaz. Yeniden adlandırmada gerekli: kaydın kendi adı
    /// kendisiyle çakışmamalı, yoksa yalnızca kategoriyi değiştirmek bile 409 verirdi.
    /// </param>
    Task<bool> NameExistsAsync(
        long userId, string name, long? excludeId = null, CancellationToken cancellationToken = default);
```

- [ ] **Adım 4: Uygulamayı güncelle**

`src/Grind.Api/Repositories/ExerciseRepository.cs`:

```csharp
    public Task<Exercise?> GetVisibleByIdAsync(
        long id, long userId, bool includeMedia = false, CancellationToken cancellationToken = default)
    {
        var query = includeMedia ? Set.Include(e => e.Media) : Set;

        return query.FirstOrDefaultAsync(
            e => e.Id == id && (e.UserId == userId || e.UserId == null), cancellationToken);
    }
```

`NameExistsAsync` — mevcut escape yorumunu ve mantığını AYNEN koru, yalnızca imzayı ve son predicate'i genişlet:

```csharp
    public Task<bool> NameExistsAsync(
        long userId, string name, long? excludeId = null, CancellationToken cancellationToken = default)
    {
        // (mevcut escape yorumu burada aynen kalır)
        var escaped = name
            .Replace("\\", "\\\\")
            .Replace("%", "\\%")
            .Replace("_", "\\_");
        return Set.AnyAsync(
            e => (e.UserId == userId || e.UserId == null)
                 && (excludeId == null || e.Id != excludeId)
                 && EF.Functions.ILike(e.Name, escaped, "\\"),
            cancellationToken);
    }
```

`Include` için `using Microsoft.EntityFrameworkCore;` zaten dosyanın başında var.

- [ ] **Adım 5: Testleri çalıştır**

Çalıştır: `dotnet test`
Beklenen: tümü yeşil, sayı 155 → **159**.

- [ ] **Adım 6: Kasıtlı kırma ile medya testinin iş gördüğünü kanıtla**

`GetVisibleByIdAsync`'teki `includeMedia ? Set.Include(e => e.Media) : Set` ifadesini geçici olarak sadece `Set` yap. `GetVisibleByIdAsync_istenirse_medyayi_yukler` **KIRMIZI** olmalı. Geri al, yeşile döndür. Sonucu rapora yaz.

- [ ] **Adım 7: Commit**

```bash
git add src/Grind.Api/Repositories tests/Grind.Tests/Repositories/ExerciseRepositoryTests.cs
git commit -m "feat(data): ExerciseRepository'ye excludeId ve includeMedia"
```

---

### Task 3: DTO'lar ve `HttpUrlAttribute`

**Files:**
- Create: `src/Grind.Api/Common/Validation/HttpUrlAttribute.cs`
- Create: `src/Grind.Api/Models/Dtos/Exercise/CreateExerciseRequest.cs`
- Create: `src/Grind.Api/Models/Dtos/Exercise/UpdateExerciseRequest.cs`
- Create: `src/Grind.Api/Models/Dtos/Exercise/AddMediaRequest.cs`
- Create: `src/Grind.Api/Models/Dtos/Exercise/ExerciseResponse.cs`
- Create: `src/Grind.Api/Models/Dtos/Exercise/ExerciseMediaResponse.cs`
- Test: `tests/Grind.Tests/Models/Dtos/ExerciseDtoValidationTests.cs`

**Interfaces:**
- Produces: yukarıdaki beş DTO. Görev 4 ve 5 bunları kullanır.

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Models/Dtos/ExerciseDtoValidationTests.cs`:

```csharp
using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Models.Dtos;

public class ExerciseDtoValidationTests
{
    private static IReadOnlyList<ValidationResult> Validate(object model)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true);
        return results;
    }

    private static CreateExerciseRequest Create(string name, ExerciseCategory category = ExerciseCategory.Push) =>
        new() { Name = name, Category = category };

    [Fact]
    public void Gecerli_olusturma_istegi_dogrulamayi_gecer()
    {
        Assert.Empty(Validate(Create("Incline Dumbbell Press")));
    }

    [Theory]
    [InlineData("")]                 // boş
    [InlineData("A")]                // 2 karakterden kısa
    public void Kurala_uymayan_isim_reddedilir(string name)
    {
        Assert.NotEmpty(Validate(Create(name)));
    }

    [Fact]
    public void Yuz_karakterden_uzun_isim_reddedilir()
    {
        // Veritabanı sütunu 100 karakter; burada durdurmazsak 500 alırdık.
        Assert.NotEmpty(Validate(Create(new string('a', 101))));
        Assert.Empty(Validate(Create(new string('a', 100))));
    }

    /// <summary>
    /// System.Text.Json tanımsız bir SAYI değerini sessizce bağlıyor (deneyle doğrulandı:
    /// {"Category":99} → (ExerciseCategory)99, Enum.IsDefined = false). Onu burada durdurmazsak
    /// veritabanına "99" yazılırdı.
    /// </summary>
    [Fact]
    public void Tanimsiz_kategori_degeri_reddedilir()
    {
        Assert.NotEmpty(Validate(Create("Geçerli Ad", (ExerciseCategory)99)));
    }

    [Theory]
    [InlineData("https://ornek.com/video.mp4", true)]
    [InlineData("http://ornek.com/hareket.gif", true)]
    [InlineData("javascript:alert(1)", false)]      // XSS taşıyıcısı
    [InlineData("data:text/html,<script>", false)]  // XSS taşıyıcısı
    [InlineData("ftp://ornek.com/video.mp4", false)] // yerleşik [Url] bunu GEÇİRİRDİ
    [InlineData("/yerel/yol.gif", false)]           // mutlak değil
    public void Medya_urlinde_yalnizca_http_ve_https_kabul_edilir(string url, bool gecerliOlmali)
    {
        var errors = Validate(new AddMediaRequest { MediaType = MediaType.Video, Url = url });

        Assert.Equal(gecerliOlmali, errors.Count == 0);
    }

    [Fact]
    public void Tanimsiz_medya_tipi_reddedilir()
    {
        Assert.NotEmpty(Validate(new AddMediaRequest
        {
            MediaType = (MediaType)42,
            Url = "https://ornek.com/video.mp4"
        }));
    }
}
```

- [ ] **Adım 2: Testlerin doğru sebeple kırıldığını gör**

Çalıştır: `dotnet test --filter ExerciseDtoValidationTests`
Beklenen: DERLEME hatası — `Grind.Api.Models.Dtos.Exercise` ad alanı yok.

- [ ] **Adım 3: `HttpUrlAttribute`'u yaz**

`src/Grind.Api/Common/Validation/HttpUrlAttribute.cs`:

```csharp
using DataAnnotations = System.ComponentModel.DataAnnotations;

namespace Grind.Api.Common.Validation;

/// <summary>
/// Yalnızca mutlak <c>http</c>/<c>https</c> URI kabul eder.
///
/// Yerleşik <c>[Url]</c> neden yetmiyor: <c>javascript:</c> ve <c>data:</c> şemalarını
/// reddediyor (iyi) ama <c>ftp://</c>'yi GEÇİRİYOR (deneyle doğrulandı). Bu alan ileride bir
/// arayüzde kaynak/bağlantı olarak render edilecek; şema listesini veriyi kabul ederken
/// daraltmak, render eden koda güvenmekten ucuz.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field, AllowMultiple = false)]
public sealed class HttpUrlAttribute : DataAnnotations.ValidationAttribute
{
    /// <summary>null/boş burada geçerli sayılır — zorunluluğu [Required] söyler.</summary>
    public override bool IsValid(object? value)
    {
        if (value is not string text || string.IsNullOrEmpty(text))
        {
            return true;
        }

        return Uri.TryCreate(text, UriKind.Absolute, out var uri)
               && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}
```

- [ ] **Adım 4: İstek DTO'larını yaz**

`src/Grind.Api/Models/Dtos/Exercise/CreateExerciseRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Exercise;

public class CreateExerciseRequest
{
    [Required(ErrorMessage = "Egzersiz adı zorunlu.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Egzersiz adı 2-100 karakter olmalı.")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// [EnumDataType] şart: System.Text.Json tanımsız bir sayı değerini (örn. 99) sessizce
    /// bağlıyor, JsonStringEnumConverter açıkken bile.
    /// </summary>
    [EnumDataType(typeof(ExerciseCategory), ErrorMessage = "Geçersiz kategori.")]
    public ExerciseCategory Category { get; set; }
}
```

`src/Grind.Api/Models/Dtos/Exercise/UpdateExerciseRequest.cs` — aynı alanlar, ayrı tip:

```csharp
using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Exercise;

/// <summary>
/// Bugün <see cref="CreateExerciseRequest"/> ile aynı alanları taşıyor ama bilerek ayrı bir
/// tip: oluşturma ve güncelleme farklı zamanlarda ayrışır (örn. güncellemede ad değiştirmeyi
/// yasaklamak istersek), ve tek tip kullanmak Swagger'da iki işlemi aynı şemaya bağlar.
/// </summary>
public class UpdateExerciseRequest
{
    [Required(ErrorMessage = "Egzersiz adı zorunlu.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Egzersiz adı 2-100 karakter olmalı.")]
    public string Name { get; set; } = string.Empty;

    [EnumDataType(typeof(ExerciseCategory), ErrorMessage = "Geçersiz kategori.")]
    public ExerciseCategory Category { get; set; }
}
```

`src/Grind.Api/Models/Dtos/Exercise/AddMediaRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;
using Grind.Api.Common.Validation;
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Exercise;

public class AddMediaRequest
{
    [EnumDataType(typeof(MediaType), ErrorMessage = "Geçersiz medya tipi.")]
    public MediaType MediaType { get; set; }

    [Required(ErrorMessage = "Medya adresi zorunlu.")]
    [StringLength(500, ErrorMessage = "Medya adresi en fazla 500 karakter olabilir.")]
    [HttpUrl(ErrorMessage = "Medya adresi mutlak bir http veya https adresi olmalı.")]
    public string Url { get; set; } = string.Empty;
}
```

- [ ] **Adım 5: Yanıt DTO'larını yaz**

`src/Grind.Api/Models/Dtos/Exercise/ExerciseMediaResponse.cs`:

```csharp
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Exercise;

public record ExerciseMediaResponse(long Id, MediaType MediaType, string Url, DateTime CreatedAt);
```

`src/Grind.Api/Models/Dtos/Exercise/ExerciseResponse.cs`:

```csharp
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Exercise;

/// <summary>
/// <c>UserId</c> bilerek dışarı verilmiyor: istemcinin ihtiyacı olan tek şey kaydın
/// düzenlenebilir olup olmadığı, o da <see cref="IsGlobal"/> ile anlatılıyor. Ham sahip
/// kimliğini yayınlamak başka kullanıcıların Id'lerini sızdırma yolu açar.
/// </summary>
public record ExerciseResponse(
    long Id,
    string Name,
    ExerciseCategory Category,
    bool IsArchived,
    bool IsGlobal,
    IReadOnlyList<ExerciseMediaResponse> Media);
```

- [ ] **Adım 6: Testleri çalıştır**

Çalıştır: `dotnet test`
Beklenen: tümü yeşil, sayı 159 → **171** (12 yeni test; theory her InlineData icin ayri sayilir).

- [ ] **Adım 7: Kasıtlı kırma ile URL testinin iş gördüğünü kanıtla**

`AddMediaRequest.Url` üzerindeki `[HttpUrl]`'ü geçici olarak yerleşik `[Url]` ile değiştir, `dotnet test --filter Medya_urlinde_yalnizca_http_ve_https_kabul_edilir` çalıştır. `ftp://` case'i **KIRMIZI** olmalı (yerleşik `[Url]` onu geçirir). Geri al, yeşile döndür. Sonucu rapora yaz.

- [ ] **Adım 8: Commit**

```bash
git add src/Grind.Api/Common/Validation/HttpUrlAttribute.cs src/Grind.Api/Models/Dtos/Exercise tests/Grind.Tests/Models/Dtos/ExerciseDtoValidationTests.cs
git commit -m "feat(exercise): DTO'lar ve yalnizca http/https kabul eden URL dogrulamasi"
```

---

### Task 4: `IExerciseService` / `ExerciseService`

Bu fazın asıl işi ve projenin ilk IDOR yüzeyi. Testleri veritabanı ister.

**Files:**
- Create: `src/Grind.Api/Services/IExerciseService.cs`
- Create: `src/Grind.Api/Services/ExerciseService.cs`
- Test: `tests/Grind.Tests/Services/ExerciseServiceTests.cs`

**Interfaces:**
- Consumes: Görev 2'nin repository imzaları, Görev 3'ün DTO'ları, `ICurrentUserService`, `OwnershipGuard`, `IRepository<ExerciseMedia>`, `IUnitOfWork`, `NotFoundException`/`ForbiddenException`/`ConflictException`.
- Produces: `IExerciseService`'in sekiz metodu. Görev 5 bunları çağırır.

- [ ] **Adım 1: Arayüzü yaz**

`src/Grind.Api/Services/IExerciseService.cs`:

```csharp
using Grind.Api.Models.Dtos.Exercise;

namespace Grind.Api.Services;

/// <summary>
/// Kimlik <c>ICurrentUserService</c>'ten okunur; çağıran userId GEÇMEZ. Sebep: sahiplik
/// kararını tek bir yerde tutmak — controller'ın yanlış bir kullanıcı Id'si geçirmesi
/// imkânsız olsun.
/// </summary>
public interface IExerciseService
{
    Task<IReadOnlyList<ExerciseResponse>> GetAllAsync(
        bool includeArchived = false, CancellationToken cancellationToken = default);

    /// <summary>Erişilemeyen kayıtta NotFoundException (404) — başkasının kaydı için 403 DEĞİL.</summary>
    Task<ExerciseResponse> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    Task<ExerciseResponse> CreateAsync(
        CreateExerciseRequest request, CancellationToken cancellationToken = default);

    /// <summary>Global egzersizde ForbiddenException (403).</summary>
    Task<ExerciseResponse> UpdateAsync(
        long id, UpdateExerciseRequest request, CancellationToken cancellationToken = default);

    Task ArchiveAsync(long id, CancellationToken cancellationToken = default);

    Task RestoreAsync(long id, CancellationToken cancellationToken = default);

    Task<ExerciseMediaResponse> AddMediaAsync(
        long exerciseId, AddMediaRequest request, CancellationToken cancellationToken = default);

    Task RemoveMediaAsync(
        long exerciseId, long mediaId, CancellationToken cancellationToken = default);
}
```

- [ ] **Adım 2: Başarısız testleri yaz**

`tests/Grind.Tests/Services/ExerciseServiceTests.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class ExerciseServiceTests
{
    /// <summary>Sabit bir kullanıcıyı temsil eder; gerçek HttpContext'e ihtiyaç yok.</summary>
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    private static ExerciseService ServiceFor(AppDbContext context, User user) =>
        new(new ExerciseRepository(context), new Repository<ExerciseMedia>(context),
            new UnitOfWork(context), new StubCurrentUser(user.Id));

    private static string UniqueName() => $"Egzersiz {Guid.NewGuid():N}";

    /// <summary>Bir kullanıcı ve onun için hazır bir servis üretir.</summary>
    private static async Task<(AppDbContext Context, User User, ExerciseService Service, IAsyncDisposable Transaction)>
        CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();
        var user = TestDatabase.NewUser();
        context.Add(user);
        await context.SaveChangesAsync();
        return (context, user, ServiceFor(context, user), transaction);
    }

    private static CreateExerciseRequest Create(string name) =>
        new() { Name = name, Category = ExerciseCategory.Push };

    // ---- Sahiplik / IDOR ----

    [Fact]
    public async Task Baskasinin_egzersizi_okunamaz_404_verir()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, UniqueName());
            context.Add(digerEgzersiz);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(digerEgzersiz.Id));
        }
    }

    [Fact]
    public async Task Baskasinin_egzersizi_guncellenemez_403_DEGIL_404_verir()
    {
        // 403 dönmek "böyle bir kayıt var ama senin değil" bilgisini sızdırırdı; saldırgan
        // Id tarayarak hangi Id'lerin dolu olduğunu haritalayabilirdi (Faz 3 kararı).
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, UniqueName());
            context.Add(digerEgzersiz);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.UpdateAsync(
                digerEgzersiz.Id, new UpdateExerciseRequest { Name = UniqueName(), Category = ExerciseCategory.Pull }));
        }
    }

    [Fact]
    public async Task Baskasinin_egzersizine_medya_eklenemez_404_verir()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, UniqueName());
            context.Add(digerEgzersiz);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.AddMediaAsync(
                digerEgzersiz.Id, new AddMediaRequest { MediaType = MediaType.Video, Url = "https://a.co/v.mp4" }));
        }
    }

    [Fact]
    public async Task Bulunamadi_mesaji_sahiplik_hakkinda_bilgi_vermez()
    {
        // 404-over-403 kararını koruyan test: mesaj "size ait değil" gibi bir şey derse
        // durum kodunu nötrleştirmenin bir anlamı kalmaz.
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, UniqueName());
            context.Add(digerEgzersiz);
            await context.SaveChangesAsync();

            var baskasinin = await Assert.ThrowsAsync<NotFoundException>(
                () => service.GetByIdAsync(digerEgzersiz.Id));
            var hicYok = await Assert.ThrowsAsync<NotFoundException>(
                () => service.GetByIdAsync(999_999_999));

            Assert.Equal(hicYok.Message, baskasinin.Message);
        }
    }

    // ---- Global egzersizler ----

    [Fact]
    public async Task Global_egzersiz_guncellenemez_403_verir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            // Id 1 = seed edilmiş global "Bench Press".
            await Assert.ThrowsAsync<ForbiddenException>(() => service.UpdateAsync(
                1, new UpdateExerciseRequest { Name = UniqueName(), Category = ExerciseCategory.Pull }));
        }
    }

    [Fact]
    public async Task Global_egzersiz_arsivlenemez_403_verir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ForbiddenException>(() => service.ArchiveAsync(1));
        }
    }

    [Fact]
    public async Task Global_egzersize_medya_eklenemez_403_verir()
    {
        // ExerciseMedia'nın sahibi yok: global bir egzersize eklenen medya BÜTÜN kullanıcılara
        // görünürdü. "Global kaydı değiştiremezsin" kuralı bu yüzden medyaya da uzanıyor.
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ForbiddenException>(() => service.AddMediaAsync(
                1, new AddMediaRequest { MediaType = MediaType.Video, Url = "https://a.co/v.mp4" }));
        }
    }

    [Fact]
    public async Task Global_egzersiz_okunabilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var global = await service.GetByIdAsync(1);

            Assert.True(global.IsGlobal);
            Assert.NotEmpty(global.Name);
        }
    }

    // ---- İsim çakışması ----

    [Fact]
    public async Task Ayni_isim_farkli_harf_buyuklugunde_reddedilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var name = UniqueName();
            await service.CreateAsync(Create(name));

            await Assert.ThrowsAsync<ConflictException>(
                () => service.CreateAsync(Create(name.ToUpperInvariant())));
        }
    }

    [Fact]
    public async Task Global_bir_egzersizin_adi_tekrar_kullanilamaz()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var globalAd = (await new ExerciseRepository(context).GetVisibleByIdAsync(1, 0))!.Name;

            await Assert.ThrowsAsync<ConflictException>(() => service.CreateAsync(Create(globalAd)));
        }
    }

    [Fact]
    public async Task Arsivlenmis_bir_egzersizin_adi_hala_dolu_sayilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var name = UniqueName();
            var olusan = await service.CreateAsync(Create(name));
            await service.ArchiveAsync(olusan.Id);

            await Assert.ThrowsAsync<ConflictException>(() => service.CreateAsync(Create(name)));
        }
    }

    [Fact]
    public async Task Yalnizca_kategori_degistirmek_cakisma_saymaz()
    {
        // excludeId olmadan bu 409 verirdi — kayıt kendi adıyla çakışırdı.
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var name = UniqueName();
            var olusan = await service.CreateAsync(Create(name));

            var guncel = await service.UpdateAsync(olusan.Id,
                new UpdateExerciseRequest { Name = name, Category = ExerciseCategory.Legs });

            Assert.Equal(ExerciseCategory.Legs, guncel.Category);
            Assert.Equal(name, guncel.Name);
        }
    }

    // ---- Arşivleme ----

    [Fact]
    public async Task Arsivlenen_egzersiz_varsayilan_listede_gorunmez_ama_istenirse_gorunur()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName()));
            await service.ArchiveAsync(olusan.Id);

            var varsayilan = await service.GetAllAsync();
            var arsivDahil = await service.GetAllAsync(includeArchived: true);

            Assert.DoesNotContain(varsayilan, e => e.Id == olusan.Id);
            Assert.Contains(arsivDahil, e => e.Id == olusan.Id && e.IsArchived);
        }
    }

    [Fact]
    public async Task Arsivden_geri_alinabilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName()));
            await service.ArchiveAsync(olusan.Id);

            await service.RestoreAsync(olusan.Id);

            Assert.Contains(await service.GetAllAsync(), e => e.Id == olusan.Id);
        }
    }

    // ---- Medya ----

    [Fact]
    public async Task Kendi_egzersizine_medya_eklenip_silinebilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName()));

            var medya = await service.AddMediaAsync(olusan.Id,
                new AddMediaRequest { MediaType = MediaType.Gif, Url = "https://ornek.com/hareket.gif" });

            var medyali = await service.GetByIdAsync(olusan.Id);
            Assert.Single(medyali.Media);

            await service.RemoveMediaAsync(olusan.Id, medya.Id);

            Assert.Empty((await service.GetByIdAsync(olusan.Id)).Media);
        }
    }

    [Fact]
    public async Task Baska_egzersize_ait_medya_silinemez_404_verir()
    {
        // mediaId'nin gerçekten bu egzersize ait olduğu doğrulanmazsa, kullanıcı kendi
        // egzersizinin Id'siyle başkasının medyasını silebilirdi.
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var birinci = await service.CreateAsync(Create(UniqueName()));
            var ikinci = await service.CreateAsync(Create(UniqueName()));
            var ikincininMedyasi = await service.AddMediaAsync(ikinci.Id,
                new AddMediaRequest { MediaType = MediaType.Video, Url = "https://ornek.com/v.mp4" });

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.RemoveMediaAsync(birinci.Id, ikincininMedyasi.Id));
        }
    }

    // ---- Oluşturma ----

    [Fact]
    public async Task Olusturulan_egzersiz_kullaniciya_ait_ve_global_degil()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName()));

            Assert.False(olusan.IsGlobal);
            Assert.False(olusan.IsArchived);
            Assert.Contains(await service.GetAllAsync(), e => e.Id == olusan.Id);
        }
    }
}
```

- [ ] **Adım 3: Testlerin doğru sebeple kırıldığını gör**

Çalıştır: `dotnet test --filter ExerciseServiceTests`
Beklenen: DERLEME hatası — `ExerciseService` yok.

- [ ] **Adım 4: Servisi yaz**

`src/Grind.Api/Services/ExerciseService.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class ExerciseService(
    IExerciseRepository exerciseRepository,
    IRepository<ExerciseMedia> mediaRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser) : IExerciseService
{
    /// <summary>
    /// TEK bir "bulunamadı" metni. Sahiplik hakkında hiçbir şey söylemez: "bu kayıt size ait
    /// değil" demek, 403 yerine 404 dönme kararını (Faz 3) tamamen geçersiz kılardı.
    /// </summary>
    private const string NotFound = "Egzersiz bulunamadı.";

    /// <summary>
    /// DİKKAT: <c>OwnershipGuard.EnsureOwnedBy</c>'nin üçüncü parametresi tam bir cümle değil,
    /// bir KAYNAK ADIDIR — guard mesajı kendisi "{ad} üzerinde değişiklik yapma izniniz yok."
    /// şeklinde kuruyor. Buraya cümle geçirmek bozuk bir metin üretir.
    /// </summary>
    private const string GlobalResourceName = "Varsayılan egzersiz";

    public async Task<IReadOnlyList<ExerciseResponse>> GetAllAsync(
        bool includeArchived = false, CancellationToken cancellationToken = default)
    {
        var exercises = await exerciseRepository.GetVisibleAsync(
            currentUser.UserId, includeArchived, cancellationToken);

        return exercises.Select(ToResponse).ToList();
    }

    public async Task<ExerciseResponse> GetByIdAsync(
        long id, CancellationToken cancellationToken = default)
        => ToResponse(await VisibleOrThrowAsync(id, includeMedia: true, cancellationToken));

    public async Task<ExerciseResponse> CreateAsync(
        CreateExerciseRequest request, CancellationToken cancellationToken = default)
    {
        await EnsureNameFreeAsync(request.Name, excludeId: null, cancellationToken);

        var exercise = new Exercise
        {
            UserId = currentUser.UserId,
            Name = request.Name.Trim(),
            Category = request.Category,
            IsArchived = false
        };

        exerciseRepository.Add(exercise);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(exercise);
    }

    public async Task<ExerciseResponse> UpdateAsync(
        long id, UpdateExerciseRequest request, CancellationToken cancellationToken = default)
    {
        var exercise = await OwnedOrThrowAsync(id, includeMedia: true, cancellationToken);
        await EnsureNameFreeAsync(request.Name, excludeId: exercise.Id, cancellationToken);

        exercise.Name = request.Name.Trim();
        exercise.Category = request.Category;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(exercise);
    }

    public Task ArchiveAsync(long id, CancellationToken cancellationToken = default)
        => SetArchivedAsync(id, isArchived: true, cancellationToken);

    public Task RestoreAsync(long id, CancellationToken cancellationToken = default)
        => SetArchivedAsync(id, isArchived: false, cancellationToken);

    public async Task<ExerciseMediaResponse> AddMediaAsync(
        long exerciseId, AddMediaRequest request, CancellationToken cancellationToken = default)
    {
        var exercise = await OwnedOrThrowAsync(exerciseId, includeMedia: false, cancellationToken);

        var media = new ExerciseMedia
        {
            ExerciseId = exercise.Id,
            MediaType = request.MediaType,
            Url = request.Url.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        mediaRepository.Add(media);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(media);
    }

    public async Task RemoveMediaAsync(
        long exerciseId, long mediaId, CancellationToken cancellationToken = default)
    {
        var exercise = await OwnedOrThrowAsync(exerciseId, includeMedia: true, cancellationToken);

        // Medyanın GERÇEKTEN bu egzersize ait olduğu doğrulanmalı: yalnızca mediaId ile
        // silmek, kullanıcının kendi egzersiz Id'siyle başkasının medyasını silmesine
        // izin verirdi (IDOR).
        var media = exercise.Media.FirstOrDefault(m => m.Id == mediaId)
                    ?? throw new NotFoundException(NotFound);

        mediaRepository.Remove(media);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task SetArchivedAsync(
        long id, bool isArchived, CancellationToken cancellationToken)
    {
        var exercise = await OwnedOrThrowAsync(id, includeMedia: false, cancellationToken);

        exercise.IsArchived = isArchived;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Görünür mü? Değilse 404 — başkasının kaydı da "yok" sayılır.</summary>
    private async Task<Exercise> VisibleOrThrowAsync(
        long id, bool includeMedia, CancellationToken cancellationToken)
        => await exerciseRepository.GetVisibleByIdAsync(
               id, currentUser.UserId, includeMedia, cancellationToken)
           ?? throw new NotFoundException(NotFound);

    /// <summary>
    /// Yazma yolları için: önce görünürlük (404), sonra sahiplik (403). Sıra önemli —
    /// görünürlük kontrolü başkasının kaydını zaten eleyeceği için buradaki 403 pratikte
    /// "bu global bir kayıt" anlamına gelir.
    /// </summary>
    private async Task<Exercise> OwnedOrThrowAsync(
        long id, bool includeMedia, CancellationToken cancellationToken)
    {
        var exercise = await VisibleOrThrowAsync(id, includeMedia, cancellationToken);
        OwnershipGuard.EnsureOwnedBy(exercise.UserId, currentUser.UserId, GlobalResourceName);
        return exercise;
    }

    private async Task EnsureNameFreeAsync(
        string name, long? excludeId, CancellationToken cancellationToken)
    {
        if (await exerciseRepository.NameExistsAsync(
                currentUser.UserId, name.Trim(), excludeId, cancellationToken))
        {
            throw new ConflictException($"'{name.Trim()}' adında bir egzersiziniz zaten var.");
        }
    }

    private static ExerciseResponse ToResponse(Exercise exercise) => new(
        exercise.Id,
        exercise.Name,
        exercise.Category,
        exercise.IsArchived,
        IsGlobal: exercise.UserId is null,
        exercise.Media.Select(ToResponse).ToList());

    private static ExerciseMediaResponse ToResponse(ExerciseMedia media) =>
        new(media.Id, media.MediaType, media.Url, media.CreatedAt);
}
```

> **`OwnershipGuard.EnsureOwnedBy`'nin imzasını uygulamadan ÖNCE oku** (`src/Grind.Api/Common/Security/OwnershipGuard.cs`). Üçüncü parametrenin gerçekten bir hata mesajı olduğunu doğrula; değilse mesajı nasıl geçirdiğini plandan sapma olarak rapora yaz.

- [ ] **Adım 5: Testleri çalıştır**

`docker compose up -d` çalışıyor olmalı.
Çalıştır: `dotnet test`
Beklenen: tümü yeşil, sayı 171 → **188** (17 yeni test).

- [ ] **Adım 6: Kasıtlı kırma ile iki testin iş gördüğünü kanıtla**

1. `RemoveMediaAsync`'teki `exercise.Media.FirstOrDefault(m => m.Id == mediaId)` yerine `await mediaRepository.GetByIdAsync(mediaId, cancellationToken)` koy (yani egzersize aitlik kontrolünü kaldır). `Baska_egzersize_ait_medya_silinemez_404_verir` **KIRMIZI** olmalı. Geri al.
2. `EnsureNameFreeAsync`'e geçirilen `excludeId`'yi `UpdateAsync` içinde `null` yap. `Yalnizca_kategori_degistirmek_cakisma_saymaz` **KIRMIZI** olmalı. Geri al.

İkisinin sonucunu da rapora yaz; her kırmadan sonra paketi yeşile döndür.

- [ ] **Adım 7: Commit**

```bash
git add src/Grind.Api/Services tests/Grind.Tests/Services/ExerciseServiceTests.cs
git commit -m "feat(exercise): ExerciseService - sahiplik, isim cakismasi, arsivleme, medya"
```

---

### Task 5: `ExercisesController`, DI, JSON enum ayarı ve faz kapanışı

**Files:**
- Create: `src/Grind.Api/Controllers/ExercisesController.cs`
- Modify: `src/Grind.Api/Services/DependencyInjection.cs`
- Modify: `src/Grind.Api/Program.cs`
- Modify: `PLAN.md`
- Test: `tests/Grind.Tests/Integration/ExerciseEndpointsTests.cs`

**Interfaces:**
- Consumes: Görev 4'ün `IExerciseService`'i, Görev 3'ün DTO'ları.

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Integration/ExerciseEndpointsTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Integration;

[Trait("Category", "Database")]
public class ExerciseEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() } };

    private static string UniqueName() => $"Egzersiz {Guid.NewGuid():N}";

    /// <summary>Yeni bir kullanıcı kaydeder ve token'ı takılı bir istemci döndürür.</summary>
    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = $"ex_{Guid.NewGuid():N}"[..20],
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    [Fact]
    public async Task Tokensiz_listeleme_401_verir()
    {
        var response = await factory.CreateClient().GetAsync("/api/exercises");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// Varsayılan System.Text.Json enum'u metinden OKUYAMAZ ({"category":"Push"} →
    /// JsonException, deneyle doğrulandı). Bu test JsonStringEnumConverter'ın gerçekten
    /// kayıtlı olduğunu uçtan uca kanıtlar.
    /// </summary>
    [Fact]
    public async Task Kategori_METIN_olarak_gonderilip_METIN_olarak_donuyor()
    {
        var client = await AuthenticatedClientAsync();
        var payload = new StringContent(
            $$"""{"name":"{{UniqueName()}}","category":"Legs"}""", Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/api/exercises", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"Legs\"", body);
    }

    [Fact]
    public async Task Tanimsiz_kategori_sayisi_400_verir()
    {
        var client = await AuthenticatedClientAsync();
        var payload = new StringContent(
            $$"""{"name":"{{UniqueName()}}","category":99}""", Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/api/exercises", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Olusturulan_egzersiz_listede_ve_detayda_gorunur()
    {
        var client = await AuthenticatedClientAsync();
        var name = UniqueName();

        var created = await client.PostAsJsonAsync("/api/exercises",
            new CreateExerciseRequest { Name = name, Category = ExerciseCategory.Pull }, Json);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var olusan = await created.Content.ReadFromJsonAsync<ExerciseResponse>(Json);

        var detail = await client.GetFromJsonAsync<ExerciseResponse>($"/api/exercises/{olusan!.Id}", Json);
        var list = await client.GetFromJsonAsync<List<ExerciseResponse>>("/api/exercises", Json);

        Assert.Equal(name, detail!.Name);
        Assert.False(detail.IsGlobal);
        Assert.Contains(list!, e => e.Id == olusan.Id);
    }

    [Fact]
    public async Task Baska_kullanicinin_egzersizi_404_verir()
    {
        var birinci = await AuthenticatedClientAsync();
        var created = await birinci.PostAsJsonAsync("/api/exercises",
            new CreateExerciseRequest { Name = UniqueName(), Category = ExerciseCategory.Push }, Json);
        var olusan = await created.Content.ReadFromJsonAsync<ExerciseResponse>(Json);

        var ikinci = await AuthenticatedClientAsync();
        var response = await ikinci.GetAsync($"/api/exercises/{olusan!.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Global_egzersizi_arsivleme_403_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.DeleteAsync("/api/exercises/1");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Arsivleme_ve_geri_alma_204_verir()
    {
        var client = await AuthenticatedClientAsync();
        var created = await client.PostAsJsonAsync("/api/exercises",
            new CreateExerciseRequest { Name = UniqueName(), Category = ExerciseCategory.Other }, Json);
        var olusan = await created.Content.ReadFromJsonAsync<ExerciseResponse>(Json);

        var arsiv = await client.DeleteAsync($"/api/exercises/{olusan!.Id}");
        var geri = await client.PostAsync($"/api/exercises/{olusan.Id}/restore", null);

        Assert.Equal(HttpStatusCode.NoContent, arsiv.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, geri.StatusCode);
    }

    [Fact]
    public async Task Javascript_semali_medya_400_verir()
    {
        var client = await AuthenticatedClientAsync();
        var created = await client.PostAsJsonAsync("/api/exercises",
            new CreateExerciseRequest { Name = UniqueName(), Category = ExerciseCategory.Push }, Json);
        var olusan = await created.Content.ReadFromJsonAsync<ExerciseResponse>(Json);

        var response = await client.PostAsJsonAsync($"/api/exercises/{olusan!.Id}/media",
            new AddMediaRequest { MediaType = MediaType.Video, Url = "javascript:alert(1)" }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
```

- [ ] **Adım 2: Testlerin doğru sebeple kırıldığını gör**

Çalıştır: `dotnet test --filter ExerciseEndpointsTests`
Beklenen: DERLEME hatası ya da 404'ler — `ExercisesController` yok.

- [ ] **Adım 3: JSON enum ayarını ekle**

`src/Grind.Api/Program.cs` — `builder.Services.AddControllers();` satırını şununla değiştir:

```csharp
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Enum'lar tel üzerinde METİN taşınır ("Push"), sayı değil. Varsayılan
        // System.Text.Json bir enum'u metinden OKUYAMAZ (deneyle doğrulandı: JsonException),
        // ve sayı göndermek hem okunmaz hem de veritabanındaki metin gösterimiyle
        // (EnumToStringConverter) tutarsız olurdu.
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
```

Dosyanın başına `using System.Text.Json.Serialization;` ekle.

> Bu converter tanımsız SAYI değerlerini reddetmiyor (deneyle doğrulandı: `99` yine bağlanıyor) — onu DTO'lardaki `[EnumDataType]` durduruyor. İkisi birlikte gerekli.

- [ ] **Adım 4: DI kaydını ekle**

`src/Grind.Api/Services/DependencyInjection.cs` içindeki `AddApplicationServices`'e ekle:

```csharp
        services.AddScoped<IExerciseService, ExerciseService>();
```

- [ ] **Adım 5: Controller'ı yaz**

`src/Grind.Api/Controllers/ExercisesController.cs`:

```csharp
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// İnce kalır: sahiplik kararı ve isim çakışması servis katmanında, hata çevirisi
/// GlobalExceptionHandler'da. Burada if/try yoktur.
/// </summary>
[ApiController]
[Authorize]
[Route("api/exercises")]
public class ExercisesController(IExerciseService exerciseService) : ControllerBase
{
    /// <summary>Kullanıcının kendi egzersizleri + global egzersizler, isme göre sıralı.</summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ExerciseResponse>>> GetAll(
        [FromQuery] bool includeArchived = false, CancellationToken cancellationToken = default)
        => Ok(await exerciseService.GetAllAsync(includeArchived, cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExerciseResponse>> GetById(
        long id, CancellationToken cancellationToken)
        => Ok(await exerciseService.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ExerciseResponse>> Create(
        CreateExerciseRequest request, CancellationToken cancellationToken)
    {
        var created = await exerciseService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ExerciseResponse>> Update(
        long id, UpdateExerciseRequest request, CancellationToken cancellationToken)
        => Ok(await exerciseService.UpdateAsync(id, request, cancellationToken));

    /// <summary>Arşivler (soft delete) — geçmiş kayıtlar bozulmasın diye satır silinmez.</summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Archive(long id, CancellationToken cancellationToken)
    {
        await exerciseService.ArchiveAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:long}/restore")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Restore(long id, CancellationToken cancellationToken)
    {
        await exerciseService.RestoreAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:long}/media")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExerciseMediaResponse>> AddMedia(
        long id, AddMediaRequest request, CancellationToken cancellationToken)
    {
        var media = await exerciseService.AddMediaAsync(id, request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, media);
    }

    [HttpDelete("{id:long}/media/{mediaId:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveMedia(
        long id, long mediaId, CancellationToken cancellationToken)
    {
        await exerciseService.RemoveMediaAsync(id, mediaId, cancellationToken);
        return NoContent();
    }
}
```

- [ ] **Adım 6: Testleri ve derlemeyi çalıştır**

Çalıştır: `dotnet test` → tümü yeşil, sayı 188 → **196** (8 yeni test).
Çalıştır: `dotnet build -c Release` → 0 uyarı, 0 hata.

- [ ] **Adım 7: Uçtan uca duman testi**

`docker compose up -d`, sonra `dotnet run --project src/Grind.Api`. Swagger'dan ya da curl ile, gerçek bir token alarak:

1. `POST /api/auth/register` → token al
2. `GET /api/exercises` (token'sız) → **401**
3. `GET /api/exercises` (token'lı) → **200**, seed edilmiş global egzersizler görünüyor, `category` alanı **metin** ("Push")
4. `POST /api/exercises` `{"name":"Test Egzersiz","category":"Legs"}` → **201**
5. Aynı adı BÜYÜK harfle tekrar → **409**
6. `PUT /api/exercises/1` (global) → **403**
7. `DELETE /api/exercises/1` (global) → **403**
8. `POST /api/exercises/{kendi}/media` `{"mediaType":"Video","url":"javascript:alert(1)"}` → **400**
9. `POST /api/exercises/{kendi}/media` geçerli https URL ile → **201**
10. `DELETE /api/exercises/{kendi}` → **204**, sonra `GET /api/exercises` listesinde YOK, `?includeArchived=true` ile VAR

Gözlenen durum kodlarını ve gövdeleri rapora yaz. Çalıştıramazsan bunu açıkça söyle — yapmadığın bir doğrulamayı yapmış gibi raporlama.

- [ ] **Adım 8: PLAN.md'yi kapat**

Faz 5 maddelerini (5.1–5.5) tamamlandı olarak işaretle; Faz 0-4'ün biçimini birebir taklit et (önce onları oku). Faz 6'yı "sırada" yap. **"Faz 3'ten devreden notlar" ve "Faz 4'ten devreden notlar" bloklarını SİLME** — ama Faz 4 bloğundaki **fallback authorization policy maddesi bu fazda karşılandı**, onu tamamlandı olarak işaretle (silme, "Faz 5'te yapıldı" diye not düş). Diğer maddeler (rate limiting, register enumeration, `GrindApiFactory` ortam değişkenleri, entegrasyon testlerinin bıraktığı satırlar) geçerliliğini koruyor.

- [ ] **Adım 9: Commit**

```bash
git add src/Grind.Api/Controllers src/Grind.Api/Services/DependencyInjection.cs src/Grind.Api/Program.cs tests/Grind.Tests/Integration/ExerciseEndpointsTests.cs
git commit -m "feat(exercise): ExercisesController, endpointler ve JSON enum ayari"
git add PLAN.md
git commit -m "docs: Faz 5 tamamlandi"
```
