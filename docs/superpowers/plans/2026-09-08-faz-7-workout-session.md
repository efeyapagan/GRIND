# Faz 7 — WorkoutSession Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Antrenman oturumları — başlat, bitir, not al, sil; ve "bugüne ait açık oturum" kuralının TR yerel gününe göre doğru çalışması.

**Architecture:** `SessionsController` (ince) → `IWorkoutSessionService` → `IWorkoutSessionRepository` + `IWorkoutTemplateRepository` + `ISetEntryRepository` + `IUnitOfWork`; saat `TimeProvider`'dan, kimlik `ICurrentUserService`'ten.

**Tech Stack:** ASP.NET Core 10, EF Core 10.0.11, xUnit, `WebApplicationFactory`, `TimeProvider`.

**Spec:** `docs/superpowers/specs/2026-09-08-workout-session-design.md` (onaylandı 2026-09-08: A+A+A+A+A+A)

## Global Constraints

- SOLID / DRY / KISS. Controller iş mantığı İÇERMEZ — `if`/`try` yok.
- `DbContext`'e yalnızca `Repositories/` ve `Data/` dokunur.
- **Sahiplik:** `WorkoutSession.UserId` non-nullable → global oturum yok. Başkasının oturumu → **404**, 403 dalı YOKTUR.
- **Şablon referansı `IWorkoutTemplateRepository.GetOwnedByIdAsync` ile doğrulanır.** Miras alınan `GetByIdAsync` sahiplik kontrolü YAPMAZ — kullanmak IDOR açığıdır (Faz 6'dan devreden uyarı).
- **Saat asla `DateTime.UtcNow` ile okunmaz** — her zaman enjekte edilen `TimeProvider`. Bu fazın manşet testi (gün sınırı) başka türlü yazılamaz.
- Zaman damgaları UTC. Bir iş operasyonu TEK bir `SaveChangesAsync()`.
- `ValidationException` kısa ad çakışmasına dikkat (alias).

## Mevcut kod — değiştirilmeyecek gerçekler

- `WorkoutSession`: `Id`, `UserId` (non-null), `TemplateId` (nullable), `StartedAt`, `EndedAt` (nullable), `Notes` (nullable, veritabanında uzunluk sınırı YOK → `text`).
- **Faz 1'de konfigüre edilmiş** (uygulanmayacak, testle doğrulanacak): `SetEntry` → `WorkoutSession` **CASCADE**, `WorkoutSession` → `WorkoutTemplate` **SET NULL**, CHECK `"EndedAt" IS NULL OR "EndedAt" > "StartedAt"`, index `(UserId, StartedAt)`.
- **Faz 2'de hazır:** `IWorkoutSessionRepository.GetOpenSessionStartedBetweenAsync(userId, fromUtcInclusive, toUtcExclusive)` — zaten `EndedAt == null` + aralık filtresi uyguluyor, `StartedAt` azalan sırada ilkini döndürüyor. `ISetEntryRepository.GetForUserAndExerciseAsync` ve `GetDistinctExerciseIdsForSessionAsync`.
- `TestDatabase`: `NewUser()`, `NewExercise(owner, name)`, `NewSession(user)`.

## Deneyle doğrulanmış gerçekler (varsayım DEĞİL)

1. **`TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul")` Windows'ta da çözülüyor** (.NET'in IANA↔Windows eşlemesi), Linux'ta zaten yerel — CI güvenli.
2. **Türkiye'de kış ve yaz ofseti ikisi de `+03:00`** (DST 2016'da kaldırıldı).
3. **Gün aralığı hesabı doğru:** UTC `2026-03-10 20:30` → TR `23:30`, aralık `[2026-03-09 21:00Z, 2026-03-10 21:00Z)`. Yani **TR gece yarısı = UTC 21:00**.
4. **`TimeProvider` üç satırla sahtelenebiliyor** — `override GetUtcNow()`; `.UtcDateTime` `Kind=Utc` veriyor.

> **Faz 8 bağımlılığı (bilinçli):** 7.3 silme sonrası `RecalculateRecords` istiyor, ama o Faz 8'in işi. Bugün `SetEntry` üreten hiçbir endpoint olmadığı için silinen oturumda yeniden hesaplanacak rekor **yok** — silme bugün eksiksiz doğru. Görev 4, `PLAN.md`'ye "Faz 8 silme akışına yeniden hesaplamayı bağlamalı" notunu düşecek.

---

### Task 1: `TurkeyDay` yardımcısı ve repository eklemeleri

**Files:**
- Create: `src/Grind.Api/Common/Time/TurkeyDay.cs`
- Modify: `src/Grind.Api/Repositories/IWorkoutSessionRepository.cs`, `WorkoutSessionRepository.cs`
- Modify: `src/Grind.Api/Repositories/ISetEntryRepository.cs`, `SetEntryRepository.cs`
- Test: `tests/Grind.Tests/Common/TurkeyDayTests.cs` (yeni), `tests/Grind.Tests/Repositories/WorkoutSessionRepositoryTests.cs` (yeni)

**Interfaces:**
- Produces: `TurkeyDay.RangeFor(DateTime utcInstant)`; `IWorkoutSessionRepository.GetAllAsync/GetOwnedByIdAsync`; `ISetEntryRepository.GetCompletedSetCountsAsync`. Görev 3 hepsini kullanır.

- [ ] **Adım 1: `TurkeyDay` testlerini yaz**

`tests/Grind.Tests/Common/TurkeyDayTests.cs`:

```csharp
using Grind.Api.Common.Time;

namespace Grind.Tests.Common;

/// <summary>
/// Bu fazın çekirdeği. TR gece yarısı UTC 21:00'e denk geliyor (Türkiye sabit +03:00,
/// DST 2016'da kaldırıldı) — testler o sınırın iki yanına oturuyor.
/// Veritabanı gerektirmez: saf hesap.
/// </summary>
public class TurkeyDayTests
{
    [Fact]
    public void Gece_yarisindan_once_ayni_TR_gunune_duser()
    {
        // UTC 20:30 = TR 23:30, hâlâ 10 Mart.
        var (baslangic, bitis) = TurkeyDay.RangeFor(new DateTime(2026, 3, 10, 20, 30, 0, DateTimeKind.Utc));

        Assert.Equal(new DateTime(2026, 3, 9, 21, 0, 0, DateTimeKind.Utc), baslangic);
        Assert.Equal(new DateTime(2026, 3, 10, 21, 0, 0, DateTimeKind.Utc), bitis);
    }

    /// <summary>UTC 21:00 = TR gece yarısı; bir sonraki güne geçmiş olmalı.</summary>
    [Fact]
    public void Gece_yarisinda_ertesi_TR_gunune_gecer()
    {
        var (baslangic, bitis) = TurkeyDay.RangeFor(new DateTime(2026, 3, 10, 21, 0, 0, DateTimeKind.Utc));

        Assert.Equal(new DateTime(2026, 3, 10, 21, 0, 0, DateTimeKind.Utc), baslangic);
        Assert.Equal(new DateTime(2026, 3, 11, 21, 0, 0, DateTimeKind.Utc), bitis);
    }

    [Fact]
    public void Sabah_saati_dogru_araliga_duser()
    {
        // UTC 06:00 = TR 09:00, 11 Mart.
        var (baslangic, bitis) = TurkeyDay.RangeFor(new DateTime(2026, 3, 11, 6, 0, 0, DateTimeKind.Utc));

        Assert.Equal(new DateTime(2026, 3, 10, 21, 0, 0, DateTimeKind.Utc), baslangic);
        Assert.Equal(new DateTime(2026, 3, 11, 21, 0, 0, DateTimeKind.Utc), bitis);
    }

    /// <summary>Yaz ve kış aynı davranmalı — Türkiye'de DST yok.</summary>
    [Theory]
    [InlineData(1)]
    [InlineData(7)]
    public void Aralik_her_mevsimde_tam_yirmi_dort_saat(int ay)
    {
        var (baslangic, bitis) = TurkeyDay.RangeFor(new DateTime(2026, ay, 15, 12, 0, 0, DateTimeKind.Utc));

        Assert.Equal(TimeSpan.FromHours(24), bitis - baslangic);
        Assert.Equal(DateTimeKind.Utc, baslangic.Kind);
        Assert.Equal(DateTimeKind.Utc, bitis.Kind);
    }
}
```

- [ ] **Adım 2: Repository testlerini yaz**

`tests/Grind.Tests/Repositories/WorkoutSessionRepositoryTests.cs`:

```csharp
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class WorkoutSessionRepositoryTests
{
    [Fact]
    public async Task GetAllAsync_yalnizca_kendi_oturumlarini_yeniden_eskiye_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutSessionRepository(context);

        var user = TestDatabase.NewUser();
        var digerKullanici = TestDatabase.NewUser();
        var eski = TestDatabase.NewSession(user);
        eski.StartedAt = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);
        var yeni = TestDatabase.NewSession(user);
        yeni.StartedAt = new DateTime(2026, 2, 1, 10, 0, 0, DateTimeKind.Utc);
        repository.Add(eski);
        repository.Add(yeni);
        repository.Add(TestDatabase.NewSession(digerKullanici));
        await context.SaveChangesAsync();

        var bulunan = await repository.GetAllAsync(user.Id);

        Assert.Equal(2, bulunan.Count);
        Assert.Equal([yeni.Id, eski.Id], bulunan.Select(s => s.Id));

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetOwnedByIdAsync_baskasinin_oturumunda_null_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutSessionRepository(context);

        var user = TestDatabase.NewUser();
        var digerKullanici = TestDatabase.NewUser();
        var digerOturum = TestDatabase.NewSession(digerKullanici);
        context.Add(user);
        repository.Add(digerOturum);
        await context.SaveChangesAsync();

        Assert.Null(await repository.GetOwnedByIdAsync(digerOturum.Id, user.Id));

        await transaction.RollbackAsync();
    }

    /// <summary>İlerleme hesabı şablonun egzersizlerine ve adlarına ihtiyaç duyuyor.</summary>
    [Fact]
    public async Task GetOwnedByIdAsync_sablonu_ve_egzersizlerini_yukler()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutSessionRepository(context);

        var user = TestDatabase.NewUser();
        var sablon = new WorkoutTemplate
        {
            User = user,
            Name = $"Sablon {Guid.NewGuid():N}",
            CreatedAt = DateTime.UtcNow,
            TemplateExercises = { new TemplateExercise { ExerciseId = 1, OrderIndex = 0, PlannedSets = 4 } }
        };
        var oturum = TestDatabase.NewSession(user);
        oturum.Template = sablon;
        repository.Add(oturum);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var bulunan = await repository.GetOwnedByIdAsync(oturum.Id, user.Id);

        Assert.NotNull(bulunan);
        Assert.NotNull(bulunan.Template);
        Assert.Single(bulunan.Template.TemplateExercises);
        Assert.Equal("Bench Press", bulunan.Template.TemplateExercises.Single().Exercise.Name);

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetCompletedSetCountsAsync_egzersiz_basina_sayar()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var setRepository = new SetEntryRepository(context);

        var user = TestDatabase.NewUser();
        var oturum = TestDatabase.NewSession(user);
        context.Add(oturum);
        await context.SaveChangesAsync();

        foreach (var (exerciseId, adet) in new[] { (1L, 3), (11L, 2) })
        {
            for (var i = 0; i < adet; i++)
            {
                setRepository.Add(new SetEntry
                {
                    WorkoutSessionId = oturum.Id,
                    ExerciseId = exerciseId,
                    Weight = 60m,
                    Reps = 8,
                    RecordType = RecordType.None,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await context.SaveChangesAsync();

        var sayimlar = await setRepository.GetCompletedSetCountsAsync(oturum.Id);

        Assert.Equal(3, sayimlar[1L]);
        Assert.Equal(2, sayimlar[11L]);

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetCompletedSetCountsAsync_seti_olmayan_oturumda_bos_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var setRepository = new SetEntryRepository(context);

        var user = TestDatabase.NewUser();
        var oturum = TestDatabase.NewSession(user);
        context.Add(oturum);
        await context.SaveChangesAsync();

        Assert.Empty(await setRepository.GetCompletedSetCountsAsync(oturum.Id));

        await transaction.RollbackAsync();
    }
}
```

> `context.ChangeTracker.Clear()` şart: onsuz şablon/egzersiz koleksiyonu bellekte zaten dolu olur ve `Include` testi hiçbir şey kanıtlamaz.

- [ ] **Adım 3: Testlerin doğru sebeple kırıldığını gör**

Çalıştır: `dotnet test --filter "TurkeyDayTests|WorkoutSessionRepositoryTests"`
Beklenen: DERLEME hatası — `TurkeyDay` ve yeni repository metotları yok.

- [ ] **Adım 4: `TurkeyDay`'i yaz**

`src/Grind.Api/Common/Time/TurkeyDay.cs`:

```csharp
namespace Grind.Api.Common.Time;

/// <summary>
/// Bir UTC anını, o anın karşılık geldiği TÜRKİYE yerel gününün UTC aralığına çevirir.
///
/// Neden gerekli: zaman damgaları UTC saklanıyor, ama "bugün" kullanıcının yaşadığı gün.
/// Gece 23:00'te (TR) başlayan bir antrenman UTC'de zaten ertesi güne geçmiştir; UTC gününe
/// göre gruplamak o antrenmanı yanlış güne düşürür (CLAUDE.md).
///
/// Sabit +03:00 yerine <see cref="TimeZoneInfo"/> kullanılıyor ki Türkiye yeniden yaz
/// saatine geçerse uygulama kendiliğinden uysun. Bedeli: çalışma ortamında saat dilimi
/// veritabanı (tzdata/ICU) bulunmalı.
/// </summary>
public static class TurkeyDay
{
    private const string TimeZoneId = "Europe/Istanbul";

    private static readonly TimeZoneInfo Turkey = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);

    /// <summary>
    /// <paramref name="utcInstant"/> anının düştüğü TR gününün başlangıcı (dahil) ve
    /// bitişi (hariç), UTC olarak. TR gece yarısı bugün UTC 21:00'e denk gelir.
    /// </summary>
    public static (DateTime FromUtcInclusive, DateTime ToUtcExclusive) RangeFor(DateTime utcInstant)
    {
        var localInstant = TimeZoneInfo.ConvertTimeFromUtc(utcInstant, Turkey);
        var localDayStart = DateTime.SpecifyKind(localInstant.Date, DateTimeKind.Unspecified);

        return (
            TimeZoneInfo.ConvertTimeToUtc(localDayStart, Turkey),
            TimeZoneInfo.ConvertTimeToUtc(localDayStart.AddDays(1), Turkey));
    }
}
```

- [ ] **Adım 5: Repository metotlarını ekle**

`IWorkoutSessionRepository.cs`'e (mevcut metodun altına):

```csharp
    /// <summary>Kullanıcının tüm oturumları, yeniden eskiye.</summary>
    Task<IReadOnlyList<WorkoutSession>> GetAllAsync(
        long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Başkasının oturumunda null döner (IDOR koruması). Şablonu ve şablonun egzersizlerini
    /// de yükler — ilerleme hesabı hedef set sayılarına ve egzersiz adlarına ihtiyaç duyuyor.
    /// </summary>
    Task<WorkoutSession?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default);
```

`WorkoutSessionRepository.cs`'e:

```csharp
    public async Task<IReadOnlyList<WorkoutSession>> GetAllAsync(
        long userId, CancellationToken cancellationToken = default)
        => await Set
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.StartedAt)
            .ToListAsync(cancellationToken);

    public Task<WorkoutSession?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default)
        => Set
            .Include(s => s.Template!)
                .ThenInclude(t => t.TemplateExercises.OrderBy(te => te.OrderIndex))
                    .ThenInclude(te => te.Exercise)
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, cancellationToken);
```

`ISetEntryRepository.cs`'e:

```csharp
    /// <summary>
    /// Bu oturumda egzersiz başına kaç set girilmiş. İlerleme hesabı bunu şablonun
    /// <c>PlannedSets</c> değeriyle karşılaştırır — önceden boş SetEntry satırı
    /// oluşturulmaz (CLAUDE.md).
    /// </summary>
    Task<IReadOnlyDictionary<long, int>> GetCompletedSetCountsAsync(
        long sessionId, CancellationToken cancellationToken = default);
```

`SetEntryRepository.cs`'e:

```csharp
    public async Task<IReadOnlyDictionary<long, int>> GetCompletedSetCountsAsync(
        long sessionId, CancellationToken cancellationToken = default)
        => await Set
            .Where(s => s.WorkoutSessionId == sessionId)
            .GroupBy(s => s.ExerciseId)
            .ToDictionaryAsync(g => g.Key, g => g.Count(), cancellationToken);
```

- [ ] **Adım 6: Testleri çalıştır**

`docker compose up -d` çalışıyor olmalı.
Çalıştır: `dotnet test`
Beklenen: tümü yeşil, sayı 263 → **273** (10 yeni: 3 fact + 2 theory case + 5 repository testi). **Gerçek sayıyı raporla.**

- [ ] **Adım 7: Kasıtlı kırma ile iki testin iş gördüğünü kanıtla**

1. `TurkeyDay.RangeFor`'daki `localInstant` hesabını atlayıp `utcInstant.Date` kullan (yani TR'ye çevirmeden). `Gece_yarisinda_ertesi_TR_gunune_gecer` **KIRMIZI** olmalı. Geri al.
2. `GetOwnedByIdAsync`'ten `.ThenInclude(te => te.Exercise)` zincirini kaldır. `GetOwnedByIdAsync_sablonu_ve_egzersizlerini_yukler` **KIRMIZI** olmalı. Geri al.

Sonuçları rapora yaz; her kırmadan sonra paketi yeşile döndür.

- [ ] **Adım 8: Commit**

```bash
git add src/Grind.Api/Common/Time src/Grind.Api/Repositories tests/Grind.Tests/Common/TurkeyDayTests.cs tests/Grind.Tests/Repositories/WorkoutSessionRepositoryTests.cs
git commit -m "feat(session): TurkeyDay gun araligi ve oturum repository metotlari"
```

---

### Task 2: DTO'lar

**Files:**
- Create: `src/Grind.Api/Models/Dtos/Session/StartSessionRequest.cs`, `UpdateSessionNotesRequest.cs`, `SessionProgressResponse.cs`, `SessionResponse.cs`
- Test: `tests/Grind.Tests/Models/Dtos/SessionDtoValidationTests.cs`

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Models/Dtos/SessionDtoValidationTests.cs`:

```csharp
using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Dtos.Session;

namespace Grind.Tests.Models.Dtos;

public class SessionDtoValidationTests
{
    private static IReadOnlyList<ValidationResult> Validate(object model)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true);
        return results;
    }

    [Fact]
    public void Bos_baslatma_istegi_gecerlidir()
    {
        // Şablonsuz, notsuz oturum meşru — en sık akış bu.
        Assert.Empty(Validate(new StartSessionRequest()));
    }

    [Fact]
    public void Sablonlu_baslatma_istegi_gecerlidir()
    {
        Assert.Empty(Validate(new StartSessionRequest { TemplateId = 5, Notes = "Omuz biraz sıkıştı" }));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Gecersiz_TemplateId_reddedilir(long templateId)
    {
        Assert.NotEmpty(Validate(new StartSessionRequest { TemplateId = templateId }));
    }

    [Fact]
    public void Cok_uzun_not_reddedilir()
    {
        Assert.NotEmpty(Validate(new StartSessionRequest { Notes = new string('a', 2001) }));
        Assert.Empty(Validate(new StartSessionRequest { Notes = new string('a', 2000) }));
    }

    [Fact]
    public void Not_guncelleme_istegi_ayni_sinira_tabi()
    {
        Assert.NotEmpty(Validate(new UpdateSessionNotesRequest { Notes = new string('a', 2001) }));
        Assert.Empty(Validate(new UpdateSessionNotesRequest { Notes = null }));
    }
}
```

- [ ] **Adım 2: Testlerin doğru sebeple kırıldığını gör**

Çalıştır: `dotnet test --filter SessionDtoValidationTests`
Beklenen: DERLEME hatası — `Grind.Api.Models.Dtos.Session` ad alanı yok.

- [ ] **Adım 3: İstek DTO'larını yaz**

`src/Grind.Api/Models/Dtos/Session/StartSessionRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Session;

/// <summary>
/// İki alanı da opsiyonel: şablonsuz ve notsuz başlatmak en sık akış.
/// Gövdesiz bir POST bile geçerlidir.
/// </summary>
public class StartSessionRequest
{
    /// <summary>null ise şablonsuz oturum. Dolu ise sahiplik servis katmanında doğrulanır.</summary>
    [Range(1, long.MaxValue, ErrorMessage = "Geçerli bir şablon seçilmeli.")]
    public long? TemplateId { get; set; }

    /// <summary>Veritabanı sütunu sınırsız (text); sınır burada bilinçli bir ürün kararı.</summary>
    [StringLength(2000, ErrorMessage = "Not en fazla 2000 karakter olabilir.")]
    public string? Notes { get; set; }
}
```

`src/Grind.Api/Models/Dtos/Session/UpdateSessionNotesRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Session;

/// <summary>
/// Notu güncellemek (ya da <c>null</c> göndererek temizlemek) için. Burada <c>null</c>
/// "dokunma" DEĞİL "temizle" demektir: güncellenecek tek bir alan olduğu için ikisini
/// ayırmanın bir faydası yok.
/// </summary>
public class UpdateSessionNotesRequest
{
    [StringLength(2000, ErrorMessage = "Not en fazla 2000 karakter olabilir.")]
    public string? Notes { get; set; }
}
```

- [ ] **Adım 4: Yanıt DTO'larını yaz**

`src/Grind.Api/Models/Dtos/Session/SessionProgressResponse.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Session;

/// <summary>
/// Şablondaki bir egzersiz için "hedef vs gerçekleşen". <paramref name="CompletedSets"/>
/// o oturumda o egzersize girilmiş GERÇEK set sayısıdır — önceden boş satır oluşturulmaz.
/// </summary>
public record SessionProgressResponse(
    long ExerciseId,
    string ExerciseName,
    int PlannedSets,
    int CompletedSets);
```

`src/Grind.Api/Models/Dtos/Session/SessionResponse.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Session;

/// <summary>
/// <paramref name="IsOpen"/> türetilmiştir (<c>EndedAt is null</c>) — istemcinin null
/// kontrolü yazmasına gerek kalmasın.
/// <paramref name="Progress"/> yalnızca şablonlu oturumlarda dolu gelir; şablonsuz bir
/// oturumun hedefi olmadığı için karşılaştırılacak bir şey de yoktur.
/// </summary>
public record SessionResponse(
    long Id,
    DateTime StartedAt,
    DateTime? EndedAt,
    bool IsOpen,
    long? TemplateId,
    string? TemplateName,
    string? Notes,
    IReadOnlyList<SessionProgressResponse> Progress);
```

- [ ] **Adım 5: Testleri çalıştır**

Çalıştır: `dotnet test`
Beklenen: tümü yeşil, sayı 273 → **279** (6 yeni: 4 fact + 2 theory case).

- [ ] **Adım 6: Kasıtlı kırma**

`StartSessionRequest.Notes` üzerindeki `[StringLength(2000)]`'i kaldır, `Cok_uzun_not_reddedilir` çalıştır. **KIRMIZI** olmalı. Geri al, yeşile döndür.

- [ ] **Adım 7: Commit**

```bash
git add src/Grind.Api/Models/Dtos/Session tests/Grind.Tests/Models/Dtos/SessionDtoValidationTests.cs
git commit -m "feat(session): oturum DTO'lari"
```

---

### Task 3: `IWorkoutSessionService` / `WorkoutSessionService`

Bu fazın asıl işi. Testleri veritabanı VE sahte saat ister.

**Files:**
- Create: `src/Grind.Api/Services/IWorkoutSessionService.cs`, `WorkoutSessionService.cs`
- Test: `tests/Grind.Tests/Services/WorkoutSessionServiceTests.cs`

- [ ] **Adım 1: Arayüzü yaz**

`src/Grind.Api/Services/IWorkoutSessionService.cs`:

```csharp
using Grind.Api.Models.Dtos.Session;

namespace Grind.Api.Services;

/// <summary>Başlatma sonucu: <paramref name="Created"/> false ise var olan açık oturum döndü.</summary>
public record StartSessionResult(SessionResponse Session, bool Created);

public interface IWorkoutSessionService
{
    Task<IReadOnlyList<SessionResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Başkasının oturumunda NotFoundException (404).</summary>
    Task<SessionResponse> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bugüne (TR yerel günü) ait açık oturum; yoksa NotFoundException.
    /// Dünden kalan açık bir oturum BULUNMAZ — zorla da kapatılmaz, öylece kalır.
    /// </summary>
    Task<SessionResponse> GetOpenAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Bugüne ait açık oturum varsa onu döndürür (<c>Created = false</c>), yoksa yeni açar.
    /// İdempotent: iki kez tıklanan "Antrenmana Başla" hata üretmez.
    /// </summary>
    Task<StartSessionResult> StartAsync(
        StartSessionRequest request, CancellationToken cancellationToken = default);

    /// <summary>Zaten bitmiş oturumda ConflictException (409) — gerçek bitiş zamanı kaybolmasın.</summary>
    Task<SessionResponse> FinishAsync(long id, CancellationToken cancellationToken = default);

    Task<SessionResponse> UpdateNotesAsync(
        long id, UpdateSessionNotesRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Siler; bağlı SetEntry satırları CASCADE ile gider.
    /// FAZ 8 NOTU: rekor taşıyan setler silinince ilgili egzersizler için
    /// RecalculateRecords çağrılmalı. Bugün SetEntry üreten endpoint olmadığı için
    /// silinen oturumda yeniden hesaplanacak rekor yok.
    /// </summary>
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
```

- [ ] **Adım 2: Başarısız testleri yaz**

`tests/Grind.Tests/Services/WorkoutSessionServiceTests.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Session;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class WorkoutSessionServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    /// <summary>Saati elde tutmak, gün sınırı testlerinin tek yolu.</summary>
    private sealed class SahteSaat(DateTime utcNow) : TimeProvider
    {
        public DateTime UtcNow { get; set; } = utcNow;
        public override DateTimeOffset GetUtcNow() => new(UtcNow, TimeSpan.Zero);
    }

    /// <summary>TR 20:00 (UTC 17:00), 10 Mart — gün sınırından güvenli uzaklıkta.</summary>
    private static DateTime VarsayilanAn => new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    private static async Task<(AppDbContext Context, User User, WorkoutSessionService Service, SahteSaat Saat, IAsyncDisposable Transaction)>
        CreateAsync(DateTime? an = null)
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();
        var user = TestDatabase.NewUser();
        context.Add(user);
        await context.SaveChangesAsync();

        var saat = new SahteSaat(an ?? VarsayilanAn);
        var service = new WorkoutSessionService(
            new WorkoutSessionRepository(context), new WorkoutTemplateRepository(context),
            new SetEntryRepository(context), new UnitOfWork(context),
            new StubCurrentUser(user.Id), saat);

        return (context, user, service, saat, transaction);
    }

    private static WorkoutTemplate NewTemplate(User user, int plannedSets = 4) => new()
    {
        User = user,
        Name = $"Sablon {Guid.NewGuid():N}",
        CreatedAt = DateTime.UtcNow,
        TemplateExercises = { new TemplateExercise { ExerciseId = 1, OrderIndex = 0, PlannedSets = plannedSets } }
    };

    // ---- Başlatma ----

    [Fact]
    public async Task Baslatilan_oturum_acik_ve_kullaniciya_ait()
    {
        var (_, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sonuc = await service.StartAsync(new StartSessionRequest());

            Assert.True(sonuc.Created);
            Assert.True(sonuc.Session.IsOpen);
            Assert.Null(sonuc.Session.EndedAt);
            Assert.Null(sonuc.Session.TemplateId);
        }
    }

    [Fact]
    public async Task Ayni_gun_ikinci_baslatma_var_olan_oturumu_dondurur()
    {
        var (_, _, service, saat, transaction) = await CreateAsync();
        await using (transaction)
        {
            var ilk = await service.StartAsync(new StartSessionRequest());
            saat.UtcNow = saat.UtcNow.AddHours(1);

            var ikinci = await service.StartAsync(new StartSessionRequest());

            Assert.False(ikinci.Created);
            Assert.Equal(ilk.Session.Id, ikinci.Session.Id);
        }
    }

    [Fact]
    public async Task Bitmis_oturum_varken_yeni_oturum_acilir()
    {
        var (_, _, service, saat, transaction) = await CreateAsync();
        await using (transaction)
        {
            var ilk = await service.StartAsync(new StartSessionRequest());
            saat.UtcNow = saat.UtcNow.AddHours(1);
            await service.FinishAsync(ilk.Session.Id);
            saat.UtcNow = saat.UtcNow.AddHours(1);

            var ikinci = await service.StartAsync(new StartSessionRequest());

            Assert.True(ikinci.Created);
            Assert.NotEqual(ilk.Session.Id, ikinci.Session.Id);
        }
    }

    /// <summary>
    /// BU FAZIN MANŞET TESTİ. TR 23:00'te açılan oturum, ertesi gün TR 00:30'da
    /// "bugünün açık oturumu" SAYILMAMALI — yoksa kullanıcı kapatmayı unuttuğunda
    /// ertesi günün setleri dünkü oturuma (ve dünkü tarihe) düşer.
    /// </summary>
    [Fact]
    public async Task Gece_yarisini_gecince_dunun_acik_oturumu_bugunun_sayilmaz()
    {
        // TR 23:00 = UTC 20:00.
        var (_, _, service, saat, transaction) = await CreateAsync(new DateTime(2026, 3, 10, 20, 0, 0, DateTimeKind.Utc));
        await using (transaction)
        {
            var dun = await service.StartAsync(new StartSessionRequest());
            Assert.True(dun.Created);

            // TR ertesi gün 00:30 = UTC 21:30.
            saat.UtcNow = new DateTime(2026, 3, 10, 21, 30, 0, DateTimeKind.Utc);

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetOpenAsync());

            var bugun = await service.StartAsync(new StartSessionRequest());
            Assert.True(bugun.Created);
            Assert.NotEqual(dun.Session.Id, bugun.Session.Id);
        }
    }

    /// <summary>Aynı TR gününde kalırken açık oturum bulunmaya devam etmeli.</summary>
    [Fact]
    public async Task Ayni_TR_gununde_acik_oturum_bulunur()
    {
        var (_, _, service, saat, transaction) = await CreateAsync(new DateTime(2026, 3, 10, 19, 0, 0, DateTimeKind.Utc));
        await using (transaction)
        {
            var acilan = await service.StartAsync(new StartSessionRequest());

            saat.UtcNow = new DateTime(2026, 3, 10, 20, 45, 0, DateTimeKind.Utc);   // TR 23:45, hâlâ aynı gün

            var acik = await service.GetOpenAsync();
            Assert.Equal(acilan.Session.Id, acik.Id);
        }
    }

    [Fact]
    public async Task Acik_oturum_yokken_GetOpenAsync_404_verir()
    {
        var (_, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<NotFoundException>(() => service.GetOpenAsync());
        }
    }

    // ---- Şablon referansı ----

    [Fact]
    public async Task Sablonlu_oturum_sablon_adini_ve_ilerlemeyi_tasir()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sablon = NewTemplate(user);
            context.Add(sablon);
            await context.SaveChangesAsync();

            var sonuc = await service.StartAsync(new StartSessionRequest { TemplateId = sablon.Id });
            var detay = await service.GetByIdAsync(sonuc.Session.Id);

            Assert.Equal(sablon.Name, detay.TemplateName);
            Assert.Single(detay.Progress);
            Assert.Equal(4, detay.Progress[0].PlannedSets);
            Assert.Equal(0, detay.Progress[0].CompletedSets);
        }
    }

    [Fact]
    public async Task Baskasinin_sablonuyla_oturum_acilamaz_404_verir()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerSablon = NewTemplate(digerKullanici);
            context.Add(digerSablon);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.StartAsync(new StartSessionRequest { TemplateId = digerSablon.Id }));
        }
    }

    [Fact]
    public async Task Var_olmayan_sablonla_oturum_acilamaz_404_verir()
    {
        var (_, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<NotFoundException>(
                () => service.StartAsync(new StartSessionRequest { TemplateId = 999_999_999 }));
        }
    }

    // ---- İlerleme ----

    [Fact]
    public async Task Ilerleme_gercek_set_sayisini_yansitir()
    {
        var (context, user, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sablon = NewTemplate(user);
            context.Add(sablon);
            await context.SaveChangesAsync();

            var sonuc = await service.StartAsync(new StartSessionRequest { TemplateId = sablon.Id });

            for (var i = 0; i < 2; i++)
            {
                context.Add(new SetEntry
                {
                    WorkoutSessionId = sonuc.Session.Id,
                    ExerciseId = 1,
                    Weight = 60m,
                    Reps = 8,
                    RecordType = RecordType.None,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await context.SaveChangesAsync();

            var detay = await service.GetByIdAsync(sonuc.Session.Id);

            Assert.Equal(4, detay.Progress[0].PlannedSets);
            Assert.Equal(2, detay.Progress[0].CompletedSets);
        }
    }

    [Fact]
    public async Task Sablonsuz_oturumda_ilerleme_bostur()
    {
        var (_, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sonuc = await service.StartAsync(new StartSessionRequest());

            Assert.Empty((await service.GetByIdAsync(sonuc.Session.Id)).Progress);
        }
    }

    // ---- Bitirme ve not ----

    [Fact]
    public async Task Bitirme_EndedAt_yazar_ve_oturumu_kapatir()
    {
        var (_, _, service, saat, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sonuc = await service.StartAsync(new StartSessionRequest());
            saat.UtcNow = saat.UtcNow.AddHours(1);

            var bitmis = await service.FinishAsync(sonuc.Session.Id);

            Assert.False(bitmis.IsOpen);
            Assert.Equal(saat.UtcNow, bitmis.EndedAt);
        }
    }

    [Fact]
    public async Task Bitmis_oturumu_tekrar_bitirmek_reddedilir()
    {
        var (_, _, service, saat, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sonuc = await service.StartAsync(new StartSessionRequest());
            saat.UtcNow = saat.UtcNow.AddHours(1);
            await service.FinishAsync(sonuc.Session.Id);

            await Assert.ThrowsAsync<ConflictException>(() => service.FinishAsync(sonuc.Session.Id));
        }
    }

    [Fact]
    public async Task Not_guncellenebilir_ve_temizlenebilir()
    {
        var (_, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sonuc = await service.StartAsync(new StartSessionRequest());

            var notlu = await service.UpdateNotesAsync(
                sonuc.Session.Id, new UpdateSessionNotesRequest { Notes = "Omuz sıkıştı" });
            Assert.Equal("Omuz sıkıştı", notlu.Notes);

            var temiz = await service.UpdateNotesAsync(
                sonuc.Session.Id, new UpdateSessionNotesRequest { Notes = null });
            Assert.Null(temiz.Notes);
        }
    }

    // ---- Sahiplik / IDOR ----

    [Fact]
    public async Task Baskasinin_oturumu_okunamaz_404_verir()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerOturum = TestDatabase.NewSession(digerKullanici);
            context.Add(digerOturum);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(digerOturum.Id));
        }
    }

    [Fact]
    public async Task Baskasinin_oturumu_bitirilemez_ve_silinemez_404_verir()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerOturum = TestDatabase.NewSession(digerKullanici);
            context.Add(digerOturum);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.FinishAsync(digerOturum.Id));
            await Assert.ThrowsAsync<NotFoundException>(() => service.DeleteAsync(digerOturum.Id));
        }
    }

    [Fact]
    public async Task Bulunamadi_mesaji_sahiplik_hakkinda_bilgi_vermez()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerOturum = TestDatabase.NewSession(digerKullanici);
            context.Add(digerOturum);
            await context.SaveChangesAsync();

            var baskasinin = await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(digerOturum.Id));
            var hicYok = await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(999_999_999));

            Assert.Equal(hicYok.Message, baskasinin.Message);
        }
    }

    // ---- Silme ----

    [Fact]
    public async Task Silinen_oturumun_setleri_de_gider()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sonuc = await service.StartAsync(new StartSessionRequest());
            context.Add(new SetEntry
            {
                WorkoutSessionId = sonuc.Session.Id,
                ExerciseId = 1,
                Weight = 60m,
                Reps = 8,
                RecordType = RecordType.None,
                CreatedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            await service.DeleteAsync(sonuc.Session.Id);
            context.ChangeTracker.Clear();

            Assert.Equal(0, await context.Set<SetEntry>()
                .CountAsync(s => s.WorkoutSessionId == sonuc.Session.Id));
            Assert.Null(await context.Set<WorkoutSession>()
                .FirstOrDefaultAsync(s => s.Id == sonuc.Session.Id));
        }
    }

    [Fact]
    public async Task Liste_yalnizca_kendi_oturumlarini_dondurur()
    {
        var (context, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            context.Add(TestDatabase.NewSession(digerKullanici));
            await context.SaveChangesAsync();

            var kendi = await service.StartAsync(new StartSessionRequest());
            var liste = await service.GetAllAsync();

            Assert.Single(liste);
            Assert.Equal(kendi.Session.Id, liste[0].Id);
        }
    }
}
```

- [ ] **Adım 3: Testlerin doğru sebeple kırıldığını gör**

Çalıştır: `dotnet test --filter WorkoutSessionServiceTests`
Beklenen: DERLEME hatası — `WorkoutSessionService` yok.

- [ ] **Adım 4: Servisi yaz**

`src/Grind.Api/Services/WorkoutSessionService.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Session;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class WorkoutSessionService(
    IWorkoutSessionRepository sessionRepository,
    IWorkoutTemplateRepository templateRepository,
    ISetEntryRepository setEntryRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IWorkoutSessionService
{
    private const string SessionNotFound = "Oturum bulunamadı.";
    private const string OpenSessionNotFound = "Bugüne ait açık bir oturum yok.";

    /// <summary>Şablon için ayrı ve id İÇERMEYEN metin — id söylemek tarama imkânı verirdi.</summary>
    private const string TemplateNotFound = "Seçilen şablon bulunamadı.";

    public async Task<IReadOnlyList<SessionResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var sessions = await sessionRepository.GetAllAsync(currentUser.UserId, cancellationToken);

        // Liste ilerleme taşımaz: her satır için ayrı bir sayım sorgusu N+1 olurdu.
        return sessions.Select(s => ToResponse(s, [])).ToList();
    }

    public async Task<SessionResponse> GetByIdAsync(
        long id, CancellationToken cancellationToken = default)
    {
        var session = await OwnedOrThrowAsync(id, cancellationToken);

        return ToResponse(session, await ProgressAsync(session, cancellationToken));
    }

    public async Task<SessionResponse> GetOpenAsync(CancellationToken cancellationToken = default)
    {
        var session = await FindOpenTodayAsync(cancellationToken)
                      ?? throw new NotFoundException(OpenSessionNotFound);

        return ToResponse(session, await ProgressAsync(session, cancellationToken));
    }

    public async Task<StartSessionResult> StartAsync(
        StartSessionRequest request, CancellationToken cancellationToken = default)
    {
        var existing = await FindOpenTodayAsync(cancellationToken);

        if (existing is not null)
        {
            // İdempotent: iki kez tıklanan "Antrenmana Başla" hata değil aynı oturum.
            // Gövdedeki şablon/not bilerek UYGULANMAZ — açık bir oturumu sessizce
            // değiştirmek, kullanıcının fark etmediği bir veri kaybı olurdu.
            return new StartSessionResult(
                ToResponse(existing, await ProgressAsync(existing, cancellationToken)), Created: false);
        }

        if (request.TemplateId is { } templateId)
        {
            // DİKKAT: miras alınan GetByIdAsync sahiplik kontrolü YAPMAZ; kullanmak IDOR olur.
            _ = await templateRepository.GetOwnedByIdAsync(templateId, currentUser.UserId, cancellationToken)
                ?? throw new NotFoundException(TemplateNotFound);
        }

        var session = new WorkoutSession
        {
            UserId = currentUser.UserId,
            TemplateId = request.TemplateId,
            StartedAt = timeProvider.GetUtcNow().UtcDateTime,
            Notes = request.Notes
        };

        sessionRepository.Add(session);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var created = await OwnedOrThrowAsync(session.Id, cancellationToken);

        return new StartSessionResult(
            ToResponse(created, await ProgressAsync(created, cancellationToken)), Created: true);
    }

    public async Task<SessionResponse> FinishAsync(
        long id, CancellationToken cancellationToken = default)
    {
        var session = await OwnedOrThrowAsync(id, cancellationToken);

        if (session.EndedAt is not null)
        {
            // Sessizce izin vermek EndedAt'i ileri kaydırır ve gerçek bitiş zamanını kaybettirir.
            throw new ConflictException("Bu oturum zaten bitirilmiş.");
        }

        session.EndedAt = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(session, await ProgressAsync(session, cancellationToken));
    }

    public async Task<SessionResponse> UpdateNotesAsync(
        long id, UpdateSessionNotesRequest request, CancellationToken cancellationToken = default)
    {
        var session = await OwnedOrThrowAsync(id, cancellationToken);

        session.Notes = request.Notes;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(session, await ProgressAsync(session, cancellationToken));
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var session = await OwnedOrThrowAsync(id, cancellationToken);

        // SetEntry satırları CASCADE ile gider (Faz 1'de konfigüre edildi).
        // FAZ 8 NOTU: rekor taşıyan bir set silindiğinde ilgili egzersizler için
        // RecalculateRecords çağrılmalı — ISetEntryRepository.GetDistinctExerciseIdsForSessionAsync
        // tam bu iş için hazır bekliyor. Bugün SetEntry üreten endpoint olmadığı için
        // yeniden hesaplanacak rekor yok.
        sessionRepository.Remove(session);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// "Bugüne ait açık oturum": <c>EndedAt IS NULL</c> YETMEZ, <c>StartedAt</c> TR yerel
    /// gününde de olmalı. Aksi halde kapatılmayı unutulan dünkü oturum bugünün setlerini
    /// yutar ve onlar dünkü tarihe yazılır (CLAUDE.md). Eski oturum zorla kapatılmaz.
    /// </summary>
    private Task<WorkoutSession?> FindOpenTodayAsync(CancellationToken cancellationToken)
    {
        var (fromUtc, toUtc) = TurkeyDay.RangeFor(timeProvider.GetUtcNow().UtcDateTime);

        return sessionRepository.GetOpenSessionStartedBetweenAsync(
            currentUser.UserId, fromUtc, toUtc, cancellationToken);
    }

    private async Task<WorkoutSession> OwnedOrThrowAsync(long id, CancellationToken cancellationToken)
        => await sessionRepository.GetOwnedByIdAsync(id, currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException(SessionNotFound);

    /// <summary>
    /// Hedef vs gerçekleşen. Şablonsuz oturumda karşılaştıracak hedef olmadığı için boş döner
    /// ve sayım sorgusu hiç çalışmaz.
    /// </summary>
    private async Task<IReadOnlyList<SessionProgressResponse>> ProgressAsync(
        WorkoutSession session, CancellationToken cancellationToken)
    {
        if (session.Template is null)
        {
            return [];
        }

        var completed = await setEntryRepository.GetCompletedSetCountsAsync(session.Id, cancellationToken);

        return session.Template.TemplateExercises
            .OrderBy(te => te.OrderIndex)
            .Select(te => new SessionProgressResponse(
                te.ExerciseId,
                te.Exercise.Name,
                te.PlannedSets,
                completed.GetValueOrDefault(te.ExerciseId)))
            .ToList();
    }

    private static SessionResponse ToResponse(
        WorkoutSession session, IReadOnlyList<SessionProgressResponse> progress) => new(
        session.Id,
        session.StartedAt,
        session.EndedAt,
        IsOpen: session.EndedAt is null,
        session.TemplateId,
        session.Template?.Name,
        session.Notes,
        progress);
}
```

- [ ] **Adım 5: Testleri çalıştır**

Çalıştır: `dotnet test`
Beklenen: tümü yeşil, sayı 279 → **298** (19 yeni test).

- [ ] **Adım 6: Kasıtlı kırma ile üç testin iş gördüğünü kanıtla**

1. `FindOpenTodayAsync`'teki `TurkeyDay.RangeFor(...)` yerine çok geniş bir aralık ver (örn. `DateTime.MinValue`–`DateTime.MaxValue`), yani gün filtresini etkisizleştir.
   `Gece_yarisini_gecince_dunun_acik_oturumu_bugunun_sayilmaz` **KIRMIZI** olmalı. Geri al.
2. `FinishAsync`'teki `if (session.EndedAt is not null)` bloğunu kaldır.
   `Bitmis_oturumu_tekrar_bitirmek_reddedilir` **KIRMIZI** olmalı. Geri al.
3. `StartAsync`'teki şablon sahiplik kontrolünde `GetOwnedByIdAsync` yerine miras alınan `templateRepository.GetByIdAsync(templateId, cancellationToken)` kullan.
   `Baskasinin_sablonuyla_oturum_acilamaz_404_verir` **KIRMIZI** olmalı — bu, IDOR'un gerçekten kapalı olduğunun kanıtı. Geri al.

Üçünün sonucunu da rapora yaz; her kırmadan sonra paketi yeşile döndür.

- [ ] **Adım 7: Commit**

```bash
git add src/Grind.Api/Services tests/Grind.Tests/Services/WorkoutSessionServiceTests.cs
git commit -m "feat(session): WorkoutSessionService - gun siniri, sahiplik, ilerleme"
```

---

### Task 4: `SessionsController`, DI ve faz kapanışı

**Files:**
- Create: `src/Grind.Api/Controllers/SessionsController.cs`
- Modify: `src/Grind.Api/Services/DependencyInjection.cs`
- Modify: `src/Grind.Api/Program.cs` (`TimeProvider` kaydı)
- Modify: `PLAN.md`
- Test: `tests/Grind.Tests/Integration/SessionEndpointsTests.cs`

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Integration/SessionEndpointsTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Session;

namespace Grind.Tests.Integration;

[Trait("Category", "Database")]
public class SessionEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = $"ss_{Guid.NewGuid():N}"[..20],
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
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await factory.CreateClient().GetAsync("/api/sessions")).StatusCode);
    }

    /// <summary>İlk çağrı 201 (yeni), ikinci çağrı 200 (var olan) — idempotent başlatma.</summary>
    [Fact]
    public async Task Baslatma_ilk_cagrida_201_ikincide_200_verir()
    {
        var client = await AuthenticatedClientAsync();

        var ilk = await client.PostAsJsonAsync("/api/sessions", new StartSessionRequest(), Json);
        var ikinci = await client.PostAsJsonAsync("/api/sessions", new StartSessionRequest(), Json);

        Assert.Equal(HttpStatusCode.Created, ilk.StatusCode);
        Assert.Equal(HttpStatusCode.OK, ikinci.StatusCode);

        var a = await ilk.Content.ReadFromJsonAsync<SessionResponse>(Json);
        var b = await ikinci.Content.ReadFromJsonAsync<SessionResponse>(Json);
        Assert.Equal(a!.Id, b!.Id);
    }

    [Fact]
    public async Task Acik_oturum_ucu_baslatilan_oturumu_dondurur()
    {
        var client = await AuthenticatedClientAsync();
        var baslatma = await client.PostAsJsonAsync("/api/sessions", new StartSessionRequest(), Json);
        var olusan = await baslatma.Content.ReadFromJsonAsync<SessionResponse>(Json);

        var acik = await client.GetFromJsonAsync<SessionResponse>("/api/sessions/open", Json);

        Assert.Equal(olusan!.Id, acik!.Id);
        Assert.True(acik.IsOpen);
    }

    [Fact]
    public async Task Acik_oturum_yokken_open_ucu_404_verir()
    {
        var client = await AuthenticatedClientAsync();

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/sessions/open")).StatusCode);
    }

    [Fact]
    public async Task Bitirme_200_tekrar_bitirme_409_verir()
    {
        var client = await AuthenticatedClientAsync();
        var baslatma = await client.PostAsJsonAsync("/api/sessions", new StartSessionRequest(), Json);
        var olusan = await baslatma.Content.ReadFromJsonAsync<SessionResponse>(Json);

        var ilk = await client.PostAsync($"/api/sessions/{olusan!.Id}/finish", null);
        var ikinci = await client.PostAsync($"/api/sessions/{olusan.Id}/finish", null);

        Assert.Equal(HttpStatusCode.OK, ilk.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, ikinci.StatusCode);
    }

    [Fact]
    public async Task Baska_kullanicinin_oturumu_404_verir()
    {
        var birinci = await AuthenticatedClientAsync();
        var baslatma = await birinci.PostAsJsonAsync("/api/sessions", new StartSessionRequest(), Json);
        var olusan = await baslatma.Content.ReadFromJsonAsync<SessionResponse>(Json);

        var ikinci = await AuthenticatedClientAsync();

        Assert.Equal(HttpStatusCode.NotFound,
            (await ikinci.GetAsync($"/api/sessions/{olusan!.Id}")).StatusCode);
    }

    [Fact]
    public async Task Not_guncellenebilir()
    {
        var client = await AuthenticatedClientAsync();
        var baslatma = await client.PostAsJsonAsync("/api/sessions", new StartSessionRequest(), Json);
        var olusan = await baslatma.Content.ReadFromJsonAsync<SessionResponse>(Json);

        var response = await client.PatchAsync($"/api/sessions/{olusan!.Id}",
            new StringContent("""{"notes":"Guclu hissettim"}""", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var guncel = await response.Content.ReadFromJsonAsync<SessionResponse>(Json);
        Assert.Equal("Guclu hissettim", guncel!.Notes);
    }

    [Fact]
    public async Task Silinen_oturum_sonrasinda_404_verir()
    {
        var client = await AuthenticatedClientAsync();
        var baslatma = await client.PostAsJsonAsync("/api/sessions", new StartSessionRequest(), Json);
        var olusan = await baslatma.Content.ReadFromJsonAsync<SessionResponse>(Json);

        var silme = await client.DeleteAsync($"/api/sessions/{olusan!.Id}");
        var sonra = await client.GetAsync($"/api/sessions/{olusan.Id}");

        Assert.Equal(HttpStatusCode.NoContent, silme.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, sonra.StatusCode);
    }
}
```

- [ ] **Adım 2: Testlerin doğru sebeple kırıldığını gör**

Çalıştır: `dotnet test --filter SessionEndpointsTests`
Beklenen: DERLEME hatası ya da 404'ler — `SessionsController` yok.

- [ ] **Adım 3: `TimeProvider`'ı ve servisi DI'a ekle**

`src/Grind.Api/Program.cs` — `builder.Services.AddApplicationServices();` satırının ÜSTÜNE:

```csharp
// Saat bir bağımlılık: servisler DateTime.UtcNow çağırmaz, bunu enjekte alır.
// Gün sınırı testleri ancak sahte bir sağlayıcıyla deterministik olabiliyor.
builder.Services.AddSingleton(TimeProvider.System);
```

`src/Grind.Api/Services/DependencyInjection.cs` içindeki `AddApplicationServices`'e:

```csharp
        services.AddScoped<IWorkoutSessionService, WorkoutSessionService>();
```

- [ ] **Adım 4: Controller'ı yaz**

`src/Grind.Api/Controllers/SessionsController.cs`:

```csharp
using Grind.Api.Models.Dtos.Session;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// İnce kalır: gün sınırı, sahiplik ve ilerleme hesabı servis katmanında,
/// hata çevirisi GlobalExceptionHandler'da. Burada if/try yoktur.
/// </summary>
[ApiController]
[Authorize]
[Route("api/sessions")]
public class SessionsController(IWorkoutSessionService sessionService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SessionResponse>>> GetAll(
        CancellationToken cancellationToken)
        => Ok(await sessionService.GetAllAsync(cancellationToken));

    /// <summary>Bugüne (TR yerel günü) ait açık oturum; yoksa 404.</summary>
    [HttpGet("open")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionResponse>> GetOpen(CancellationToken cancellationToken)
        => Ok(await sessionService.GetOpenAsync(cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionResponse>> GetById(long id, CancellationToken cancellationToken)
        => Ok(await sessionService.GetByIdAsync(id, cancellationToken));

    /// <summary>
    /// Başlatır. Bugüne ait açık bir oturum zaten varsa onu **200** ile döndürür;
    /// yeni açıldıysa **201**. Böylece iki kez tıklamak hata üretmez.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionResponse>> Start(
        StartSessionRequest request, CancellationToken cancellationToken)
    {
        var result = await sessionService.StartAsync(request, cancellationToken);

        return result.Created
            ? CreatedAtAction(nameof(GetById), new { id = result.Session.Id }, result.Session)
            : Ok(result.Session);
    }

    [HttpPost("{id:long}/finish")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SessionResponse>> Finish(long id, CancellationToken cancellationToken)
        => Ok(await sessionService.FinishAsync(id, cancellationToken));

    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionResponse>> UpdateNotes(
        long id, UpdateSessionNotesRequest request, CancellationToken cancellationToken)
        => Ok(await sessionService.UpdateNotesAsync(id, request, cancellationToken));

    /// <summary>Siler; bağlı setler CASCADE ile gider.</summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await sessionService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
```

- [ ] **Adım 5: Testleri ve derlemeyi çalıştır**

Çalıştır: `dotnet test` → tümü yeşil, sayı 298 → **306** (8 yeni test).
Çalıştır: `dotnet build -c Release` → 0 uyarı, 0 hata.

- [ ] **Adım 6: Uçtan uca duman testi**

`docker compose up -d`, sonra `dotnet run --project src/Grind.Api`. Token alarak:

1. `POST /api/auth/register` → token
2. `GET /api/sessions` (token'sız) → **401**
3. `POST /api/sessions` boş gövdeyle → **201**, `isOpen: true`
4. Aynı çağrıyı tekrar → **200**, aynı `id`
5. `GET /api/sessions/open` → **200**, aynı oturum
6. `PATCH /api/sessions/{id}` `{"notes":"test"}` → **200**
7. Bir şablon oluşturup `POST /api/sessions` ile onu kullanmayı dene — **açık oturum olduğu için 200 döner ve şablon uygulanmaz** (bilinçli davranış). Önce `finish` edip sonra şablonla başlat → **201**, `templateName` dolu, `progress` hedef set sayısını gösteriyor
8. `POST /api/sessions/{id}/finish` → **200**; tekrar → **409**
9. `POST /api/sessions` başkasının şablon id'siyle → **404**
10. `DELETE /api/sessions/{id}` → **204**, sonra `GET` → **404**

Gözlenen durum kodlarını ve gövdeleri rapora yaz. Çalıştıramazsan açıkça söyle.

- [ ] **Adım 7: PLAN.md'yi kapat**

Faz 7 maddelerini (7.1–7.5) tamamlandı olarak işaretle; Faz 0-6'nın biçimini birebir taklit et.
Faz 8'i "sırada" yap. Devreden not bloklarını SİLME. **Faz 7'den devreden notlar** başlıklı yeni bir blok ekle:

1. **Faz 8 için ZORUNLU:** `WorkoutSessionService.DeleteAsync` bugün yalnızca siliyor. Faz 8 rekor motorunu getirince, silmeden ÖNCE `ISetEntryRepository.GetDistinctExerciseIdsForSessionAsync(sessionId)` ile etkilenen egzersizler alınıp her biri için BİR KEZ `RecalculateRecords` çağrılmalı. Bugün doğru olmasının tek sebebi `SetEntry` üreten bir endpoint bulunmaması.
2. **Faz 8 için açık soru:** şablon okumaları arşivlenmiş egzersizleri gösteriyor. Arşivlenmiş bir egzersize `SetEntry` girilebilmeli mi? Faz 6'daki karşılığı "yazarken katı"ydı; Faz 8 bunu açıkça karara bağlamalı.
3. **Dağıtım notu:** `TurkeyDay` `TimeZoneInfo`'ya dayanıyor. Çok ince bir container imajında saat dilimi veritabanı (tzdata/ICU) yoksa çalışma anında `TimeZoneNotFoundException` verir. Dağıtım imajı seçilirken kontrol edilmeli.
4. **Bilinçli davranış:** açık bir oturum varken `POST /api/sessions` gövdedeki `templateId`/`notes` değerlerini UYGULAMAZ, var olan oturumu olduğu gibi döndürür — açık bir oturumu sessizce değiştirmek fark edilmeyen bir veri kaybı olurdu.

- [ ] **Adım 8: Commit**

```bash
git add src/Grind.Api/Controllers src/Grind.Api/Services/DependencyInjection.cs src/Grind.Api/Program.cs tests/Grind.Tests/Integration/SessionEndpointsTests.cs
git commit -m "feat(session): SessionsController, endpointler ve TimeProvider kaydi"
git add PLAN.md
git commit -m "docs: Faz 7 tamamlandi"
```
