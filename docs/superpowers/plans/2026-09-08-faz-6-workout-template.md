# Faz 6 — WorkoutTemplate Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Antrenman şablonları — bir gün tipinin egzersiz listesi ve hedef set sayıları; liste toptan gönderilir, sıralama diziden türer.

**Architecture:** `TemplatesController` (ince) → `IWorkoutTemplateService` (sahiplik, isim çakışması, egzersiz doğrulaması) → `IWorkoutTemplateRepository` + `IExerciseRepository` + `IRepository<TemplateExercise>` + `IUnitOfWork`.

**Tech Stack:** ASP.NET Core 10, EF Core 10.0.11, xUnit, `WebApplicationFactory`.

**Spec:** `docs/superpowers/specs/2026-09-08-workout-template-design.md` (onaylandı 2026-09-08: A+A+A+A+A+A)

## Global Constraints

- SOLID / DRY / KISS. Controller iş mantığı İÇERMEZ — `if`/`try` yok.
- `DbContext`'e yalnızca `Repositories/` ve `Data/` dokunur.
- **Sahiplik:** `WorkoutTemplate.UserId` nullable DEĞİL — global şablon yok. Görünür olan = sahip olunan; Faz 5'teki 403 dalı burada YOKTUR. Başkasının şablonu → **404**.
- **Şablona eklenen her `ExerciseId` ayrı bir IDOR yüzeyi.** Erişilemeyen bir egzersiz → **404**, mesaj hangi id olduğunu SÖYLEMEDEN.
- Egzersiz görünürlüğü `IExerciseRepository` üzerinden sorulur; `UserId == x || UserId == null` yüklemi servis katmanında satır içi TEKRAR YAZILMAZ (Faz 5'ten devreden not).
- Zaman damgaları UTC. Bir iş operasyonu TEK bir `SaveChangesAsync()`.
- `using System.ComponentModel.DataAnnotations;` gelen dosyalarda `ValidationException` kısa ad çakışmasına dikkat (alias).
- Kimlik SADECE `ICurrentUserService` üzerinden.

## Mevcut kod — değiştirilmeyecek gerçekler

- `WorkoutTemplate`: `Id`, `UserId` (non-null), `Name` (max 100), `CreatedAt`.
- `TemplateExercise`: `Id`, `WorkoutTemplateId`, `ExerciseId`, `OrderIndex`, `PlannedSets`.
- **Faz 1'de zaten konfigüre edilmiş** (bu fazda uygulanmayacak, yalnızca testle doğrulanacak):
  - `TemplateExercise` → `WorkoutTemplate`: **CASCADE**
  - `TemplateExercise` → `Exercise`: **Restrict**
  - `WorkoutSession` → `WorkoutTemplate`: **SET NULL**
  - CHECK: `"PlannedSets" > 0`
  - Index: `(WorkoutTemplateId, OrderIndex)` — unique DEĞİL
- `IExerciseRepository.GetVisibleByIdAsync(id, userId, includeMedia, ct)` arşivlileri bilerek dahil eder.
- `OwnershipGuard.EnsureOwnedBy(long?, long, string)` — üçüncü parametre KAYNAK ADI. **Bu fazda kullanılmıyor**: `UserId` non-null olduğu için repository sorgusu zaten sahiplik filtresi; ayrı bir guard dalı yok.
- `TestDatabase`: `NewUser()`, `NewExercise(owner, name)`, `NewSession(user)`.

## Deneyle doğrulanmış gerçekler (varsayım DEĞİL — plan bunlara dayanıyor)

Bu faz için ölçüldü:

1. **`Validator.TryValidateObject` iç içe koleksiyon elemanlarına GİRMİYOR.** `PlannedSets = 0` olan bir alt eleman listede **0 hata** üretiyor; aynı alt eleman tek başına doğrulandığında 1 hata veriyor.
2. **MVC'nin gerçek doğrulayıcısı (`IObjectModelValidator`, `[ApiController]`'ın kullandığı) GİRİYOR** — hatayı `Exercises[0].PlannedSets` anahtarıyla bildiriyor.

> **Bu ikisinin sonucu bir kuraldır:** iç eleman doğrulama kuralları (örn. `PlannedSets` aralığı) **asla** `Validator.TryValidateObject` ile test EDİLMEZ — öyle bir test sessizce geçer ve hiçbir şey kanıtlamaz. İki geçerli yol var: (a) alt DTO'yu **tek başına** doğrulamak, (b) gerçek HTTP üzerinden **entegrasyon testi**. Plan ikisini de kullanıyor; bu fazın en kolay boş test üretecek yeri burasıdır.

---

### Task 1: Repository katmanı

**Files:**
- Modify: `src/Grind.Api/Repositories/IExerciseRepository.cs`, `ExerciseRepository.cs`
- Create: `src/Grind.Api/Repositories/IWorkoutTemplateRepository.cs`, `WorkoutTemplateRepository.cs`
- Modify: `src/Grind.Api/Data/DependencyInjection.cs`
- Test: `tests/Grind.Tests/Repositories/WorkoutTemplateRepositoryTests.cs` (yeni), `ExerciseRepositoryTests.cs` (ekleme)

**Interfaces:**
- Produces: `IExerciseRepository.GetVisibleByIdsAsync(IReadOnlyCollection<long>, long, CancellationToken)`; `IWorkoutTemplateRepository` (dört metot). Görev 3 hepsini kullanır.

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Repositories/ExerciseRepositoryTests.cs` dosyasına ekle (mevcut `[Trait("Category", "Database")]` + transaction/rollback desenini taklit et):

```csharp
    [Fact]
    public async Task GetVisibleByIdsAsync_kendi_ve_global_egzersizleri_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        var kendi = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        repository.Add(kendi);
        await context.SaveChangesAsync();

        var bulunan = await repository.GetVisibleByIdsAsync([kendi.Id, 1L], user.Id);

        Assert.Equal(2, bulunan.Count);
        Assert.Contains(bulunan, e => e.Id == kendi.Id);
        Assert.Contains(bulunan, e => e.Id == 1L);   // seed edilmiş global

        await transaction.RollbackAsync();
    }

    /// <summary>
    /// Şablona egzersiz eklerken IDOR'u kapatan tek yer burası: başkasının egzersizi
    /// sonuçta HİÇ görünmemeli, ki servis "istenen sayı kadar bulamadım" diyebilsin.
    /// </summary>
    [Fact]
    public async Task GetVisibleByIdsAsync_baskasinin_egzersizini_dondurmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        var digerKullanici = TestDatabase.NewUser();
        var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, $"Egzersiz {Guid.NewGuid():N}");
        context.Add(user);
        repository.Add(digerEgzersiz);
        await context.SaveChangesAsync();

        var bulunan = await repository.GetVisibleByIdsAsync([digerEgzersiz.Id], user.Id);

        Assert.Empty(bulunan);

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetVisibleByIdsAsync_bos_listede_bos_doner()
    {
        await using var context = TestDatabase.CreateContext();
        var repository = new ExerciseRepository(context);

        Assert.Empty(await repository.GetVisibleByIdsAsync([], 1L));
    }

    /// <summary>
    /// Okurken hoşgörülü: arşivlenmiş egzersiz de dönmeli, yoksa onu içeren eski şablonlar
    /// çözülemez hâle gelir. "Yeni ekleme yasak" kuralını servis katmanı uygular.
    /// </summary>
    [Fact]
    public async Task GetVisibleByIdsAsync_arsivlenmis_egzersizi_de_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        var arsivli = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        arsivli.IsArchived = true;
        repository.Add(arsivli);
        await context.SaveChangesAsync();

        var bulunan = await repository.GetVisibleByIdsAsync([arsivli.Id], user.Id);

        Assert.Single(bulunan);
        Assert.True(bulunan[0].IsArchived);

        await transaction.RollbackAsync();
    }
```

`tests/Grind.Tests/Repositories/WorkoutTemplateRepositoryTests.cs`:

```csharp
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class WorkoutTemplateRepositoryTests
{
    private static WorkoutTemplate NewTemplate(User user, string? name = null) => new()
    {
        User = user,
        Name = name ?? $"Sablon {Guid.NewGuid():N}",
        CreatedAt = DateTime.UtcNow
    };

    [Fact]
    public async Task GetAllAsync_yalnizca_kendi_sablonlarini_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutTemplateRepository(context);

        var user = TestDatabase.NewUser();
        var digerKullanici = TestDatabase.NewUser();
        repository.Add(NewTemplate(user));
        repository.Add(NewTemplate(digerKullanici));
        await context.SaveChangesAsync();

        var kendi = await repository.GetAllAsync(user.Id);

        Assert.Single(kendi);
        Assert.All(kendi, t => Assert.Equal(user.Id, t.UserId));

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetOwnedByIdAsync_baskasinin_sablonunda_null_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutTemplateRepository(context);

        var user = TestDatabase.NewUser();
        var digerKullanici = TestDatabase.NewUser();
        var digerSablon = NewTemplate(digerKullanici);
        context.Add(user);
        repository.Add(digerSablon);
        await context.SaveChangesAsync();

        Assert.Null(await repository.GetOwnedByIdAsync(digerSablon.Id, user.Id));

        await transaction.RollbackAsync();
    }

    /// <summary>Sıralama diziden türetiliyor; okurken de o sırayla gelmeli.</summary>
    [Fact]
    public async Task GetOwnedByIdAsync_egzersizleri_OrderIndex_sirasiyla_yukler()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutTemplateRepository(context);

        var user = TestDatabase.NewUser();
        var sablon = NewTemplate(user);
        sablon.TemplateExercises.Add(new TemplateExercise { ExerciseId = 11, OrderIndex = 1, PlannedSets = 3 });
        sablon.TemplateExercises.Add(new TemplateExercise { ExerciseId = 1, OrderIndex = 0, PlannedSets = 4 });
        repository.Add(sablon);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var bulunan = await repository.GetOwnedByIdAsync(sablon.Id, user.Id);

        Assert.NotNull(bulunan);
        Assert.Equal([1L, 11L], bulunan.TemplateExercises.Select(te => te.ExerciseId));
        Assert.All(bulunan.TemplateExercises, te => Assert.NotNull(te.Exercise));

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task NameExistsAsync_buyuk_kucuk_harf_gozetmez_ve_excludeIdyi_saymaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutTemplateRepository(context);

        var user = TestDatabase.NewUser();
        var sablon = NewTemplate(user);
        repository.Add(sablon);
        await context.SaveChangesAsync();

        Assert.True(await repository.NameExistsAsync(user.Id, sablon.Name.ToUpperInvariant()));
        Assert.False(await repository.NameExistsAsync(user.Id, sablon.Name, excludeId: sablon.Id));

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task NameExistsAsync_baska_kullanicinin_sablonunu_saymaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutTemplateRepository(context);

        var user = TestDatabase.NewUser();
        var digerKullanici = TestDatabase.NewUser();
        var digerSablon = NewTemplate(digerKullanici);
        context.Add(user);
        repository.Add(digerSablon);
        await context.SaveChangesAsync();

        Assert.False(await repository.NameExistsAsync(user.Id, digerSablon.Name));

        await transaction.RollbackAsync();
    }
}
```

> `context.ChangeTracker.Clear()` şart: onsuz EF az önce eklenen nesneleri takip ettiği için sıralama testi `Include` sayesinde değil, bellekteki koleksiyon sayesinde geçerdi.

- [ ] **Adım 2: Testlerin doğru sebeple kırıldığını gör**

Çalıştır: `dotnet test --filter WorkoutTemplateRepositoryTests`
Beklenen: DERLEME hatası — `WorkoutTemplateRepository` ve `GetVisibleByIdsAsync` yok.

- [ ] **Adım 3: `GetVisibleByIdsAsync`'i ekle**

`IExerciseRepository.cs`'e:

```csharp
    /// <summary>
    /// Verilen id'lerden yalnızca kullanıcının ERİŞEBİLDİKLERİNİ döndürür. Şablon gibi çok
    /// egzersizli akışlar için toplu sorgu: N egzersiz için N ayrı gidiş-dönüş yapılmasın.
    /// Erişilemeyen id'ler sonuçta HİÇ yer almaz — çağıran, dönen sayı ile istenen sayıyı
    /// karşılaştırarak "hepsi erişilebilir mi" sorusunu tek adımda cevaplar.
    /// Arşivlenmiş egzersizler bilerek dahil edilir (bkz. GetVisibleByIdAsync).
    /// </summary>
    Task<IReadOnlyList<Exercise>> GetVisibleByIdsAsync(
        IReadOnlyCollection<long> ids, long userId, CancellationToken cancellationToken = default);
```

`ExerciseRepository.cs`'e:

```csharp
    public async Task<IReadOnlyList<Exercise>> GetVisibleByIdsAsync(
        IReadOnlyCollection<long> ids, long userId, CancellationToken cancellationToken = default)
        => await Set
            .Where(e => ids.Contains(e.Id) && (e.UserId == userId || e.UserId == null))
            .ToListAsync(cancellationToken);
```

- [ ] **Adım 4: Şablon repository'sini yaz**

`src/Grind.Api/Repositories/IWorkoutTemplateRepository.cs`:

```csharp
using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

/// <summary>
/// Exercise'ın aksine şablonun global hâli YOKTUR (<c>UserId</c> nullable değil), bu yüzden
/// metot adları "Visible" değil "Owned": görünür olan zaten sahip olunandır.
/// </summary>
public interface IWorkoutTemplateRepository : IRepository<WorkoutTemplate>
{
    Task<IReadOnlyList<WorkoutTemplate>> GetAllAsync(
        long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Egzersiz listesini <c>OrderIndex</c> sırasıyla ve her satırın <c>Exercise</c>'ıyla
    /// birlikte yükler — yanıt DTO'su egzersizin adını ve kategorisini gösteriyor.
    /// Başkasının şablonunda null döner (IDOR koruması).
    /// </summary>
    Task<WorkoutTemplate?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default);

    /// <summary>Büyük/küçük harf gözetmez. <paramref name="excludeId"/> verilirse o kayıt sayılmaz.</summary>
    Task<bool> NameExistsAsync(
        long userId, string name, long? excludeId = null, CancellationToken cancellationToken = default);
}
```

`src/Grind.Api/Repositories/WorkoutTemplateRepository.cs`:

```csharp
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class WorkoutTemplateRepository(AppDbContext context)
    : Repository<WorkoutTemplate>(context), IWorkoutTemplateRepository
{
    public async Task<IReadOnlyList<WorkoutTemplate>> GetAllAsync(
        long userId, CancellationToken cancellationToken = default)
        => await WithExercises(Set)
            .Where(t => t.UserId == userId)
            .OrderBy(t => t.Name)
            .ToListAsync(cancellationToken);

    public Task<WorkoutTemplate?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default)
        => WithExercises(Set)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, cancellationToken);

    public Task<bool> NameExistsAsync(
        long userId, string name, long? excludeId = null, CancellationToken cancellationToken = default)
    {
        // Escaping ve ILike gerekçesi ExerciseRepository.NameExistsAsync'te ayrıntılı
        // anlatıldı: .NET'in ToLowerInvariant'ı ile PostgreSQL'in lower()'ı Türkçe İ'de
        // ayrışıyor, ve isimdeki % / _ joker olarak yorumlanmamalı.
        var escaped = name
            .Replace("\\", "\\\\")
            .Replace("%", "\\%")
            .Replace("_", "\\_");

        return Set.AnyAsync(
            t => t.UserId == userId
                 && (excludeId == null || t.Id != excludeId)
                 && EF.Functions.ILike(t.Name, escaped, "\\"),
            cancellationToken);
    }

    /// <summary>Liste ve detay aynı şekli döndürüyor — Faz 5'teki "liste boş medya döndürüyor"
    /// karışıklığı tekrarlanmasın diye şablon listesi de egzersizleriyle birlikte geliyor.</summary>
    private static IQueryable<WorkoutTemplate> WithExercises(IQueryable<WorkoutTemplate> query)
        => query
            .Include(t => t.TemplateExercises.OrderBy(te => te.OrderIndex))
            .ThenInclude(te => te.Exercise);
}
```

- [ ] **Adım 5: DI kaydını ekle**

`src/Grind.Api/Data/DependencyInjection.cs` içindeki `AddPersistence`'a, diğer repository kayıtlarının yanına:

```csharp
        services.AddScoped<IWorkoutTemplateRepository, WorkoutTemplateRepository>();
```

- [ ] **Adım 6: Testleri çalıştır**

`docker compose up -d` çalışıyor olmalı.
Çalıştır: `dotnet test`
Beklenen: tümü yeşil, sayı 214 → **223** (9 yeni test).

- [ ] **Adım 7: Kasıtlı kırma ile iki testin iş gördüğünü kanıtla**

1. `GetVisibleByIdsAsync`'teki `&& (e.UserId == userId || e.UserId == null)` koşulunu kaldır. `GetVisibleByIdsAsync_baskasinin_egzersizini_dondurmez` **KIRMIZI** olmalı. Geri al.
2. `WithExercises`'teki `.OrderBy(te => te.OrderIndex)` ifadesini kaldır ve `GetOwnedByIdAsync_egzersizleri_OrderIndex_sirasiyla_yukler` testini çalıştır. Test kırmızı olabilir de olmayabilir de (veritabanı satırları tesadüfen doğru sırada dönebilir) — **gördüğünü olduğu gibi raporla**, kırmızı vermezse testin bu yönü zayıf demektir, uydurma.

Sonuçları rapora yaz; her kırmadan sonra paketi yeşile döndür.

- [ ] **Adım 8: Commit**

```bash
git add src/Grind.Api/Repositories src/Grind.Api/Data/DependencyInjection.cs tests/Grind.Tests/Repositories
git commit -m "feat(data): toplu egzersiz gorunurlugu ve WorkoutTemplate repository'si"
```

---

### Task 2: DTO'lar

**Files:**
- Create: `src/Grind.Api/Models/Dtos/Template/TemplateExerciseRequest.cs`, `CreateTemplateRequest.cs`, `UpdateTemplateRequest.cs`, `PatchTemplateRequest.cs`, `TemplateExerciseResponse.cs`, `TemplateResponse.cs`
- Test: `tests/Grind.Tests/Models/Dtos/TemplateDtoValidationTests.cs`

**Interfaces:**
- Produces: altı DTO. Görev 3 ve 4 kullanır.

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Models/Dtos/TemplateDtoValidationTests.cs`:

```csharp
using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Dtos.Template;

namespace Grind.Tests.Models.Dtos;

/// <summary>
/// DİKKAT: <c>Validator.TryValidateObject</c> İÇ İÇE koleksiyon elemanlarına GİRMEZ
/// (deneyle ölçüldü: PlannedSets = 0 olan bir alt eleman listede 0 hata üretiyor).
/// Bu yüzden alt eleman kuralları burada YALNIZCA alt DTO tek başına doğrulanarak test
/// edilir; listenin içindeyken çalıştığı Görev 4'ün entegrasyon testiyle kanıtlanır.
/// Bu ayrımı bozup "liste içinde bozuk eleman" testi yazmak, sessizce geçen boş bir test üretir.
/// </summary>
public class TemplateDtoValidationTests
{
    private static IReadOnlyList<ValidationResult> Validate(object model)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true);
        return results;
    }

    private static CreateTemplateRequest Create(string name) => new()
    {
        Name = name,
        Exercises = [new TemplateExerciseRequest { ExerciseId = 1, PlannedSets = 4 }]
    };

    [Fact]
    public void Gecerli_olusturma_istegi_dogrulamayi_gecer()
    {
        Assert.Empty(Validate(Create("Push Day A")));
    }

    [Theory]
    [InlineData("")]
    [InlineData("A")]
    public void Kurala_uymayan_sablon_adi_reddedilir(string name)
    {
        Assert.NotEmpty(Validate(Create(name)));
    }

    [Fact]
    public void Yuz_karakterden_uzun_ad_reddedilir()
    {
        Assert.NotEmpty(Validate(Create(new string('a', 101))));
        Assert.Empty(Validate(Create(new string('a', 100))));
    }

    /// <summary>Önce şablonu oluşturup sonra doldurmak doğal bir akış.</summary>
    [Fact]
    public void Bos_egzersiz_listesi_kabul_edilir()
    {
        Assert.Empty(Validate(new CreateTemplateRequest { Name = "Bos Sablon", Exercises = [] }));
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(1, true)]
    [InlineData(50, true)]
    [InlineData(51, false)]
    [InlineData(-1, false)]
    public void Alt_DTO_tek_basina_PlannedSets_araligini_uygular(int plannedSets, bool gecerliOlmali)
    {
        // Tek başına doğrulanıyor — listenin içinde değil. Sebep sınıfın doc'unda.
        var errors = Validate(new TemplateExerciseRequest { ExerciseId = 1, PlannedSets = plannedSets });

        Assert.Equal(gecerliOlmali, errors.Count == 0);
    }

    [Fact]
    public void Alt_DTO_gecersiz_ExerciseId_reddeder()
    {
        Assert.NotEmpty(Validate(new TemplateExerciseRequest { ExerciseId = 0, PlannedSets = 4 }));
    }

    /// <summary>
    /// PATCH'te ikisi de null DTO katmanını GEÇER (nullable alanlarda kural yok) — "en az bir
    /// alan" kontrolü servis katmanının işi. Bu test o sınırı kayda geçiriyor.
    /// </summary>
    [Fact]
    public void Patch_istegi_bos_haliyle_DTO_katmanini_gecer()
    {
        Assert.Empty(Validate(new PatchTemplateRequest()));
    }
}
```

- [ ] **Adım 2: Testlerin doğru sebeple kırıldığını gör**

Çalıştır: `dotnet test --filter TemplateDtoValidationTests`
Beklenen: DERLEME hatası — `Grind.Api.Models.Dtos.Template` ad alanı yok.

- [ ] **Adım 3: İstek DTO'larını yaz**

`src/Grind.Api/Models/Dtos/Template/TemplateExerciseRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// Şablondaki tek bir satır. <c>OrderIndex</c> BURADA YOK — sıralama dizideki konumdan
/// türetilir, böylece çakışan indeks, boşluk veya negatif değer oluşamaz.
/// </summary>
public class TemplateExerciseRequest
{
    [Range(1, long.MaxValue, ErrorMessage = "Geçerli bir egzersiz seçilmeli.")]
    public long ExerciseId { get; set; }

    /// <summary>Veritabanında da CHECK ile korunuyor (<c>PlannedSets &gt; 0</c>).</summary>
    [Range(1, 50, ErrorMessage = "Hedef set sayısı 1-50 arasında olmalı.")]
    public int PlannedSets { get; set; }
}
```

`src/Grind.Api/Models/Dtos/Template/CreateTemplateRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Template;

public class CreateTemplateRequest
{
    [Required(ErrorMessage = "Şablon adı zorunlu.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Şablon adı 2-100 karakter olmalı.")]
    public string Name { get; set; } = string.Empty;

    /// <summary>Boş olabilir: önce şablonu açıp sonra doldurmak doğal bir akış.</summary>
    public List<TemplateExerciseRequest> Exercises { get; set; } = [];
}
```

`src/Grind.Api/Models/Dtos/Template/UpdateTemplateRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// Tam değiştirme (PUT): ad ve egzersiz listesinin tamamı. Yalnızca bir alanı değiştirmek
/// için <see cref="PatchTemplateRequest"/> kullanılır.
/// </summary>
public class UpdateTemplateRequest
{
    [Required(ErrorMessage = "Şablon adı zorunlu.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Şablon adı 2-100 karakter olmalı.")]
    public string Name { get; set; } = string.Empty;

    public List<TemplateExerciseRequest> Exercises { get; set; } = [];
}
```

`src/Grind.Api/Models/Dtos/Template/PatchTemplateRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// Kısmi güncelleme: yalnızca GÖNDERİLEN alan değişir. <c>null</c> "bu alana dokunma"
/// demektir. <c>Exercises</c> gönderilirse liste TOPTAN değişir (kısmi liste birleştirme
/// yok — hangi satırın kalacağı belirsiz olurdu).
/// </summary>
public class PatchTemplateRequest
{
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Şablon adı 2-100 karakter olmalı.")]
    public string? Name { get; set; }

    public List<TemplateExerciseRequest>? Exercises { get; set; }
}
```

- [ ] **Adım 4: Yanıt DTO'larını yaz**

`src/Grind.Api/Models/Dtos/Template/TemplateExerciseResponse.cs`:

```csharp
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// <paramref name="IsArchived"/> bilerek gösteriliyor: arşivlenmiş bir egzersiz yeni
/// şablonlara EKLENEMEZ ama var olan şablonlarda görünmeye devam eder — arayüz bunu
/// "artık kullanılmıyor" rozetiyle gösterebilsin.
/// </summary>
public record TemplateExerciseResponse(
    long Id,
    long ExerciseId,
    string ExerciseName,
    ExerciseCategory Category,
    bool IsArchived,
    int OrderIndex,
    int PlannedSets);
```

`src/Grind.Api/Models/Dtos/Template/TemplateResponse.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// <paramref name="Exercises"/> hem listede hem detayda DOLU gelir. Faz 5'te liste ucunun
/// her zaman boş <c>media</c> döndürmesi "medyası yok mu, yüklenmedi mi?" karışıklığı
/// yaratmıştı; şablon sayısı azken aynı hatayı tekrarlamaya gerek yok.
/// </summary>
public record TemplateResponse(
    long Id,
    string Name,
    DateTime CreatedAt,
    IReadOnlyList<TemplateExerciseResponse> Exercises);
```

- [ ] **Adım 5: Testleri çalıştır**

Çalıştır: `dotnet test`
Beklenen: tümü yeşil, sayı 223 → **235** (12 yeni test; iki theory 2 ve 5 InlineData taşıyor, xUnit her case-i ayrı sayar).

- [ ] **Adım 6: Kasıtlı kırma**

`TemplateExerciseRequest.PlannedSets` üzerindeki `[Range(1, 50)]`'i kaldır ve
`Alt_DTO_tek_basina_PlannedSets_araligini_uygular` çalıştır. `0`, `51` ve `-1` case'leri
**KIRMIZI** olmalı. Geri al, yeşile döndür. Sonucu rapora yaz.

- [ ] **Adım 7: Commit**

```bash
git add src/Grind.Api/Models/Dtos/Template tests/Grind.Tests/Models/Dtos/TemplateDtoValidationTests.cs
git commit -m "feat(template): sablon DTO'lari"
```

---

### Task 3: `IWorkoutTemplateService` / `WorkoutTemplateService`

Bu fazın asıl işi. Testleri veritabanı ister.

**Files:**
- Create: `src/Grind.Api/Services/IWorkoutTemplateService.cs`, `WorkoutTemplateService.cs`
- Test: `tests/Grind.Tests/Services/WorkoutTemplateServiceTests.cs`

**Interfaces:**
- Consumes: Görev 1'in repository'leri, Görev 2'nin DTO'ları, `IRepository<TemplateExercise>`, `IUnitOfWork`, `ICurrentUserService`, `NotFoundException`/`ValidationException`/`ConflictException`.
- Produces: `IWorkoutTemplateService`'in altı metodu. Görev 4 çağırır.

- [ ] **Adım 1: Arayüzü yaz**

`src/Grind.Api/Services/IWorkoutTemplateService.cs`:

```csharp
using Grind.Api.Models.Dtos.Template;

namespace Grind.Api.Services;

public interface IWorkoutTemplateService
{
    Task<IReadOnlyList<TemplateResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Başkasının şablonunda NotFoundException (404).</summary>
    Task<TemplateResponse> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    Task<TemplateResponse> CreateAsync(
        CreateTemplateRequest request, CancellationToken cancellationToken = default);

    Task<TemplateResponse> UpdateAsync(
        long id, UpdateTemplateRequest request, CancellationToken cancellationToken = default);

    /// <summary>Yalnızca null olmayan alanlar uygulanır; hiçbiri yoksa ValidationException (400).</summary>
    Task<TemplateResponse> PatchAsync(
        long id, PatchTemplateRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// GERÇEK siler (Exercise'ın aksine). TemplateExercise satırları CASCADE ile gider,
    /// WorkoutSession.TemplateId SET NULL olur — geçmiş oturum silinmez.
    /// </summary>
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
```

- [ ] **Adım 2: Başarısız testleri yaz**

`tests/Grind.Tests/Services/WorkoutTemplateServiceTests.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Template;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class WorkoutTemplateServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    private static async Task<(AppDbContext Context, User User, WorkoutTemplateService Service, IAsyncDisposable Transaction)>
        CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();
        var user = TestDatabase.NewUser();
        context.Add(user);
        await context.SaveChangesAsync();

        var service = new WorkoutTemplateService(
            new WorkoutTemplateRepository(context), new ExerciseRepository(context),
            new Repository<TemplateExercise>(context), new UnitOfWork(context),
            new StubCurrentUser(user.Id));

        return (context, user, service, transaction);
    }

    private static string UniqueName() => $"Sablon {Guid.NewGuid():N}";

    private static TemplateExerciseRequest Satir(long exerciseId, int plannedSets = 4) =>
        new() { ExerciseId = exerciseId, PlannedSets = plannedSets };

    private static CreateTemplateRequest Create(string name, params TemplateExerciseRequest[] satirlar) =>
        new() { Name = name, Exercises = [.. satirlar] };

    // ---- Oluşturma ve sıralama ----

    [Fact]
    public async Task Olusturulan_sablon_listede_gorunur()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1), Satir(11, 3)));

            Assert.Equal(2, olusan.Exercises.Count);
            Assert.Contains(await service.GetAllAsync(), t => t.Id == olusan.Id);
        }
    }

    /// <summary>Sıra istemciden gelmiyor, dizideki konumdan türüyor — çakışma imkânsız.</summary>
    [Fact]
    public async Task OrderIndex_dizideki_konumdan_turer()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(11), Satir(1), Satir(6)));

            Assert.Equal([0, 1, 2], olusan.Exercises.Select(e => e.OrderIndex));
            Assert.Equal([11L, 1L, 6L], olusan.Exercises.Select(e => e.ExerciseId));
        }
    }

    [Fact]
    public async Task Bos_sablon_olusturulabilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(new CreateTemplateRequest { Name = UniqueName(), Exercises = [] });

            Assert.Empty(olusan.Exercises);
        }
    }

    // ---- Sahiplik / IDOR ----

    [Fact]
    public async Task Baskasinin_sablonu_okunamaz_404_verir()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerSablon = new WorkoutTemplate { User = digerKullanici, Name = UniqueName(), CreatedAt = DateTime.UtcNow };
            context.Add(digerSablon);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(digerSablon.Id));
        }
    }

    [Fact]
    public async Task Baskasinin_sablonu_guncellenemez_404_verir()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerSablon = new WorkoutTemplate { User = digerKullanici, Name = UniqueName(), CreatedAt = DateTime.UtcNow };
            context.Add(digerSablon);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.UpdateAsync(
                digerSablon.Id, new UpdateTemplateRequest { Name = UniqueName(), Exercises = [] }));
        }
    }

    /// <summary>
    /// Şablona eklenen HER egzersiz id'si ayrı bir IDOR yüzeyi: başkasının egzersizini
    /// kendi şablonuna referans veremezsin.
    /// </summary>
    [Fact]
    public async Task Baskasinin_egzersizi_sablona_eklenemez_404_verir()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, $"Egzersiz {Guid.NewGuid():N}");
            context.Add(digerEgzersiz);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.CreateAsync(Create(UniqueName(), Satir(digerEgzersiz.Id))));
        }
    }

    [Fact]
    public async Task Var_olmayan_egzersiz_id_si_404_verir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<NotFoundException>(
                () => service.CreateAsync(Create(UniqueName(), Satir(999_999_999))));
        }
    }

    /// <summary>
    /// 404 mesajı hangi id'nin erişilemez olduğunu SÖYLEMEMELİ — söylerse saldırgan
    /// id tarayarak hangi id'lerin dolu olduğunu haritalayabilir (Faz 3 kararı).
    /// </summary>
    [Fact]
    public async Task Erisilemeyen_egzersiz_mesaji_id_sizdirmaz()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, $"Egzersiz {Guid.NewGuid():N}");
            context.Add(digerEgzersiz);
            await context.SaveChangesAsync();

            var baskasinin = await Assert.ThrowsAsync<NotFoundException>(
                () => service.CreateAsync(Create(UniqueName(), Satir(digerEgzersiz.Id))));
            var hicYok = await Assert.ThrowsAsync<NotFoundException>(
                () => service.CreateAsync(Create(UniqueName(), Satir(999_999_999))));

            Assert.Equal(hicYok.Message, baskasinin.Message);
            Assert.DoesNotContain(digerEgzersiz.Id.ToString(), baskasinin.Message);
        }
    }

    // ---- Egzersiz kuralları ----

    [Fact]
    public async Task Ayni_egzersiz_iki_kez_eklenemez()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(
                () => service.CreateAsync(Create(UniqueName(), Satir(1), Satir(1, 3))));
        }
    }

    [Fact]
    public async Task Arsivlenmis_egzersiz_sablona_eklenemez()
    {
        var (context, user, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var arsivli = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            arsivli.IsArchived = true;
            context.Add(arsivli);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<ValidationException>(
                () => service.CreateAsync(Create(UniqueName(), Satir(arsivli.Id))));
        }
    }

    /// <summary>Yazarken katı, okurken hoşgörülü: sonradan arşivlenen egzersiz şablonda kalır.</summary>
    [Fact]
    public async Task Sonradan_arsivlenen_egzersiz_sablonda_gorunmeye_devam_eder()
    {
        var (context, user, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var egzersiz = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            context.Add(egzersiz);
            await context.SaveChangesAsync();

            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(egzersiz.Id)));

            egzersiz.IsArchived = true;
            await context.SaveChangesAsync();

            var okunan = await service.GetByIdAsync(olusan.Id);

            Assert.Single(okunan.Exercises);
            Assert.True(okunan.Exercises[0].IsArchived);
        }
    }

    // ---- İsim çakışması ----

    [Fact]
    public async Task Ayni_sablon_adi_farkli_harf_buyuklugunde_reddedilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var name = UniqueName();
            await service.CreateAsync(Create(name, Satir(1)));

            await Assert.ThrowsAsync<ConflictException>(
                () => service.CreateAsync(Create(name.ToUpperInvariant(), Satir(11))));
        }
    }

    // ---- Güncelleme ----

    [Fact]
    public async Task Update_listeyi_toptan_degistirir()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1), Satir(11)));

            var guncel = await service.UpdateAsync(olusan.Id,
                new UpdateTemplateRequest { Name = olusan.Name, Exercises = [Satir(6, 5)] });

            Assert.Single(guncel.Exercises);
            Assert.Equal(6L, guncel.Exercises[0].ExerciseId);

            // Eski satırlar veritabanından GERÇEKTEN gitmiş olmalı — yalnızca yanıttan değil.
            var kalanSatirSayisi = await context.Set<TemplateExercise>()
                .CountAsync(te => te.WorkoutTemplateId == olusan.Id);
            Assert.Equal(1, kalanSatirSayisi);
        }
    }

    /// <summary>PATCH'in var olma sebebi: adı değiştirmek için listeyi göndermek gerekmesin.</summary>
    [Fact]
    public async Task Patch_yalnizca_adi_degistirince_liste_korunur()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1), Satir(11)));
            var yeniAd = UniqueName();

            var guncel = await service.PatchAsync(olusan.Id, new PatchTemplateRequest { Name = yeniAd });

            Assert.Equal(yeniAd, guncel.Name);
            Assert.Equal(2, guncel.Exercises.Count);
        }
    }

    [Fact]
    public async Task Patch_hicbir_alan_gonderilmezse_reddedilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1)));

            await Assert.ThrowsAsync<ValidationException>(
                () => service.PatchAsync(olusan.Id, new PatchTemplateRequest()));
        }
    }

    // ---- Silme (Faz 1'de konfigüre edildi, burada doğrulanıyor) ----

    [Fact]
    public async Task Silinen_sablonun_TemplateExercise_satirlari_da_gider()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1), Satir(11)));

            await service.DeleteAsync(olusan.Id);

            Assert.Equal(0, await context.Set<TemplateExercise>()
                .CountAsync(te => te.WorkoutTemplateId == olusan.Id));
        }
    }

    /// <summary>
    /// Şablon silinince o şablondan başlatılmış oturum SİLİNMEZ, yalnızca TemplateId'si
    /// NULL olur — geçmiş antrenman kaydı korunmalı.
    /// </summary>
    [Fact]
    public async Task Silinen_sablonun_oturumu_silinmez_TemplateId_null_olur()
    {
        var (context, user, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var olusan = await service.CreateAsync(Create(UniqueName(), Satir(1)));
            var oturum = TestDatabase.NewSession(user);
            oturum.TemplateId = olusan.Id;
            context.Add(oturum);
            await context.SaveChangesAsync();

            await service.DeleteAsync(olusan.Id);
            context.ChangeTracker.Clear();

            var kalanOturum = await context.Set<WorkoutSession>().FirstOrDefaultAsync(s => s.Id == oturum.Id);
            Assert.NotNull(kalanOturum);
            Assert.Null(kalanOturum.TemplateId);
        }
    }
}
```

- [ ] **Adım 3: Testlerin doğru sebeple kırıldığını gör**

Çalıştır: `dotnet test --filter WorkoutTemplateServiceTests`
Beklenen: DERLEME hatası — `WorkoutTemplateService` yok.

- [ ] **Adım 4: Servisi yaz**

`src/Grind.Api/Services/WorkoutTemplateService.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Template;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Api.Services;

public class WorkoutTemplateService(
    IWorkoutTemplateRepository templateRepository,
    IExerciseRepository exerciseRepository,
    IRepository<TemplateExercise> templateExerciseRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser) : IWorkoutTemplateService
{
    /// <summary>Şablon için TEK "bulunamadı" metni — sahiplik hakkında hiçbir şey söylemez.</summary>
    private const string TemplateNotFound = "Şablon bulunamadı.";

    /// <summary>
    /// Egzersiz için TEK metin ve BİLEREK id İÇERMEZ: "42 numaralı egzersiz sizin değil"
    /// demek, saldırgana id tarayarak hangi id'lerin dolu olduğunu haritalatır (Faz 3 kararı).
    /// </summary>
    private const string ExerciseNotFound = "Seçilen egzersizlerden biri bulunamadı.";

    public async Task<IReadOnlyList<TemplateResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var templates = await templateRepository.GetAllAsync(currentUser.UserId, cancellationToken);

        return templates.Select(ToResponse).ToList();
    }

    public async Task<TemplateResponse> GetByIdAsync(
        long id, CancellationToken cancellationToken = default)
        => ToResponse(await OwnedOrThrowAsync(id, cancellationToken));

    public async Task<TemplateResponse> CreateAsync(
        CreateTemplateRequest request, CancellationToken cancellationToken = default)
    {
        var name = RequireTrimmedName(request.Name);
        await EnsureNameFreeAsync(name, excludeId: null, cancellationToken);

        var template = new WorkoutTemplate
        {
            UserId = currentUser.UserId,
            Name = name,
            CreatedAt = DateTime.UtcNow
        };

        templateRepository.Add(template);
        await ReplaceExercisesAsync(template, request.Exercises, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(await ReloadAsync(template.Id, cancellationToken));
    }

    public async Task<TemplateResponse> UpdateAsync(
        long id, UpdateTemplateRequest request, CancellationToken cancellationToken = default)
    {
        var template = await OwnedOrThrowAsync(id, cancellationToken);
        var name = RequireTrimmedName(request.Name);
        await EnsureNameFreeAsync(name, excludeId: template.Id, cancellationToken);

        template.Name = name;
        await ReplaceExercisesAsync(template, request.Exercises, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(await ReloadAsync(template.Id, cancellationToken));
    }

    public async Task<TemplateResponse> PatchAsync(
        long id, PatchTemplateRequest request, CancellationToken cancellationToken = default)
    {
        var template = await OwnedOrThrowAsync(id, cancellationToken);

        // Boş gövde DTO doğrulamasını geçer (nullable alanlarda kural yok). Sessizce hiçbir
        // şey yapmamak, çağıranın 200 görüp isteğinin uygulandığını sanmasına yol açardı.
        if (request.Name is null && request.Exercises is null)
        {
            throw new ValidationException("Güncellenecek en az bir alan gönderilmeli.");
        }

        if (request.Name is not null)
        {
            var name = RequireTrimmedName(request.Name);
            await EnsureNameFreeAsync(name, excludeId: template.Id, cancellationToken);
            template.Name = name;
        }

        if (request.Exercises is not null)
        {
            await ReplaceExercisesAsync(template, request.Exercises, cancellationToken);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(await ReloadAsync(template.Id, cancellationToken));
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var template = await OwnedOrThrowAsync(id, cancellationToken);

        // Gerçek silme. TemplateExercise satırları CASCADE ile, WorkoutSession.TemplateId
        // SET NULL ile hallolur — ikisi de Faz 1'de veritabanı seviyesinde konfigüre edildi.
        templateRepository.Remove(template);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Listeyi TOPTAN değiştirir: eski satırlar silinir, yenileri dizideki sırayla eklenir.
    /// Sıra istemciden gelmez — <c>OrderIndex</c> konumdan türer, böylece çakışan indeks,
    /// boşluk veya negatif değer oluşamaz.
    /// </summary>
    private async Task ReplaceExercisesAsync(
        WorkoutTemplate template,
        IReadOnlyList<TemplateExerciseRequest> requested,
        CancellationToken cancellationToken)
    {
        var ids = requested.Select(r => r.ExerciseId).ToList();

        if (ids.Count != ids.Distinct().Count())
        {
            throw new ValidationException("Aynı egzersiz şablona birden fazla kez eklenemez.");
        }

        // Toplu görünürlük sorgusu: N egzersiz için N gidiş-dönüş yapılmasın. Erişilemeyen
        // id'ler sonuçta hiç yer almadığı için sayı karşılaştırması tek adımda yeterli —
        // hangi id'nin eksik olduğunu ARAMIYORUZ, çünkü onu söylemek de sızıntı olurdu.
        var visible = await exerciseRepository.GetVisibleByIdsAsync(ids, currentUser.UserId, cancellationToken);

        if (visible.Count != ids.Count)
        {
            throw new NotFoundException(ExerciseNotFound);
        }

        // Yazarken katı: arşivlenmiş egzersiz yeni bir seçime giremez. Okurken hoşgörülü
        // olduğumuz için (repository arşivlileri döndürüyor) bu kontrol BURADA olmak zorunda.
        if (visible.Any(e => e.IsArchived))
        {
            throw new ValidationException("Arşivlenmiş bir egzersiz şablona eklenemez.");
        }

        foreach (var existing in template.TemplateExercises.ToList())
        {
            templateExerciseRepository.Remove(existing);
        }

        template.TemplateExercises.Clear();

        for (var index = 0; index < requested.Count; index++)
        {
            template.TemplateExercises.Add(new TemplateExercise
            {
                ExerciseId = requested[index].ExerciseId,
                OrderIndex = index,
                PlannedSets = requested[index].PlannedSets
            });
        }
    }

    private async Task<WorkoutTemplate> OwnedOrThrowAsync(long id, CancellationToken cancellationToken)
        => await templateRepository.GetOwnedByIdAsync(id, currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException(TemplateNotFound);

    /// <summary>
    /// Yazdıktan sonra yeniden okur: yanıt, egzersizlerin adı ve kategorisiyle birlikte
    /// dönüyor ve o veri yeni eklenen satırlarda henüz yüklü değil.
    /// </summary>
    private async Task<WorkoutTemplate> ReloadAsync(long id, CancellationToken cancellationToken)
        => await templateRepository.GetOwnedByIdAsync(id, currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException(TemplateNotFound);

    private static string RequireTrimmedName(string name)
    {
        var trimmed = name.Trim();
        if (trimmed.Length < 2)
        {
            throw new ValidationException("Şablon adı 2-100 karakter olmalı.");
        }

        return trimmed;
    }

    private async Task EnsureNameFreeAsync(
        string name, long? excludeId, CancellationToken cancellationToken)
    {
        if (await templateRepository.NameExistsAsync(currentUser.UserId, name, excludeId, cancellationToken))
        {
            throw new ConflictException($"'{name}' adında bir şablonunuz zaten var.");
        }
    }

    private static TemplateResponse ToResponse(WorkoutTemplate template) => new(
        template.Id,
        template.Name,
        template.CreatedAt,
        template.TemplateExercises
            .OrderBy(te => te.OrderIndex)
            .Select(te => new TemplateExerciseResponse(
                te.Id,
                te.ExerciseId,
                te.Exercise.Name,
                te.Exercise.Category,
                te.Exercise.IsArchived,
                te.OrderIndex,
                te.PlannedSets))
            .ToList());
}
```

- [ ] **Adım 5: Testleri çalıştır**

Çalıştır: `dotnet test`
Beklenen: tümü yeşil, sayı 235 → **252** (17 yeni test).

- [ ] **Adım 6: Kasıtlı kırma ile üç testin iş gördüğünü kanıtla**

1. `ReplaceExercisesAsync`'teki `if (visible.Count != ids.Count)` bloğunu kaldır.
   `Baskasinin_egzersizi_sablona_eklenemez_404_verir` **KIRMIZI** olmalı. Geri al.
2. Arşiv kontrolünü (`if (visible.Any(e => e.IsArchived))`) kaldır.
   `Arsivlenmis_egzersiz_sablona_eklenemez` **KIRMIZI** olmalı. Geri al.
3. `foreach (var existing in ...) Remove(existing);` döngüsünü kaldır (yalnızca `Clear()` kalsın).
   `Update_listeyi_toptan_degistirir` testinin veritabanı sayımı **KIRMIZI** olabilir de olmayabilir de — EF, sahipsiz kalan satırları kendi de silebilir. **Gördüğünü olduğu gibi raporla**; kırmızı vermezse açıkça yaz, uydurma. Geri al.

Sonuçları rapora yaz; her kırmadan sonra paketi yeşile döndür.

- [ ] **Adım 7: Commit**

```bash
git add src/Grind.Api/Services tests/Grind.Tests/Services/WorkoutTemplateServiceTests.cs
git commit -m "feat(template): WorkoutTemplateService - sahiplik, egzersiz dogrulamasi, toptan liste"
```

---

### Task 4: `TemplatesController`, DI ve faz kapanışı

**Files:**
- Create: `src/Grind.Api/Controllers/TemplatesController.cs`
- Modify: `src/Grind.Api/Services/DependencyInjection.cs`
- Modify: `PLAN.md`
- Test: `tests/Grind.Tests/Integration/TemplateEndpointsTests.cs`

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Integration/TemplateEndpointsTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Template;

namespace Grind.Tests.Integration;

[Trait("Category", "Database")]
public class TemplateEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static string UniqueName() => $"Sablon {Guid.NewGuid():N}";

    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = $"tp_{Guid.NewGuid():N}"[..20],
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    private static CreateTemplateRequest Create(string name) => new()
    {
        Name = name,
        Exercises = [new TemplateExerciseRequest { ExerciseId = 1, PlannedSets = 4 }]
    };

    [Fact]
    public async Task Tokensiz_listeleme_401_verir()
    {
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await factory.CreateClient().GetAsync("/api/templates")).StatusCode);
    }

    [Fact]
    public async Task Olusturulan_sablon_listede_ve_detayda_gorunur()
    {
        var client = await AuthenticatedClientAsync();
        var name = UniqueName();

        var created = await client.PostAsJsonAsync("/api/templates", Create(name), Json);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var olusan = await created.Content.ReadFromJsonAsync<TemplateResponse>(Json);

        var detay = await client.GetFromJsonAsync<TemplateResponse>($"/api/templates/{olusan!.Id}", Json);
        var liste = await client.GetFromJsonAsync<List<TemplateResponse>>("/api/templates", Json);

        Assert.Equal(name, detay!.Name);
        Assert.Single(detay.Exercises);
        Assert.Equal("Bench Press", detay.Exercises[0].ExerciseName);
        // Faz 5 dersi: liste de egzersizleriyle DOLU gelir, boş dizi değil.
        Assert.Contains(liste!, t => t.Id == olusan.Id && t.Exercises.Count == 1);
    }

    /// <summary>
    /// İç eleman doğrulamasının GERÇEKTEN çalıştığının tek kanıtı bu. Birim testte
    /// Validator.TryValidateObject listeye girmiyor (deneyle ölçüldü), MVC'nin doğrulayıcısı
    /// giriyor — bu test o farkı kapatıyor.
    /// </summary>
    [Fact]
    public async Task Gecersiz_plannedSets_400_verir()
    {
        var client = await AuthenticatedClientAsync();
        var payload = new StringContent(
            $$"""{"name":"{{UniqueName()}}","exercises":[{"exerciseId":1,"plannedSets":0}]}""",
            Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/api/templates", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("plannedSets", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Baska_kullanicinin_sablonu_404_verir()
    {
        var birinci = await AuthenticatedClientAsync();
        var created = await birinci.PostAsJsonAsync("/api/templates", Create(UniqueName()), Json);
        var olusan = await created.Content.ReadFromJsonAsync<TemplateResponse>(Json);

        var ikinci = await AuthenticatedClientAsync();

        Assert.Equal(HttpStatusCode.NotFound,
            (await ikinci.GetAsync($"/api/templates/{olusan!.Id}")).StatusCode);
    }

    [Fact]
    public async Task Patch_yalnizca_adi_degistirir_listeyi_korur()
    {
        var client = await AuthenticatedClientAsync();
        var created = await client.PostAsJsonAsync("/api/templates", Create(UniqueName()), Json);
        var olusan = await created.Content.ReadFromJsonAsync<TemplateResponse>(Json);
        var yeniAd = UniqueName();

        var response = await client.PatchAsync($"/api/templates/{olusan!.Id}",
            new StringContent($$"""{"name":"{{yeniAd}}"}""", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var guncel = await response.Content.ReadFromJsonAsync<TemplateResponse>(Json);
        Assert.Equal(yeniAd, guncel!.Name);
        Assert.Single(guncel.Exercises);
    }

    [Fact]
    public async Task Silinen_sablon_sonrasinda_404_verir()
    {
        var client = await AuthenticatedClientAsync();
        var created = await client.PostAsJsonAsync("/api/templates", Create(UniqueName()), Json);
        var olusan = await created.Content.ReadFromJsonAsync<TemplateResponse>(Json);

        var silme = await client.DeleteAsync($"/api/templates/{olusan!.Id}");
        var sonra = await client.GetAsync($"/api/templates/{olusan.Id}");

        Assert.Equal(HttpStatusCode.NoContent, silme.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, sonra.StatusCode);
    }
}
```

- [ ] **Adım 2: Testlerin doğru sebeple kırıldığını gör**

Çalıştır: `dotnet test --filter TemplateEndpointsTests`
Beklenen: DERLEME hatası ya da 404'ler — `TemplatesController` yok.

- [ ] **Adım 3: DI kaydını ekle**

`src/Grind.Api/Services/DependencyInjection.cs` içindeki `AddApplicationServices`'e:

```csharp
        services.AddScoped<IWorkoutTemplateService, WorkoutTemplateService>();
```

- [ ] **Adım 4: Controller'ı yaz**

`src/Grind.Api/Controllers/TemplatesController.cs`:

```csharp
using Grind.Api.Models.Dtos.Template;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// İnce kalır: sahiplik, isim çakışması ve egzersiz doğrulaması servis katmanında,
/// hata çevirisi GlobalExceptionHandler'da. Burada if/try yoktur.
/// </summary>
[ApiController]
[Authorize]
[Route("api/templates")]
public class TemplatesController(IWorkoutTemplateService templateService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TemplateResponse>>> GetAll(
        CancellationToken cancellationToken)
        => Ok(await templateService.GetAllAsync(cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TemplateResponse>> GetById(long id, CancellationToken cancellationToken)
        => Ok(await templateService.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TemplateResponse>> Create(
        CreateTemplateRequest request, CancellationToken cancellationToken)
    {
        var created = await templateService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>Tam değiştirme: ad ve egzersiz listesinin tamamı gönderilir.</summary>
    [HttpPut("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TemplateResponse>> Update(
        long id, UpdateTemplateRequest request, CancellationToken cancellationToken)
        => Ok(await templateService.UpdateAsync(id, request, cancellationToken));

    /// <summary>
    /// Kısmi güncelleme: yalnızca gönderilen alan değişir. Sadece yeniden adlandırmak için
    /// <c>{ "name": "..." }</c> yeterlidir — PUT ile bunu yapmak tüm egzersiz listesini
    /// göndermeyi gerektirir.
    /// </summary>
    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TemplateResponse>> Patch(
        long id, PatchTemplateRequest request, CancellationToken cancellationToken)
        => Ok(await templateService.PatchAsync(id, request, cancellationToken));

    /// <summary>
    /// GERÇEK siler (egzersizlerin aksine). Şablon satırları CASCADE ile gider; o şablondan
    /// başlatılmış oturumlar SİLİNMEZ, yalnızca şablon referansını kaybeder.
    /// </summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await templateService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
```

- [ ] **Adım 5: Testleri ve derlemeyi çalıştır**

Çalıştır: `dotnet test` → tümü yeşil, sayı 252 → **258** (6 yeni test).
Çalıştır: `dotnet build -c Release` → 0 uyarı, 0 hata.

- [ ] **Adım 6: Uçtan uca duman testi**

`docker compose up -d`, sonra `dotnet run --project src/Grind.Api`. Gerçek bir token alarak sırayla:

1. `POST /api/auth/register` → token
2. `GET /api/templates` (token'sız) → **401**
3. `POST /api/templates` `{"name":"Push Day A","exercises":[{"exerciseId":1,"plannedSets":4},{"exerciseId":3,"plannedSets":3}]}` → **201**, `orderIndex` değerleri **0 ve 1**
4. `GET /api/templates` → **200**, şablon egzersizleriyle birlikte geliyor (`exercises` boş DEĞİL)
5. Aynı adı BÜYÜK harfle tekrar → **409**
6. `POST` `plannedSets: 0` ile → **400**
7. `POST` aynı `exerciseId`'yi iki kez → **400**
8. `PATCH /api/templates/{id}` `{"name":"Push Day B"}` → **200**, egzersiz listesi korunuyor
9. `PUT /api/templates/{id}` tek egzersizli listeyle → **200**, liste tek satıra düşüyor
10. `DELETE /api/templates/{id}` → **204**, sonra `GET` → **404**

Gözlenen durum kodlarını ve gövdeleri rapora yaz. Çalıştıramazsan bunu açıkça söyle.

- [ ] **Adım 7: PLAN.md'yi kapat**

Faz 6 maddelerini (6.1–6.4) tamamlandı olarak işaretle; Faz 0-5'in biçimini birebir taklit et.
Faz 7'yi "sırada" yap. **Faz 3/4/5'ten devreden not bloklarını SİLME** — ama Faz 5 bloğundaki
**Faz 6 için yazılmış üç alt madde** (görünürlük desenini yeniden kullan, arşivlenmiş egzersizi
reddet, batch sorgu) bu fazda karşılandı; onları tamamlandı olarak işaretle ve "Faz 6'da
karşılandı" diye not düş, silme. "Gerçek Kullanımdan Gelen İstekler" bölümüne dokunma.

- [ ] **Adım 8: Commit**

```bash
git add src/Grind.Api/Controllers src/Grind.Api/Services/DependencyInjection.cs tests/Grind.Tests/Integration/TemplateEndpointsTests.cs
git commit -m "feat(template): TemplatesController ve endpointler"
git add PLAN.md
git commit -m "docs: Faz 6 tamamlandi"
```
