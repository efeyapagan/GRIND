# Frontend Dilim 3 — Açılır Set Paneli, Çizgi Grafik ve Tahmini 1RM Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bugün ekranındaki set panelini yalnızca gerektiğinde açılır yapmak; hareket grafiğini
sekmeli (Ağırlık / Antrenman / Tahmini 1RM), aralıklı (1 Ay / 3 Ay / Tüm), turuncu bir çizgi grafiğe
çevirmek; bunu besleyen hareket ilerleme ucunu ve Brzycki 1RM hesaplayıcısını eklemek.

**Architecture:** Önce backend: saf `OneRepMaxEstimator`, izlemesiz bir set sorgusu, ayrı
`ExerciseProgressService` ve `StatsController` altında yeni uç; tipler yeniden üretilir. Sonra
frontend grafik zinciri: saf eksen hesabı (`lib/grafik.ts`), ölçüm hook'u, veri bilmeyen
`ui/CizgiGrafik`, `useExerciseProgress` ve yeniden yazılan `HareketGecmisi`. En son açılır panel:
`AddSetForm` alt alanın tamamını yönetir, açık/kapalı durumu `TodayPage`'de. Görsel doğrulama ve
dokümantasyon kontrolcü görevleridir.

**Tech Stack:** .NET 10 + EF Core (Npgsql) + xUnit; React 19 + Vite 8 + TypeScript + TanStack Query 5
+ Tailwind v4 + lucide-react; Vitest + Testing Library + MSW.

**Spec:** `docs/superpowers/specs/2026-09-14-acilir-panel-ve-cizgi-grafik-design.md` (bağlayıcı).
**Issue:** #43 — commit mesajlarına `Refs #43` satırı eklenir.

---

## Global Constraints

Her görevin gereksinimleri bu bölümü örtük olarak içerir.

- **Stil yalnızca Tailwind yardımcı sınıfları + `@theme` tokenlarıyla.** Satır içi `style=` YOK, UI ve
  grafik kütüphanesi YOK, `@apply` YOK, `focus:outline-none` YOK, hazır renk paleti YOK. SVG
  özniteliklerinde sayısal geometri (`x`, `y`, `width`, `d`, `strokeWidth`, `stopOpacity`) serbesttir;
  renkler yine token sınıflarıyla (`text-accent` + `currentColor`, `fill-*`, `stroke-*`).
- **`accent` kuralı (spec Karar 3):** yeni `accent` yalnızca çizgi grafiğin çizgisi, noktaları, alan
  degradesi, değer etiketi dolgusu (üstünde `on-accent` metin, opaklık yok) ve grafik sekmelerinde aktif
  sekmenin alt çizgisi. Izgara, eksen metni, özet etiketleri, aralık seçici nötr. Panel açma düğmesi
  mevcut birincil düğme kuralıyla `accent`.
- **Görünen BÜYÜK HARF yalnızca CSS ile (`uppercase`).**
- **Erişilebilirlik:** her girdinin `<label>`'ı; süs öğeleri `aria-hidden`; yalnızca ikon düğme
  `aria-label`; hata `role="alert"`; dokunma hedefi ≥ 44×44 px; sekmeler `role="tablist"`/`role="tab"`
  + `aria-selected`; aralık düğmeleri `aria-pressed`; panel açma düğmesi `aria-expanded`.
- **Sunucudaki hesap istemcide tekrarlanmaz:** en ağır set, hacim, set sayısı, 1RM sunucudan gelir.
  Sunum serbesttir: eksen değerleri, "Fark" (son − ilk), aralığın başlangıç tarihi.
- **Zaman `Europe/Istanbul`** (`lib/format.ts`).
- **API tipleri elle yazılmaz** (`npm run api:types`); yanıtlar `dogrulanmis*` fonksiyonlarında
  daraltılır (`!` yok).
- **Backend:** Controller → Service → Repository; sahiplik kontrolü açıkça (CLAUDE.md IDOR kuralı,
  nötr 404); yeni migration YOK (şema değişmiyor).
- **Testler davranış sınar;** var olan test silinmez ve zayıflatılmaz. Spec'in değiştirdiği davranışın
  testi (eski çubuk grafik, "Geçen sefer", `/api/history` ile geçmiş isteği) yeni davranışı sınayacak
  şekilde değiştirilir; panel artık kapalı başladığı için form alanlarıyla etkileşen testler önce paneli
  açar — başka değişiklik yok.
- **Metinler Türkçe**; test adları Türkçe (frontend ASCII, backend `Alt_cizgili`); kod yorumları Türkçe
  (frontend dosyalarında ASCII).
- **Doğrulama:** backend `dotnet build` + `dotnet test tests/Grind.Tests` (PostgreSQL:
  `docker compose up -d`; çalışan bir API süreci varsa derleme dosya kilidine takılır — kapat ya da
  bildir); frontend `web/` içinde `npm run typecheck` (= `tsc -b`), `npm run lint`, `npm run test`,
  `npm run build`.
- **Commit mesajları** Türkçe, ASCII karakterlerle, `feat`/`fix`/`test`/`docs` (frontend `(web)`
  kapsamlı) önekli; ayrı `-m` satırları olarak önce `Refs #43`, sonra
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## Dosya Haritası

**Backend (Görev 1):**
- Create: `src/Grind.Api/Common/Records/OneRepMaxEstimator.cs`,
  `src/Grind.Api/Models/Dtos/Stats/ExerciseProgressResponse.cs`,
  `src/Grind.Api/Models/Dtos/Stats/ExerciseProgressPointResponse.cs`,
  `src/Grind.Api/Services/IExerciseProgressService.cs`, `src/Grind.Api/Services/ExerciseProgressService.cs`
- Modify: `src/Grind.Api/Repositories/ISetEntryRepository.cs`, `SetEntryRepository.cs`,
  `src/Grind.Api/Services/DependencyInjection.cs`, `src/Grind.Api/Controllers/StatsController.cs`
- Test: `tests/Grind.Tests/Common/OneRepMaxEstimatorTests.cs`,
  `tests/Grind.Tests/Services/ExerciseProgressServiceTests.cs`,
  `tests/Grind.Tests/Integration/QueryEndpointsTests.cs`
- Modify (üretilir): `web/src/api/schema.d.ts`

**Frontend grafik (Görev 2):**
- Create: `web/src/lib/grafik.ts` + `grafik.test.ts`, `web/src/lib/useGenislik.ts`,
  `web/src/ui/CizgiGrafik.tsx` + `CizgiGrafik.test.tsx`
- Delete: `web/src/ui/HacimGrafigi.tsx`, `web/src/ui/HacimGrafigi.test.tsx`
- Modify: `web/src/lib/format.ts` + `format.test.ts`, `web/src/api/queries.ts`,
  `web/src/components/HareketGecmisi.tsx` + `HareketGecmisi.test.tsx`,
  `web/src/components/HareketKartlari.tsx`, `web/src/pages/TodayPage.tsx`,
  `web/src/pages/TodayPage.test.tsx`

**Frontend panel (Görev 3):**
- Modify: `web/src/ui/BirincilDugme.tsx`, `web/src/components/AddSetForm.tsx`,
  `web/src/pages/TodayPage.tsx`, `web/src/pages/TodayPage.test.tsx`

**Dokümanlar (Görev 5):** `docs/superpowers/specs/2026-09-12-frontend-gorsel-tasarim-design.md`,
`PLAN.md`, `CLAUDE.md`, dilim 3 spec'i.

---

### Task 1: Backend — tahmini 1RM ve hareket ilerleme ucu

**Files:** yukarıdaki "Backend (Görev 1)" listesi.

**Interfaces:**
- Consumes: `IExerciseRepository.GetVisibleByIdAsync(long id, long userId, bool includeMedia = false, CancellationToken)`,
  `LocalDayRange.Resolve(DateOnly?, DateOnly?)` (ters aralıkta `ValidationException`),
  `TurkeyDay.LocalDateOf(DateTime)`, `StatsRangeQuery` (`From`, `To`).
- Produces:
  - `OneRepMaxEstimator.Estimate(decimal weight, int reps): decimal?`, `MaxRepsForEstimate = 12`.
  - `ISetEntryRepository.GetForExerciseInRangeAsync(long userId, long exerciseId, DateTime? fromUtcInclusive, DateTime? toUtcExclusive, CancellationToken)`.
  - `IExerciseProgressService.GetAsync(long exerciseId, StatsRangeQuery query, CancellationToken)` → `ExerciseProgressResponse`.
  - `GET /api/stats/exercises/{exerciseId}/progress?From=&To=`.
  - JSON: `{ exerciseId, exerciseName, points: [{ sessionId, startedAt, date: "2026-03-12", topWeight, topWeightReps, volume, setCount, estimatedOneRepMax: number | null }] }`.

- [ ] **Step 1: 1RM testleri (kırmızı)**

`tests/Grind.Tests/Common/OneRepMaxEstimatorTests.cs`:

```csharp
using Grind.Api.Common.Records;

namespace Grind.Tests.Common;

public class OneRepMaxEstimatorTests
{
    /// <summary>
    /// Brzycki: ağırlık × 36 / (37 − tekrar). 10.12 × 5 = 11.385 tam orta nokta: banker's rounding
    /// 11.38 verirdi, yarım yukarı 11.39 (kilo gösteriminde projedeki yuvarlama kuralı).
    /// </summary>
    [Theory]
    [InlineData(100.0, 5, 112.5)]
    [InlineData(110.0, 3, 116.47)]
    [InlineData(80.0, 1, 80.0)]
    [InlineData(60.0, 12, 86.4)]
    [InlineData(10.12, 5, 11.39)]
    public void Brzycki_ile_tahmin_eder_ve_yarim_yukari_yuvarlar(double weight, int reps, double expected)
    {
        Assert.Equal<decimal?>((decimal)expected, OneRepMaxEstimator.Estimate((decimal)weight, reps));
    }

    /// <summary>12'nin üstünde formül güvenilmez; 0 kg (barfiks/dips) ve 0 tekrar anlamsız.</summary>
    [Theory]
    [InlineData(100.0, 13)]
    [InlineData(0.0, 5)]
    [InlineData(100.0, 0)]
    public void Tahmin_edilemeyen_setlerde_null_doner(double weight, int reps)
    {
        Assert.Null(OneRepMaxEstimator.Estimate((decimal)weight, reps));
    }
}
```

Run: `dotnet build tests/Grind.Tests` → FAIL (`OneRepMaxEstimator` yok).

- [ ] **Step 2: `OneRepMaxEstimator`**

`src/Grind.Api/Common/Records/OneRepMaxEstimator.cs`:

```csharp
namespace Grind.Api.Common.Records;

/// <summary>
/// Tahmini tek tekrar maksimumu (1RM), Brzycki formülüyle: <c>ağırlık × 36 / (37 − tekrar)</c>.
/// Saf ve durumsuz — veritabanı, saat, kullanıcı bilmez (<see cref="RecordTracker"/> deseni).
/// Sonuç SAKLANMAZ, sorgu anında hesaplanır: formül değişirse geçmiş satırlar yeniden yazılmaz
/// (dilim 3 spec Karar 1). Epley yerine Brzycki: 10 tekrarın altında daha isabetli ve tekrar
/// tavanıyla birlikte kullanılıyor.
/// </summary>
public static class OneRepMaxEstimator
{
    /// <summary>Bu tekrar sayısının üstünde formül güvenilmez; tahmin yapılmaz.</summary>
    public const int MaxRepsForEstimate = 12;

    /// <summary>
    /// Tahmin edilemiyorsa <c>null</c>: ağırlıksız set (0 kg — barfiks/dips; 1RM anlamsız), 1'den az ya
    /// da <see cref="MaxRepsForEstimate"/>'ten fazla tekrar. Sonuç 2 ondalık, yarım yukarı.
    /// </summary>
    public static decimal? Estimate(decimal weight, int reps)
    {
        if (weight <= 0 || reps < 1 || reps > MaxRepsForEstimate)
        {
            return null;
        }

        return decimal.Round(weight * 36m / (37 - reps), 2, MidpointRounding.AwayFromZero);
    }
}
```

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~OneRepMaxEstimatorTests"` → 8 PASS.

- [ ] **Step 3: DTO'lar, repository ve servis arayüzü**

`src/Grind.Api/Models/Dtos/Stats/ExerciseProgressPointResponse.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Bir hareketin tek bir oturumdaki özeti (dilim 3 spec Karar 2). <paramref name="Date"/> oturum
/// başlangıcının TR günüdür. <paramref name="TopWeight"/> o oturumun en ağır seti; eşitlikte en çok
/// tekrarlı olan (<paramref name="TopWeightReps"/>). <paramref name="Volume"/> ve
/// <paramref name="SetCount"/> <c>GET /api/history?ExerciseId=</c> ile aynı tanımdır.
/// <paramref name="EstimatedOneRepMax"/> setlerin Brzycki tahminlerinin en büyüğü; hiçbiri tahmin
/// edilemiyorsa <c>null</c>.
/// </summary>
public record ExerciseProgressPointResponse(
    long SessionId,
    DateTime StartedAt,
    DateOnly Date,
    decimal TopWeight,
    int TopWeightReps,
    decimal Volume,
    int SetCount,
    decimal? EstimatedOneRepMax);
```

`src/Grind.Api/Models/Dtos/Stats/ExerciseProgressResponse.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Stats;

/// <summary>Hareket ilerleme grafiğinin verisi; noktalar eskiden yeniye.</summary>
public record ExerciseProgressResponse(
    long ExerciseId,
    string ExerciseName,
    IReadOnlyList<ExerciseProgressPointResponse> Points);
```

`src/Grind.Api/Repositories/ISetEntryRepository.cs` — `GetInRangeAsync` bildiriminin ALTINA:

```csharp

    /// <summary>
    /// Kullanıcının bir egzersize ait, oturumu verilen UTC aralığında BAŞLAMIŞ setleri; oturumuyla
    /// (<c>StartedAt</c> için) birlikte ve izlemesiz. Hareket ilerleme grafiği (dilim 3) okur. Aralık
    /// filtresi <see cref="GetInRangeAsync"/> ile aynı yardımcıdan gelir.
    /// </summary>
    Task<IReadOnlyList<SetEntry>> GetForExerciseInRangeAsync(
        long userId,
        long exerciseId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default);
```

`src/Grind.Api/Repositories/SetEntryRepository.cs` — `GetInRangeAsync`'in ALTINA (`FilterBySessionRange`'in
ÜSTÜNE):

```csharp
    public async Task<IReadOnlyList<SetEntry>> GetForExerciseInRangeAsync(
        long userId,
        long exerciseId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default)
        => await FilterBySessionRange(userId, fromUtcInclusive, toUtcExclusive)
            .AsNoTracking()
            .Where(s => s.ExerciseId == exerciseId)
            .Include(s => s.WorkoutSession)
            .OrderBy(s => s.CreatedAt)
            .ThenBy(s => s.Id)
            .ToListAsync(cancellationToken);
```

`FilterBySessionRange`'in doc yorumundaki "Egzersiz hacmi (Faz 9) ve export (Faz 11) aynı filtreyi
paylaşır" cümlesine "ve hareket ilerlemesi (dilim 3)" ekle.

`src/Grind.Api/Services/IExerciseProgressService.cs`:

```csharp
using Grind.Api.Models.Dtos.Stats;

namespace Grind.Api.Services;

/// <summary>
/// Hareket ilerleme grafiğinin verisi (dilim 3 spec Karar 2). SALT OKUMA: <c>SaveChangesAsync</c>
/// çağırmaz, yeni tablo YOK — mevcut set satırlarından sorgulanır.
/// </summary>
public interface IExerciseProgressService
{
    /// <summary>
    /// Görünür (kendi ya da global, arşivli dahil) egzersizin oturum başına özeti, eskiden yeniye.
    /// Görünmüyorsa nötr 404; ters aralıkta 400.
    /// </summary>
    Task<ExerciseProgressResponse> GetAsync(
        long exerciseId, StatsRangeQuery query, CancellationToken cancellationToken = default);
}
```

- [ ] **Step 4: Servis testleri (kırmızı)**

`tests/Grind.Tests/Services/ExerciseProgressServiceTests.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class ExerciseProgressServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    /// <summary>TR 12 Mart 20:00 (UTC 17:00) — gün sınırından güvenli uzaklıkta.</summary>
    private static DateTime Gun => new(2026, 3, 12, 17, 0, 0, DateTimeKind.Utc);

    private static async Task<(AppDbContext Context, User User, Exercise Exercise,
        ExerciseProgressService Service, IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var service = new ExerciseProgressService(
            new ExerciseRepository(context), new SetEntryRepository(context), new StubCurrentUser(user.Id));

        return (context, user, exercise, service, transaction);
    }

    private static WorkoutSession Seed(
        AppDbContext context, User user, Exercise exercise, DateTime startedAtUtc,
        params (decimal Weight, int Reps)[] sets)
    {
        var session = TestDatabase.NewSession(user);
        session.StartedAt = startedAtUtc;
        context.Add(session);

        foreach (var (weight, reps) in sets)
        {
            context.Add(new SetEntry
            {
                WorkoutSession = session, Exercise = exercise,
                Weight = weight, Reps = reps, RecordType = RecordType.None, CreatedAt = startedAtUtc
            });
        }

        return session;
    }

    [Fact]
    public async Task Oturum_basina_en_agir_set_hacim_ve_tahmini_1RM_doner()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var oturum = Seed(context, user, exercise, Gun, (100m, 5), (100m, 8), (90m, 10));
            await context.SaveChangesAsync();

            var sonuc = await service.GetAsync(exercise.Id, new StatsRangeQuery());

            Assert.Equal(exercise.Id, sonuc.ExerciseId);
            Assert.Equal(exercise.Name, sonuc.ExerciseName);
            var nokta = Assert.Single(sonuc.Points);
            Assert.Equal(oturum.Id, nokta.SessionId);
            Assert.Equal(100m, nokta.TopWeight);
            // Eşit ağırlıkta çok tekrarlı set "en ağır set" sayılır.
            Assert.Equal(8, nokta.TopWeightReps);
            Assert.Equal(2200m, nokta.Volume);
            Assert.Equal(3, nokta.SetCount);
            // 100×5 → 112.5, 100×8 → 124.14, 90×10 → 120: en büyüğü.
            Assert.Equal(124.14m, nokta.EstimatedOneRepMax);
        }
    }

    [Fact]
    public async Task Noktalar_eskiden_yeniye_siralanir()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Gun, (60m, 5));
            Seed(context, user, exercise, Gun.AddDays(-3), (50m, 5));
            await context.SaveChangesAsync();

            var sonuc = await service.GetAsync(exercise.Id, new StatsRangeQuery());

            Assert.Equal([new DateOnly(2026, 3, 9), new DateOnly(2026, 3, 12)], sonuc.Points.Select(p => p.Date));
        }
    }

    [Fact]
    public async Task Tahmin_edilemeyen_setlerde_1RM_null_olur()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Gun, (0m, 10), (50m, 15));
            await context.SaveChangesAsync();

            var sonuc = await service.GetAsync(exercise.Id, new StatsRangeQuery());

            Assert.Null(Assert.Single(sonuc.Points).EstimatedOneRepMax);
        }
    }

    /// <summary>Aralık oturumun BAŞLANGICINA göre (Faz 9 Karar 7), setin CreatedAt'ine göre değil.</summary>
    [Fact]
    public async Task Aralik_oturum_baslangicina_gore_filtrelenir()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Gun.AddDays(-10), (50m, 5));
            Seed(context, user, exercise, Gun, (60m, 5));
            await context.SaveChangesAsync();

            var sonuc = await service.GetAsync(exercise.Id, new StatsRangeQuery { From = new DateOnly(2026, 3, 10) });

            Assert.Equal(new DateOnly(2026, 3, 12), Assert.Single(sonuc.Points).Date);
        }
    }

    [Fact]
    public async Task Gece_yarisini_asan_oturumun_gunu_TR_gunudur()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            // UTC 21:30 → TR (UTC+3) 00:30, ertesi gün.
            Seed(context, user, exercise, new DateTime(2026, 3, 12, 21, 30, 0, DateTimeKind.Utc), (60m, 5));
            await context.SaveChangesAsync();

            var sonuc = await service.GetAsync(exercise.Id, new StatsRangeQuery());

            Assert.Equal(new DateOnly(2026, 3, 13), Assert.Single(sonuc.Points).Date);
        }
    }

    [Fact]
    public async Task Baskasinin_ozel_egzersizi_404_verir()
    {
        var (context, _, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, $"Ozel {Guid.NewGuid():N}");
            context.AddRange(digerKullanici, digerEgzersiz);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.GetAsync(digerEgzersiz.Id, new StatsRangeQuery()));
        }
    }

    /// <summary>Global egzersiz herkese görünür ama noktalar yalnızca çağıranın setlerinden oluşur.</summary>
    [Fact]
    public async Task Global_egzersizde_baskasinin_setleri_noktalara_girmez()
    {
        var (context, user, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var global = await context.Exercises.FindAsync(1L);
            var digerKullanici = TestDatabase.NewUser();
            context.Add(digerKullanici);
            Seed(context, digerKullanici, global!, Gun, (200m, 5));
            Seed(context, user, global!, Gun, (60m, 5));
            await context.SaveChangesAsync();

            var sonuc = await service.GetAsync(1L, new StatsRangeQuery());

            Assert.Equal(60m, Assert.Single(sonuc.Points).TopWeight);
        }
    }

    [Fact]
    public async Task Ters_aralik_reddedilir()
    {
        var (_, _, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(() => service.GetAsync(exercise.Id,
                new StatsRangeQuery { From = new DateOnly(2026, 3, 10), To = new DateOnly(2026, 3, 1) }));
        }
    }
}
```

Run: `dotnet build tests/Grind.Tests` → FAIL (`ExerciseProgressService` yok).

- [ ] **Step 5: `ExerciseProgressService` ve kayıt**

`src/Grind.Api/Services/ExerciseProgressService.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Records;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class ExerciseProgressService(
    IExerciseRepository exerciseRepository,
    ISetEntryRepository setEntryRepository,
    ICurrentUserService currentUser) : IExerciseProgressService
{
    /// <summary>Sahiplik hakkında hiçbir şey söylemeyen TEK metin (geçmiş ucuyla aynı).</summary>
    private const string ExerciseNotFound = "Egzersiz bulunamadı.";

    public async Task<ExerciseProgressResponse> GetAsync(
        long exerciseId, StatsRangeQuery query, CancellationToken cancellationToken = default)
    {
        var (fromUtc, toUtc) = LocalDayRange.Resolve(query.From, query.To);

        // IDOR: kendi ya da global egzersiz; başkasının özel egzersizi nötr 404 (CLAUDE.md).
        var exercise = await exerciseRepository.GetVisibleByIdAsync(
                           exerciseId, currentUser.UserId, cancellationToken: cancellationToken)
                       ?? throw new NotFoundException(ExerciseNotFound);

        var sets = await setEntryRepository.GetForExerciseInRangeAsync(
            currentUser.UserId, exerciseId, fromUtc, toUtc, cancellationToken);

        // Gruplama bellekte: tek kullanıcının tek egzersize ait setleri küçük; TR günü kuralının SQL'de
        // ikinci bir kopyası yazılmaz (Faz 9 Karar 6).
        var points = sets
            .GroupBy(s => s.WorkoutSessionId)
            .Select(g =>
            {
                var startedAt = g.First().WorkoutSession.StartedAt;
                var top = g.OrderByDescending(s => s.Weight).ThenByDescending(s => s.Reps).First();
                return new ExerciseProgressPointResponse(
                    g.Key,
                    startedAt,
                    TurkeyDay.LocalDateOf(startedAt),
                    top.Weight,
                    top.Reps,
                    g.Sum(s => s.Weight * s.Reps),
                    g.Count(),
                    // Max, null değerleri yok sayar; hepsi null ise null döner.
                    g.Max(s => OneRepMaxEstimator.Estimate(s.Weight, s.Reps)));
            })
            .OrderBy(p => p.StartedAt)
            .ThenBy(p => p.SessionId)
            .ToList();

        return new ExerciseProgressResponse(exercise.Id, exercise.Name, points);
    }
}
```

`src/Grind.Api/Services/DependencyInjection.cs` — `IStatsService` kaydının ALTINA:

```csharp
        services.AddScoped<IExerciseProgressService, ExerciseProgressService>();
```

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~ExerciseProgressServiceTests"` → 8 PASS.

- [ ] **Step 6: Uç ve uçtan uca testler**

`tests/Grind.Tests/Integration/QueryEndpointsTests.cs`:
- `Tokensiz_istekler_401_verir` teorisine `[InlineData("/api/stats/exercises/1/progress")]` ekle.
- Dosyanın sonuna (sınıf içinde):

```csharp
    [Fact]
    public async Task Hareket_ilerlemesi_bugunun_noktasini_sunucu_degerleriyle_doner()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        await PostSetAsync(client, exerciseId, 100m, 5);
        await PostSetAsync(client, exerciseId, 100m, 8);

        var sonuc = await client.GetFromJsonAsync<ExerciseProgressResponse>(
            $"/api/stats/exercises/{exerciseId}/progress", Json);

        var nokta = Assert.Single(sonuc!.Points);
        Assert.Equal(100m, nokta.TopWeight);
        Assert.Equal(8, nokta.TopWeightReps);
        Assert.Equal(1300m, nokta.Volume);
        Assert.Equal(2, nokta.SetCount);
        Assert.Equal(124.14m, nokta.EstimatedOneRepMax);
    }

    [Fact]
    public async Task Hareket_ilerlemesi_baskasinin_ozel_egzersizinde_404_verir()
    {
        var sahip = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(sahip);

        var davetsiz = await AuthenticatedClientAsync();
        var response = await davetsiz.GetAsync($"/api/stats/exercises/{exerciseId}/progress");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Hareket_ilerlemesi_ters_aralikta_400_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.GetAsync("/api/stats/exercises/1/progress?from=2026-03-10&to=2026-03-01");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
```

`src/Grind.Api/Controllers/StatsController.cs`:
- Birincil kurucu: `public class StatsController(IStatsService statsService, IExerciseProgressService exerciseProgressService) : ControllerBase`
- Sınıfın sonuna:

```csharp

    /// <summary>
    /// Bir hareketin oturum başına en ağır seti, hacmi ve tahmini 1RM'i, eskiden yeniye (dilim 3).
    /// Egzersiz görünmüyorsa nötr 404.
    /// </summary>
    [HttpGet("exercises/{exerciseId:long}/progress")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExerciseProgressResponse>> GetExerciseProgress(
        long exerciseId, [FromQuery] StatsRangeQuery query, CancellationToken cancellationToken)
        => Ok(await exerciseProgressService.GetAsync(exerciseId, query, cancellationToken));
```

- [ ] **Step 7: Tüm backend yeşil**

Run: `dotnet build` ve `dotnet test tests/Grind.Tests`
Expected: 0 uyarı, 0 hata; tüm testler PASS. Sayı komutla
(`grep -rE '^\s*\[(Fact|InlineData)' tests/Grind.Tests --include=*.cs | wc -l`): 651 → **671**
(+20: 1RM 8, servis 8, uç 4).

- [ ] **Step 8: Frontend tiplerini yeniden üret**

API'yi arka planda başlat (`dotnet run --project src/Grind.Api`), swagger 200 dönünce:

```bash
cd web && npm run api:types && git diff --stat src/api/schema.d.ts
```

Expected: `ExerciseProgressResponse` / `ExerciseProgressPointResponse` şemaları ve yeni yol eklenir.
API sürecini durdur. Run: `cd web && npm run typecheck && npm run test` → 19 dosya, 109 test PASS.

- [ ] **Step 9: Commit**

```bash
git add src/Grind.Api tests/Grind.Tests web/src/api/schema.d.ts
git commit -m "feat: hareket ilerleme ucu ve tahmini 1RM (Brzycki)" -m "Refs #43" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Frontend — sekmeli turuncu çizgi grafik

**Files:** yukarıdaki "Frontend grafik (Görev 2)" listesi.

**Interfaces:**
- Consumes: Görev 1'in `schema.d.ts`'i (`ExerciseProgressResponse`, `ExerciseProgressPointResponse`,
  `/api/stats/exercises/{exerciseId}/progress`); mevcut `formatKisaTarih`, `formatWeight`.
- Produces:
  - `lib/grafik.ts`: `eksenDegerleri(enKucuk: number, enBuyuk: number, adimSayisi = 4): number[]`.
  - `lib/useGenislik.ts`: `useGenislik(ref: RefObject<HTMLElement | null>, varsayilan: number): number`.
  - `lib/format.ts`: `trBugundenOnce(gun: number, simdi?: Date): string` (`"YYYY-MM-DD"`),
    `formatAralik(ilkIso: string, sonIso: string): string`, `formatFark(fark: number): string`.
  - `ui/CizgiGrafik` (`{ noktalar: { etiket: string; deger: number }[]; birim: string; baslik: string }`).
  - `queries.ts`: `type IlerlemeAraligi = '1a' | '3a' | 'tum'`, `interface IlerlemeNoktasi`,
    `queryKeys.exerciseProgressAll(exerciseId)`, `queryKeys.exerciseProgress(exerciseId, aralik)`,
    `useExerciseProgress(exerciseId: number, aralik: IlerlemeAraligi)`. `useExerciseHistory` ve
    `queryKeys.exerciseHistory` KALDIRILIR.
  - `HareketGecmisi` props: `{ exerciseId: number; exerciseName: string }` (`bugunkuOturumId` kalkar);
    `HareketKartlari`'dan da `bugunkuOturumId` kalkar.

- [ ] **Step 1: Saf yardımcı testleri (kırmızı)**

`web/src/lib/grafik.test.ts`:

```ts
import { eksenDegerleri } from './grafik';

test('eksen degerleri 1-2-2,5-5 adimlariyla araligi kapsar', () => {
  expect(eksenDegerleri(183, 214)).toEqual([180, 190, 200, 210, 220]);
});

test('tek degerde eksen bir adim yukari genisler', () => {
  expect(eksenDegerleri(800, 800)).toEqual([800, 1000]);
});
```

`web/src/lib/format.test.ts` — import satırını
`import { formatAralik, formatFark, formatTrDate, formatTrTime, formatWeight, trBugundenOnce } from './format';`
yap (dosyada `formatKisaTarih` de import ediliyorsa koru) ve dosyanın SONUNA:

```ts
test('trBugundenOnce TR gununden geriye sayar ve gun sinirini TR saatine gore gecer', () => {
  // UTC 21:30 -> TR 00:30, yani TR'de 15 Eylul; 30 gun oncesi 16 Agustos.
  expect(trBugundenOnce(30, new Date('2026-09-14T21:30:00Z'))).toBe('2026-08-16');
  expect(trBugundenOnce(0, new Date('2026-09-14T09:00:00Z'))).toBe('2026-09-14');
});

test('formatAralik ilk ve son TR gununu yil ile yazar', () => {
  expect(formatAralik('2026-08-25T08:00:00Z', '2026-09-10T08:00:00Z')).toBe('25 Ağu – 10 Eyl 2026');
});

test('formatFark isaretli ve TR ondalikli yazar', () => {
  expect(formatFark(2.5)).toBe('+2,5');
  expect(formatFark(-32.5)).toBe('−32,5');
  expect(formatFark(0)).toBe('0');
});
```

Run: `cd web && npx vitest run src/lib` → yeni testler FAIL.

- [ ] **Step 2: Saf yardımcılar**

`web/src/lib/grafik.ts`:

```ts
/**
 * Grafik ekseni icin yuvarlak degerler (asagidan yukariya). Sunum hesabidir: sunucunun degerlerini
 * degistirmez, yalnizca ekseni cizmek icin 1 / 2 / 2,5 / 5 x 10^n adimlarindan uygun olani secer.
 */
export function eksenDegerleri(enKucuk: number, enBuyuk: number, adimSayisi = 4): number[] {
  const hamAdim =
    enBuyuk > enKucuk ? (enBuyuk - enKucuk) / adimSayisi : Math.max(Math.abs(enBuyuk), 1) / adimSayisi;
  const us = 10 ** Math.floor(Math.log10(hamAdim));
  const adim = [1, 2, 2.5, 5, 10].map((carpan) => carpan * us).find((aday) => aday >= hamAdim) ?? 10 * us;
  const alt = Math.floor(enKucuk / adim) * adim;
  const hamUst = Math.ceil(enBuyuk / adim) * adim;
  const ust = hamUst === alt ? alt + adim : hamUst;

  const degerler: number[] = [];
  // Kayan nokta birikimi son degeri kacirmasin diye ust sinir kucuk bir payla karsilastirilir.
  for (let sira = 0; alt + sira * adim <= ust + adim / 1000; sira += 1) {
    degerler.push(Number((alt + sira * adim).toFixed(6)));
  }
  return degerler;
}
```

`web/src/lib/format.ts` — `formatWeight`'in ALTINA:

```ts
/** "YYYY-MM-DD": TR bugununden `gun` gun onceki TR gunu (API'nin DateOnly `From` parametresi icin). */
export function trBugundenOnce(gun: number, simdi: Date = new Date()): string {
  const { gun: ayinGunu, ay, yil } = tarihParcalariniAl(
    new Date(simdi.getTime() - gun * 86_400_000).toISOString(),
  );
  return `${yil}-${ay}-${ayinGunu}`;
}

/** Grafik araligi metni: "25 Ağu – 10 Eyl 2026" (yil, son tarihin TR yili). */
export function formatAralik(ilkIso: string, sonIso: string): string {
  return `${formatKisaTarih(ilkIso)} – ${formatKisaTarih(sonIso)} ${tarihParcalariniAl(sonIso).yil}`;
}

/** Isaretli fark: "+2,5", "−32,5" (U+2212 eksi isareti), "0". */
export function formatFark(fark: number): string {
  if (fark === 0) {
    return '0';
  }
  return `${fark > 0 ? '+' : '−'}${formatWeight(Math.abs(fark))}`;
}
```

`web/src/lib/useGenislik.ts`:

```ts
import { useEffect, useState, type RefObject } from 'react';

/**
 * Bir elemanin gercek piksel genisligi. SVG koordinatlari pikselle hesaplanir: viewBox'u
 * `preserveAspectRatio="none"` ile esnetmek noktalari elipse, koseleri egriye cevirirdi (dilim 2
 * gorsel notu). `ResizeObserver` yoksa (jsdom) `varsayilan` doner.
 */
export function useGenislik(ref: RefObject<HTMLElement | null>, varsayilan: number): number {
  const [genislik, setGenislik] = useState(varsayilan);

  useEffect(() => {
    const eleman = ref.current;
    if (!eleman || typeof ResizeObserver === 'undefined') {
      return;
    }
    const gozlemci = new ResizeObserver(([kayit]) => {
      const olculen = Math.round(kayit.contentRect.width);
      if (olculen > 0) {
        setGenislik(olculen);
      }
    });
    gozlemci.observe(eleman);
    return () => gozlemci.disconnect();
  }, [ref]);

  return genislik;
}
```

Run: `cd web && npx vitest run src/lib` → PASS.

- [ ] **Step 3: `CizgiGrafik` testleri (kırmızı) ve bileşen**

`git rm web/src/ui/HacimGrafigi.tsx web/src/ui/HacimGrafigi.test.tsx`.

`web/src/ui/CizgiGrafik.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import CizgiGrafik from './CizgiGrafik';

const NOKTALAR = [
  { etiket: '25 Ağu', deger: 212.5 },
  { etiket: '1 Eyl', deger: 214 },
  { etiket: '10 Eyl', deger: 183 },
];

test('grafik erisilebilir adi tasir ve noktalari sirasiyla gizli listede birimle verir', () => {
  render(<CizgiGrafik noktalar={NOKTALAR} birim="kg" baslik="Bench Press ağırlık, 3 antrenman" />);

  expect(screen.getByRole('img', { name: 'Bench Press ağırlık, 3 antrenman' })).toBeInTheDocument();
  expect(screen.getAllByRole('listitem').map((madde) => madde.textContent)).toEqual([
    '25 Ağu: 212,5 kg',
    '1 Eyl: 214 kg',
    '10 Eyl: 183 kg',
  ]);
});

test('yalnizca ilk ve son noktanin degeri etiketlenir', () => {
  render(<CizgiGrafik noktalar={NOKTALAR} birim="kg" baslik="Grafik" />);

  expect(screen.getByText('212,5')).toBeInTheDocument();
  expect(screen.getByText('183')).toBeInTheDocument();
  expect(screen.queryByText('214')).not.toBeInTheDocument();
});

test('tek noktada cizgi cizilmez; nokta ve degeri gorunur', () => {
  const { container } = render(
    <CizgiGrafik noktalar={[{ etiket: '10 Eyl', deger: 65 }]} birim="kg" baslik="Tek" />,
  );

  expect(container.querySelectorAll('path')).toHaveLength(0);
  expect(container.querySelectorAll('circle')).toHaveLength(1);
  expect(screen.getByText('65')).toBeInTheDocument();
});

test('bos girdi hicbir sey render etmez', () => {
  const { container } = render(<CizgiGrafik noktalar={[]} birim="kg" baslik="Bos" />);

  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(container).toBeEmptyDOMElement();
});
```

Run: `cd web && npx vitest run src/ui/CizgiGrafik.test.tsx` → FAIL (modül yok).

`web/src/ui/CizgiGrafik.tsx`:

```tsx
import { useId, useRef } from 'react';
import { formatWeight } from '../lib/format';
import { eksenDegerleri } from '../lib/grafik';
import { useGenislik } from '../lib/useGenislik';

export interface CizgiNoktasi {
  etiket: string;
  deger: number;
}

interface Props {
  // Eskiden yeniye.
  noktalar: CizgiNoktasi[];
  // Gizli listede degerin yanina yazilir ("kg").
  birim: string;
  // SVG'nin erisilebilir adi.
  baslik: string;
}

const YUKSEKLIK = 220;
const UST_BOSLUK = 40;
const ALT_BOSLUK = 28;
const SOL_BOSLUK = 16;
const SAG_BOSLUK = 48;
const VARSAYILAN_GENISLIK = 320;
const ETIKET_YUKSEKLIGI = 22;

/**
 * Veri bilmeyen cizgi grafik (dilim 3 spec Karar 4): hareket, oturum ya da API bilmez. Cizgi, noktalar,
 * alan degradesi ve deger etiketleri `accent` (spec Karar 3 -- `text-accent` + `currentColor`); izgara
 * ve eksen metni notr. Ayni veri ekran okuyucuya gizli bir listeyle verilir. Bos girdide `null`.
 */
export default function CizgiGrafik({ noktalar, birim, baslik }: Props) {
  if (noktalar.length === 0) {
    return null;
  }
  // Olcum hook'u yalnizca veri varken monte edilen ic bilesende: bos durumdan veriye gecildiginde
  // ref'in bagli oldugu eleman yeniden olusur ve olcum yeniden baslar.
  return <Cizim noktalar={noktalar} birim={birim} baslik={baslik} />;
}

function Cizim({ noktalar, birim, baslik }: Props) {
  const kapRef = useRef<HTMLDivElement>(null);
  const genislik = useGenislik(kapRef, VARSAYILAN_GENISLIK);
  // useId ":" / "«" gibi karakterler uretebilir; url(#...) icinde guvenli olsun diye temizlenir.
  const degradeId = `degrade-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const degerler = noktalar.map((nokta) => nokta.deger);
  const eksen = eksenDegerleri(Math.min(...degerler), Math.max(...degerler));
  const altDeger = eksen[0];
  const ustDeger = eksen[eksen.length - 1];
  const cizimGenisligi = Math.max(genislik - SOL_BOSLUK - SAG_BOSLUK, 1);
  const cizimYuksekligi = YUKSEKLIK - UST_BOSLUK - ALT_BOSLUK;
  const tabanY = UST_BOSLUK + cizimYuksekligi;

  const xKonumu = (sira: number) =>
    SOL_BOSLUK + (noktalar.length === 1 ? cizimGenisligi / 2 : (sira * cizimGenisligi) / (noktalar.length - 1));
  const yKonumu = (deger: number) =>
    UST_BOSLUK + cizimYuksekligi - ((deger - altDeger) / (ustDeger - altDeger)) * cizimYuksekligi;

  const koordinatlar = noktalar.map((nokta, sira) => ({ x: xKonumu(sira), y: yKonumu(nokta.deger) }));
  const cizgi = koordinatlar.map((k, sira) => `${sira === 0 ? 'M' : 'L'}${k.x},${k.y}`).join(' ');
  const ilk = koordinatlar[0];
  const son = koordinatlar[koordinatlar.length - 1];
  const alan = `${cizgi} L${son.x},${tabanY} L${ilk.x},${tabanY} Z`;

  const etiketliSiralar = noktalar.length === 1 ? [0] : [0, noktalar.length - 1];
  const tarihSiralari = [...new Set([0, Math.floor((noktalar.length - 1) / 2), noktalar.length - 1])];

  return (
    <div ref={kapRef} className="w-full">
      <svg role="img" aria-label={baslik} width={genislik} height={YUKSEKLIK} className="block text-accent">
        <defs>
          <linearGradient id={degradeId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.45} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        <g aria-hidden>
          {eksen.map((deger) => (
            <g key={deger}>
              <line
                x1={SOL_BOSLUK}
                x2={SOL_BOSLUK + cizimGenisligi}
                y1={yKonumu(deger)}
                y2={yKonumu(deger)}
                strokeWidth={1}
                className="stroke-surface-3"
              />
              <text
                x={genislik - 4}
                y={yKonumu(deger)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted text-label tabular-nums"
              >
                {formatWeight(deger)}
              </text>
            </g>
          ))}
          {tarihSiralari.map((sira) => (
            <text
              key={`tarih-${sira}`}
              x={xKonumu(sira)}
              y={YUKSEKLIK - 6}
              textAnchor="middle"
              className="fill-muted text-label"
            >
              {noktalar[sira].etiket}
            </text>
          ))}
          {noktalar.length > 1 && <path d={alan} fill={`url(#${degradeId})`} />}
          {noktalar.length > 1 && (
            <path d={cizgi} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" />
          )}
          {koordinatlar.map((k, sira) => (
            <circle
              key={`nokta-${sira}`}
              cx={k.x}
              cy={k.y}
              r={5}
              stroke="currentColor"
              strokeWidth={2.5}
              className="fill-bg"
            />
          ))}
          {etiketliSiralar.map((sira) => {
            const metin = formatWeight(noktalar[sira].deger);
            const etiketGenisligi = metin.length * 8 + 16;
            const merkezX = Math.min(
              Math.max(koordinatlar[sira].x, etiketGenisligi / 2),
              genislik - etiketGenisligi / 2,
            );
            const ustY = Math.max(koordinatlar[sira].y - ETIKET_YUKSEKLIGI - 10, 0);
            return (
              <g key={`etiket-${sira}`}>
                <rect
                  x={merkezX - etiketGenisligi / 2}
                  y={ustY}
                  width={etiketGenisligi}
                  height={ETIKET_YUKSEKLIGI}
                  rx={6}
                  className="fill-accent"
                />
                <text
                  x={merkezX}
                  y={ustY + ETIKET_YUKSEKLIGI / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-on-accent text-label tabular-nums"
                >
                  {metin}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <ul className="sr-only">
        {noktalar.map((nokta, sira) => (
          <li key={`${nokta.etiket}-${sira}`}>{`${nokta.etiket}: ${formatWeight(nokta.deger)} ${birim}`}</li>
        ))}
      </ul>
    </div>
  );
}
```

Run: `cd web && npx vitest run src/ui/CizgiGrafik.test.tsx` → 4 PASS.

- [ ] **Step 4: `queries.ts` — ilerleme sorgusu**

- Tip takma adlarına:

```ts
type ExerciseProgressResponse = components['schemas']['ExerciseProgressResponse'];
type ExerciseProgressPointResponse = components['schemas']['ExerciseProgressPointResponse'];
```

- `import { request } from './client';` altına `import { trBugundenOnce } from '../lib/format';`
- `queryKeys` içindeki `exerciseHistory` satırını SİL, yerine:

```ts
  // Onek: bir egzersizin TUM araliklarini tek seferde tazelemek icin (set eklenince).
  exerciseProgressAll: (exerciseId: number) => ['exerciseProgress', exerciseId] as const,
  exerciseProgress: (exerciseId: number, aralik: IlerlemeAraligi) =>
    [...queryKeys.exerciseProgressAll(exerciseId), aralik] as const,
```

- `useExerciseHistory` fonksiyonunu (yorumuyla) SİL, yerine:

```ts
export type IlerlemeAraligi = '1a' | '3a' | 'tum';

export interface IlerlemeNoktasi {
  sessionId: number;
  startedAt: string;
  topWeight: number;
  topWeightReps: number;
  volume: number;
  setCount: number;
  // Tahmin edilemeyen oturumda null (0 kg ya da 12'den fazla tekrar).
  estimatedOneRepMax: number | null;
}

/** `0` gecerli bir deger: kontroller `=== undefined` ile, `!` ile degil. */
function dogrulanmisIlerlemeNoktasi(yanit: ExerciseProgressPointResponse): IlerlemeNoktasi {
  if (
    yanit.sessionId === undefined ||
    !yanit.startedAt ||
    yanit.topWeight === undefined ||
    yanit.topWeightReps === undefined ||
    yanit.volume === undefined ||
    yanit.setCount === undefined ||
    yanit.estimatedOneRepMax === undefined
  ) {
    throw new Error('Sunucudan eksik ilerleme noktasi alindi.');
  }
  return {
    sessionId: yanit.sessionId,
    startedAt: yanit.startedAt,
    topWeight: yanit.topWeight,
    topWeightReps: yanit.topWeightReps,
    volume: yanit.volume,
    setCount: yanit.setCount,
    estimatedOneRepMax: yanit.estimatedOneRepMax,
  };
}

const ARALIK_GUNLERI: Record<IlerlemeAraligi, number | null> = { '1a': 30, '3a': 90, tum: null };

/**
 * Hareket ilerleme grafiginin verisi (dilim 3 spec Karar 2 ve 5), eskiden yeniye. En agir set, hacim
 * ve tahmini 1RM SUNUCUDAN gelir; istemci yalnizca araligin baslangic gununu (TR) hesaplar.
 */
export function useExerciseProgress(exerciseId: number, aralik: IlerlemeAraligi) {
  return useQuery({
    queryKey: queryKeys.exerciseProgress(exerciseId, aralik),
    queryFn: async (): Promise<IlerlemeNoktasi[]> => {
      const gun = ARALIK_GUNLERI[aralik];
      const sorgu = gun === null ? '' : `?From=${trBugundenOnce(gun)}`;
      const yanit = await request<ExerciseProgressResponse>(`/stats/exercises/${exerciseId}/progress${sorgu}`);
      return (yanit.points ?? []).map(dogrulanmisIlerlemeNoktasi);
    },
  });
}
```

- `useAddSet`'in `onSuccess`'indeki `exerciseHistory` satırını (ve üstündeki yorumu) şununla değiştir:

```ts
      // Grafigin bugunku noktasi guncellensin (dilim 3): eklenen setin hareketinin TUM araliklari.
      void queryClient.invalidateQueries({ queryKey: queryKeys.exerciseProgressAll(set.exerciseId) });
```

- [ ] **Step 5: `HareketGecmisi` testleri (kırmızı, dosyayı tamamen değiştir)**

`web/src/components/HareketGecmisi.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import HareketGecmisi from './HareketGecmisi';
import type { components } from '../api/schema';

type ExerciseProgressPointResponse = components['schemas']['ExerciseProgressPointResponse'];

function gecmisiOlustur() {
  const istemci = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={istemci}>
      <HareketGecmisi exerciseId={1} exerciseName="Bench Press" />
    </QueryClientProvider>,
  );
}

function nokta(
  sessionId: number,
  startedAt: string,
  topWeight: number,
  volume: number,
  estimatedOneRepMax: number | null,
): ExerciseProgressPointResponse {
  return {
    sessionId,
    startedAt,
    date: startedAt.slice(0, 10),
    topWeight,
    topWeightReps: 5,
    volume,
    setCount: 3,
    estimatedOneRepMax,
  };
}

// Sunucu sirasi: eskiden yeniye.
const NOKTALAR = [
  nokta(3, '2026-08-25T08:00:00Z', 60, 900, 67.5),
  nokta(5, '2026-09-01T08:00:00Z', 62.5, 1000, null),
  nokta(9, '2026-09-10T08:00:00Z', 57.5, 1100, 64.69),
];

function sunucuyuKur(points: ExerciseProgressPointResponse[]) {
  const aramalar: URL[] = [];
  server.use(
    http.get('/api/stats/exercises/:id/progress', ({ request, params }) => {
      aramalar.push(new URL(request.url));
      return HttpResponse.json({ exerciseId: Number(params.id), exerciseName: 'Bench Press', points });
    }),
  );
  return aramalar;
}

function maddeler() {
  return screen.getAllByRole('listitem').map((madde) => madde.textContent);
}

// Yalnizca Date sahtelenir: "1 Ay" araliginin baslangic gunu sabit olsun; MSW ve userEvent gercek
// zamanlayicilarla calismaya devam eder.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-14T09:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

test('varsayilan Agirlik sekmesi ve 1 Ay: From ile ister, en agir setleri cizer, Su anki ve Fark gosterir', async () => {
  const aramalar = sunucuyuKur(NOKTALAR);
  gecmisiOlustur();

  expect(await screen.findByRole('img', { name: 'Bench Press ağırlık, 3 antrenman' })).toBeInTheDocument();
  expect(aramalar[0].pathname).toBe('/api/stats/exercises/1/progress');
  expect(aramalar[0].searchParams.get('From')).toBe('2026-08-15');
  expect(screen.getByRole('tab', { name: 'Ağırlık' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('button', { name: '1 Ay' })).toHaveAttribute('aria-pressed', 'true');
  expect(maddeler()).toEqual(['25 Ağu: 60 kg', '1 Eyl: 62,5 kg', '10 Eyl: 57,5 kg']);
  expect(screen.getByText('Şu anki').parentElement).toHaveTextContent('57,5');
  expect(screen.getByText('Fark').parentElement).toHaveTextContent('−2,5');
  expect(screen.getByText('25 Ağu – 10 Eyl 2026')).toBeInTheDocument();
});

test('Antrenman ve Tahmini 1RM sekmeleri sunucu degerlerine gecer; 1RM olmayan nokta cizilmez', async () => {
  sunucuyuKur(NOKTALAR);
  const kullanici = userEvent.setup();
  gecmisiOlustur();

  await screen.findByRole('img', { name: 'Bench Press ağırlık, 3 antrenman' });
  await kullanici.click(screen.getByRole('tab', { name: 'Antrenman' }));

  expect(maddeler()).toEqual(['25 Ağu: 900 kg', '1 Eyl: 1.000 kg', '10 Eyl: 1.100 kg']);
  expect(screen.getByText('Fark').parentElement).toHaveTextContent('+200');

  await kullanici.click(screen.getByRole('tab', { name: 'Tahmini 1RM' }));

  expect(screen.getByRole('img', { name: 'Bench Press tahmini 1RM, 2 antrenman' })).toBeInTheDocument();
  expect(maddeler()).toEqual(['25 Ağu: 67,5 kg', '10 Eyl: 64,69 kg']);
});

test('Tum araliginda From gonderilmez; bos sonucta aralik ve ilk antrenman metinleri', async () => {
  const aramalar = sunucuyuKur([]);
  const kullanici = userEvent.setup();
  gecmisiOlustur();

  expect(await screen.findByText('Bu aralıkta kayıt yok')).toBeInTheDocument();

  await kullanici.click(screen.getByRole('button', { name: 'Tüm' }));

  expect(await screen.findByText('Bu hareketin ilk antrenmanı')).toBeInTheDocument();
  expect(aramalar.at(-1)?.searchParams.has('From')).toBe(false);
});

test('hicbir noktada tahmini 1RM yoksa aciklama metni gorunur', async () => {
  sunucuyuKur([nokta(3, '2026-09-10T08:00:00Z', 0, 0, null)]);
  const kullanici = userEvent.setup();
  gecmisiOlustur();

  await screen.findByRole('img', { name: 'Bench Press ağırlık, 1 antrenman' });
  await kullanici.click(screen.getByRole('tab', { name: 'Tahmini 1RM' }));

  expect(screen.getByText('Tahmini 1RM için 1–12 tekrarlı ve ağırlıklı set gerekir.')).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

test('istek basarisizsa hata duyurulur', async () => {
  server.use(
    http.get('/api/stats/exercises/:id/progress', () =>
      HttpResponse.json({ title: 'Sunucu hatası', status: 500 }, { status: 500 }),
    ),
  );
  gecmisiOlustur();

  expect(await screen.findByRole('alert')).toHaveTextContent('Geçmiş alınamadı.');
});
```

Run: `cd web && npx vitest run src/components/HareketGecmisi.test.tsx` → FAIL.

- [ ] **Step 6: `HareketGecmisi` (tamamen değiştir)**

`web/src/components/HareketGecmisi.tsx`:

```tsx
import { useState, type ReactNode } from 'react';
import { useExerciseProgress, type IlerlemeAraligi, type IlerlemeNoktasi } from '../api/queries';
import { formatAralik, formatFark, formatKisaTarih, formatWeight } from '../lib/format';
import CizgiGrafik from '../ui/CizgiGrafik';

type SekmeAnahtari = 'agirlik' | 'antrenman' | 'birTekrar';

interface Sekme {
  anahtar: SekmeAnahtari;
  etiket: string;
  // Grafigin erisilebilir adinda kullanilir ("Bench Press ağırlık, 3 antrenman").
  ozetAdi: string;
  deger: (nokta: IlerlemeNoktasi) => number | null;
}

const SEKMELER: Sekme[] = [
  { anahtar: 'agirlik', etiket: 'Ağırlık', ozetAdi: 'ağırlık', deger: (nokta) => nokta.topWeight },
  { anahtar: 'antrenman', etiket: 'Antrenman', ozetAdi: 'antrenman hacmi', deger: (nokta) => nokta.volume },
  {
    anahtar: 'birTekrar',
    etiket: 'Tahmini 1RM',
    ozetAdi: 'tahmini 1RM',
    deger: (nokta) => nokta.estimatedOneRepMax,
  },
];

const ARALIKLAR: { anahtar: IlerlemeAraligi; etiket: string }[] = [
  { anahtar: '1a', etiket: '1 Ay' },
  { anahtar: '3a', etiket: '3 Ay' },
  { anahtar: 'tum', etiket: 'Tüm' },
];

const DEGER_ETIKETI = 'text-label text-muted';
const DEGER = 'text-metric tabular-nums';

interface Props {
  exerciseId: number;
  exerciseName: string;
}

/**
 * Secili hareketin ilerleme grafigi (dilim 3 spec Karar 5): sekmeler (en agir set / hacim / tahmini
 * 1RM), "Şu anki" ve "Fark", turuncu cizgi grafik, aralik secimi. Degerler sunucudan gelir; "Fark"
 * yalnizca iki sunucu degerinin farkidir (sunum). Aktif sekmenin alt cizgisi `accent` (spec Karar 3);
 * aralik secici notr.
 */
export default function HareketGecmisi({ exerciseId, exerciseName }: Props) {
  const [sekmeAnahtari, setSekmeAnahtari] = useState<SekmeAnahtari>('agirlik');
  const [aralik, setAralik] = useState<IlerlemeAraligi>('1a');
  const { data: noktalar, isLoading, isError } = useExerciseProgress(exerciseId, aralik);
  const baslikId = `hareket-gecmisi-${exerciseId}`;
  const panelId = `hareket-grafigi-${exerciseId}`;
  const sekme = SEKMELER.find((aday) => aday.anahtar === sekmeAnahtari) ?? SEKMELER[0];

  let icerik: ReactNode;
  if (isLoading) {
    icerik = <p className="text-body text-muted">Yükleniyor...</p>;
  } else if (isError || !noktalar) {
    icerik = (
      <p role="alert" className="text-body text-danger">
        Geçmiş alınamadı.
      </p>
    );
  } else if (noktalar.length === 0) {
    icerik = (
      <p className="text-body text-muted">
        {aralik === 'tum' ? 'Bu hareketin ilk antrenmanı' : 'Bu aralıkta kayıt yok'}
      </p>
    );
  } else {
    const cizilecekler = noktalar.flatMap((nokta) => {
      const deger = sekme.deger(nokta);
      return deger === null ? [] : [{ nokta, deger }];
    });

    if (cizilecekler.length === 0) {
      icerik = <p className="text-body text-muted">Tahmini 1RM için 1–12 tekrarlı ve ağırlıklı set gerekir.</p>;
    } else {
      const ilk = cizilecekler[0];
      const son = cizilecekler[cizilecekler.length - 1];
      icerik = (
        <>
          <dl className="flex gap-8">
            <div className="flex flex-col gap-1">
              <dt className={DEGER_ETIKETI}>Şu anki</dt>
              <dd className={DEGER}>{formatWeight(son.deger)}</dd>
            </div>
            {cizilecekler.length > 1 && (
              <div className="flex flex-col gap-1">
                <dt className={DEGER_ETIKETI}>Fark</dt>
                <dd className={DEGER}>{formatFark(son.deger - ilk.deger)}</dd>
              </div>
            )}
          </dl>
          <p className="text-label text-muted">{formatAralik(ilk.nokta.startedAt, son.nokta.startedAt)}</p>
          <CizgiGrafik
            noktalar={cizilecekler.map(({ nokta, deger }) => ({ etiket: formatKisaTarih(nokta.startedAt), deger }))}
            birim="kg"
            baslik={`${exerciseName} ${sekme.ozetAdi}, ${cizilecekler.length} antrenman`}
          />
        </>
      );
    }
  }

  return (
    <section aria-labelledby={baslikId} className="flex flex-col gap-3 pt-2">
      <h3 id={baslikId} className="text-label text-muted uppercase">
        Geçmiş
      </h3>
      <div role="tablist" aria-label={`${exerciseName} grafiği`} className="flex border-b border-surface-3">
        {SEKMELER.map((aday) => {
          const secili = aday.anahtar === sekmeAnahtari;
          return (
            <button
              key={aday.anahtar}
              type="button"
              role="tab"
              aria-selected={secili}
              aria-controls={panelId}
              onClick={() => setSekmeAnahtari(aday.anahtar)}
              className={`min-h-11 flex-1 border-b-2 px-2 text-label ${
                secili ? 'border-accent text-fg' : 'border-transparent text-muted'
              }`}
            >
              {aday.etiket}
            </button>
          );
        })}
      </div>
      <div id={panelId} role="tabpanel" aria-label={sekme.etiket} className="flex flex-col gap-2">
        {icerik}
      </div>
      <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
        {ARALIKLAR.map((aday) => {
          const secili = aday.anahtar === aralik;
          return (
            <button
              key={aday.anahtar}
              type="button"
              aria-pressed={secili}
              onClick={() => setAralik(aday.anahtar)}
              className={`min-h-11 flex-1 rounded-md text-label ${secili ? 'bg-surface-4 text-fg' : 'text-muted'}`}
            >
              {aday.etiket}
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

Run: `cd web && npx vitest run src/components/HareketGecmisi.test.tsx` → 5 PASS.

- [ ] **Step 7: Tüketiciler ve `TodayPage.test.tsx`**

`web/src/components/HareketKartlari.tsx`: `Props`'tan ve imzadan `bugunkuOturumId`'yi kaldır;
`<HareketGecmisi … bugunkuOturumId={bugunkuOturumId} />` → yalnızca `exerciseId` ve `exerciseName`.

`web/src/pages/TodayPage.tsx`: `<HareketKartlari … bugunkuOturumId={gorunenOturum.id} />` ve
`<HareketGecmisi … bugunkuOturumId={gorunenOturum.id} />` satırlarındaki `bugunkuOturumId` prop'larını
kaldır.

`web/src/pages/TodayPage.test.tsx` (spec'in değiştirdiği veri kaynağı):
- `sahteSunucuyuKur` içinde `const gecmisAramalari: string[] = [];` → `const ilerlemeAramalari: string[] = [];`
- `http.get('/api/history', …)` handler'ını SİL, yerine:

```tsx
    http.get('/api/stats/exercises/:id/progress', ({ request, params }) => {
      ilerlemeAramalari.push(new URL(request.url).pathname);
      return HttpResponse.json({ exerciseId: Number(params.id), exerciseName: '', points: [] });
    }),
```

- dönüş nesnesinde `gecmisAramalari: () => gecmisAramalari,` → `ilerlemeAramalari: () => ilerlemeAramalari,`
- `sahteSunucuyuKur`'un doc yorumundaki "gecmis ucu" → "hareket ilerleme ucu".
- `sablonsuz oturumda secili hareketin gecmisi istenir ve set eklenince yeniden istenir` testinde
  `ortam.gecmisAramalari()` → `ortam.ilerlemeAramalari()` (üç yer) ve
  `expect(ortam.gecmisAramalari()[0]).toContain('ExerciseId=1');` →
  `expect(ortam.ilerlemeAramalari()[0]).toBe('/api/stats/exercises/1/progress');`

`grep -rn "exerciseHistory\|useExerciseHistory\|HacimGrafigi\|bugunkuOturumId" web/src` → çıktı yok.

- [ ] **Step 8: Doğrula**

Run: `cd web && npm run typecheck && npm run lint && npm run test && npm run build`
Expected: temiz; 20 dosya, **117** test PASS (109 + grafik 2 + format 3 + çizgi grafik 4−3 + hareket
geçmişi 5−3). Derlenen CSS'te `fill-accent`, `fill-on-accent`, `stroke-surface-3`, `border-accent`
sınıfları var: `grep -o 'fill-accent\|fill-on-accent\|stroke-surface-3\|border-accent' web/dist/assets/*.css | sort -u`.

- [ ] **Step 9: Commit**

```bash
git add -A web/src
git commit -m "feat(web): sekmeli turuncu cizgi grafik ve tahmini 1RM" -m "Refs #43" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Frontend — açılır set paneli

**Files:** yukarıdaki "Frontend panel (Görev 3)" listesi.

**Interfaces:**
- Consumes: mevcut `AddSetForm` (`egzersizId`, `onEgzersizSec`, iç `dinlenme` durumu ve
  `DinlenmeSayaci`), `ui/IkonDugmesi` (`etiket` + button props), `ui/BirincilDugme`, `TodayPage`'deki
  `secimYap` ve `secilebilirIdler`, `HareketKartlari.onSec`.
- Produces:
  - `BirincilDugme` props'una `ref?: Ref<HTMLButtonElement>` (React 19: ref normal prop olarak iletilir).
  - `AddSetForm` props: `{ egzersizId: number | null; onEgzersizSec: (exerciseId: number) => void; acik: boolean; onAcikDegis: (acik: boolean) => void }`.
  - Erişilebilir adlar: kapalıyken açma düğmesi `Set ekle` (`aria-expanded="false"`); açıkken form içinde
    `Paneli kapat` ikon düğmesi ve gönderme düğmesi `Set ekle`. İkisi aynı anda erişilebilirlik ağacında
    olmaz (açma düğmesi yalnızca kapalıyken render edilir, form kapalıyken `hidden`).

- [ ] **Step 1: `TodayPage.test.tsx` — paneli açan yardımcı ve yeni testler (kırmızı)**

`egzersizSecimineBekle` fonksiyonunun ALTINA:

```tsx
/**
 * Dilim 3: set paneli kapali baslar. Form alanlariyla etkilesen her akis once paneli acar; panel zaten
 * aciksa (orn. hareket kartina dokunulduysa) bir sey yapmaz.
 */
async function paneliAc(kullanici: ReturnType<typeof userEvent.setup>) {
  const acmaDugmesi = screen.queryByRole('button', { name: 'Set ekle', expanded: false });
  if (acmaDugmesi) {
    await kullanici.click(acmaDugmesi);
  }
}
```

`setEkle` fonksiyonunun İLK satırı: `await paneliAc(kullanici);`

`agirlik alani bos birakilirsa istek gonderilmez ve alan hatasi gosterilir` ve
`RIR sayi olmayan bir deger (abc) ile girilirse istemcide reddedilir, istek gonderilmez` testlerinde
`await egzersizSecimineBekle();` satırının hemen ALTINA `await paneliAc(kullanici);` ekle. Başka mevcut
teste dokunma.

Dosyada `describe('dinlenme sayaci', …)` bloğunun ÜSTÜNE:

```tsx
test('set paneli kapali baslar; Set ekle acar, Paneli kapat kapatir, yazilan deger korunur ve odak geri doner', async () => {
  sahteSunucuyuKur();
  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  await egzersizSecimineBekle();
  expect(screen.getByLabelText('Ağırlık (kg)')).not.toBeVisible();
  expect(screen.queryByRole('button', { name: 'Paneli kapat' })).not.toBeInTheDocument();

  await kullanici.click(screen.getByRole('button', { name: 'Set ekle', expanded: false }));

  expect(screen.getByLabelText('Ağırlık (kg)')).toBeVisible();
  expect(screen.getByLabelText('Ağırlık (kg)')).toHaveFocus();
  await kullanici.type(screen.getByLabelText('Ağırlık (kg)'), '60');

  await kullanici.click(screen.getByRole('button', { name: 'Paneli kapat' }));

  expect(screen.getByLabelText('Ağırlık (kg)')).not.toBeVisible();
  expect(screen.getByRole('button', { name: 'Set ekle', expanded: false })).toHaveFocus();

  await kullanici.click(screen.getByRole('button', { name: 'Set ekle', expanded: false }));
  expect(screen.getByLabelText('Ağırlık (kg)')).toHaveValue('60');
});

test('hareket kartina dokunmak hareketi secer ve set panelini acar', async () => {
  sahteSunucuyuKur({
    baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0), ilerleme(2, 'Squat', 3, 0)]),
  });
  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  await egzersizSecimineBekle();
  expect(screen.getByLabelText('Ağırlık (kg)')).not.toBeVisible();

  await kullanici.click(await screen.findByRole('button', { name: 'Squat, 0 / 3 set' }));

  expect(screen.getByLabelText('Ağırlık (kg)')).toBeVisible();
  expect(screen.getByLabelText('Egzersiz')).toHaveValue('2');
});

test('set eklendikten sonra panel acik kalir', async () => {
  sahteSunucuyuKur();
  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  await egzersizSecimineBekle();
  await setEkle(kullanici, '60', '8');

  expect(await screen.findByText('Eklendi: 60 kg × 8')).toBeInTheDocument();
  expect(screen.getByLabelText('Ağırlık (kg)')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Paneli kapat' })).toBeInTheDocument();
});
```

`describe('dinlenme sayaci', …)` bloğunun İÇİNE, son testin ALTINA:

```tsx
  test('dinlenme sayaci panel kapaliyken de gorunur', async () => {
    sahteSunucuyuKur();
    const kullanici = userEvent.setup();
    bugunSayfasiniOlustur();

    await egzersizSecimineBekle();
    await setEkle(kullanici, '60', '8');
    expect(await screen.findByText('1:30')).toBeInTheDocument();

    await kullanici.click(screen.getByRole('button', { name: 'Paneli kapat' }));

    expect(screen.getByText('1:30')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Atla' })).toBeInTheDocument();
  });
```

Run: `cd web && npx vitest run src/pages/TodayPage.test.tsx` → yeni 4 test FAIL (panel henüz hep açık).

- [ ] **Step 2: `BirincilDugme` ref alır**

`web/src/ui/BirincilDugme.tsx`: import'u `import type { ButtonHTMLAttributes, Ref } from 'react';` yap ve
`Props`'a ekle:

```tsx
  // React 19: ref normal bir prop olarak `...dugme` ile <button>'a iletilir (panel acma dugmesine odak).
  ref?: Ref<HTMLButtonElement>;
```

- [ ] **Step 3: `AddSetForm` — alt alanın tamamı**

`web/src/components/AddSetForm.tsx`:
- import'lar: `import { useEffect, useMemo, useRef, useState, type FormEvent, type Ref } from 'react';`,
  `import { Plus, X } from 'lucide-react';`, `import IkonDugmesi from '../ui/IkonDugmesi';`
- `BILINEN_ALANLAR` sabitinin ALTINA: `const PANEL_ID = 'set-paneli';`
- `Props`:

```tsx
interface Props {
  // Secim TodayPage'dedir (hareket kartlari ve panel ayni secimi paylasir, spec Karar 5). `null`:
  // egzersiz listesi henuz yuklenmedi.
  egzersizId: number | null;
  onEgzersizSec: (exerciseId: number) => void;
  // Panel acik mi -- TodayPage'de tutulur, cunku hareket karti dokunusu da acar (dilim 3 spec Karar 6).
  acik: boolean;
  onAcikDegis: (acik: boolean) => void;
}
```

- Bileşen yorumuna ekle: "Alt alanin tamami bu bilesendedir: dinlenme sayaci + kapaliyken 'Set ekle'
  dugmesi, acikken form. Bilesen hic unmount olmaz; panel kapaliyken form `hidden` ile gizlenir, boylece
  yazilanlar ve dinlenme sayaci korunur (dilim 3 spec Karar 6)."
- İmza: `export default function AddSetForm({ egzersizId, onEgzersizSec, acik, onAcikDegis }: Props) {`
- `const agirlikRef = useRef<HTMLInputElement>(null);` satırının ALTINA:

```tsx
  const acmaDugmesiRef = useRef<HTMLButtonElement>(null);

  // Odak yalnizca durum GERCEKTEN degistiginde tasinir (ilk render'da ve StrictMode'un cift efektinde
  // calinmaz): acilinca agirlik alanina, kapaninca "Set ekle" dugmesine.
  const oncekiAcik = useRef(acik);
  useEffect(() => {
    if (oncekiAcik.current === acik) {
      return;
    }
    oncekiAcik.current = acik;
    if (acik) {
      agirlikRef.current?.focus();
    } else {
      acmaDugmesiRef.current?.focus();
    }
  }, [acik]);
```

- `return (…)` bloğunun TAMAMI:

```tsx
  return (
    // Alt alan sekme cubugunun HEMEN ustunde sabit: 4rem = sekme cubugu yuksekligi (h-16).
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4 pb-2">
      <div className="mx-auto flex max-w-md flex-col gap-2 rounded-xl bg-surface-3 p-3 shadow-2xl">
        <DinlenmeSayaci dinlenme={dinlenme} onDegis={setDinlenme} />
        {!acik && (
          <BirincilDugme
            ref={acmaDugmesiRef}
            yukseklik="normal"
            aria-expanded={false}
            aria-controls={PANEL_ID}
            onClick={() => onAcikDegis(true)}
          >
            <Plus aria-hidden size={20} />
            Set ekle
          </BirincilDugme>
        )}
        <form id={PANEL_ID} hidden={!acik} onSubmit={gonder} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="pl-1 text-label text-muted uppercase">Yeni set</span>
            <IkonDugmesi etiket="Paneli kapat" onClick={() => onAcikDegis(false)}>
              <X aria-hidden size={20} />
            </IkonDugmesi>
          </div>
          {genelHata && <p role="alert" className="text-label text-danger">{genelHata}</p>}
          <div>
            <label htmlFor="set-egzersiz" className="sr-only">
              Egzersiz
            </label>
            <SecimKutusu
              id="set-egzersiz"
              value={egzersizId ?? ''}
              onChange={(e) => onEgzersizSec(Number(e.target.value))}
            >
              {siraliEgzersizler.map((eg) => (
                <option key={eg.id} value={eg.id}>
                  {eg.name}
                </option>
              ))}
            </SecimKutusu>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <SayiAlani
              id="set-agirlik"
              etiket="Ağırlık"
              ekranOkuyucuEki=" (kg)"
              birim="kg"
              inputMode="decimal"
              placeholder="0"
              value={agirlik}
              onChange={setAgirlik}
              hata={alanHatalari.weight}
              girdiRef={agirlikRef}
            />
            <SayiAlani
              id="set-tekrar"
              etiket="Tekrar"
              birim="tekrar"
              inputMode="numeric"
              placeholder="0"
              value={tekrar}
              onChange={setTekrar}
              hata={alanHatalari.reps}
            />
            <SayiAlani
              id="set-rir"
              etiket="RIR"
              ekranOkuyucuEki=" (opsiyonel)"
              birim="kalan"
              inputMode="numeric"
              placeholder="—"
              value={rir}
              onChange={setRir}
              hata={alanHatalari.rir}
            />
          </div>
          <p role="status" className="min-h-4 text-label text-muted">
            {sonEklenen}
          </p>
          <BirincilDugme type="submit" yukseklik="buyuk" disabled={eklemeMutasyonu.isPending}>
            <Plus aria-hidden size={24} />
            Set ekle
          </BirincilDugme>
        </form>
      </div>
    </div>
  );
```

- [ ] **Step 4: `TodayPage` — panel durumu**

`web/src/pages/TodayPage.tsx`:
- `const [baslatmaBilgisi, …]` satırının ALTINA:
  `const [panelAcik, setPanelAcik] = useState(false);`
- `secimYap` fonksiyonunu şununla değiştir (dönüş değeri eklenir, yorumu korunur) ve ALTINA `kartSec` ekle:

```tsx
  function secimYap(exerciseId: number): boolean {
    if (!secilebilirIdler.has(exerciseId)) {
      return false;
    }
    setSecim(exerciseId);
    return true;
  }

  // Dilim 3 spec Karar 6: hareket kartina dokunmak hareketi secer VE set panelini acar.
  function kartSec(exerciseId: number) {
    if (secimYap(exerciseId)) {
      setPanelAcik(true);
    }
  }
```

- Kök `div`'in sınıfı: `` className={`flex flex-col gap-5 pt-2 ${panelAcik ? 'pb-72' : 'pb-28'}`} `` ve
  bileşen yorumundaki "`pb-72` (18rem): sabit set ekle paneli…" cümlesini
  "Alt bosluk panel durumuna gore: acikken `pb-72` (panel ~240 px), kapaliyken `pb-28` (dinlenme satiri
  + 'Set ekle' dugmesi); son satir ortulmesin." yap.
- `<HareketKartlari … onSec={secimYap} />` → `onSec={kartSec}`.
- `<AddSetForm egzersizId={etkinSecim} onEgzersizSec={secimYap} />` →
  `<AddSetForm egzersizId={etkinSecim} onEgzersizSec={secimYap} acik={panelAcik} onAcikDegis={setPanelAcik} />`

- [ ] **Step 5: Doğrula**

Run: `cd web && npm run typecheck && npm run lint && npm run test && npm run build`
Expected: temiz; 20 dosya, **121** test PASS (117 + 4). Test çıktısında act() uyarısı yok.

- [ ] **Step 6: Commit**

```bash
git add web/src
git commit -m "feat(web): set paneli yalnizca gerektiginde acilir" -m "Refs #43" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4 (kontrolcü): Görsel doğrulama

Görev 1–3 incelemeleri temizlendikten SONRA, final incelemeden ÖNCE. Kod DEĞİŞTİRMEZ; sapmalar deftere
`Gorsel: <ekran> — <sapma> — <spec maddesi>` olarak yazılır.

- [ ] **Step 1:** API (`dotnet run --project src/Grind.Api`) ve web (`cd web && npm run dev`) arka planda;
  swagger ve 5173 200 dönmeli. Dilim 2'nin `gorsel_sablon` / `gorsel_bos` verisi yerel dev
  veritabanında duruyor; yoksa dilim 2 planının Görev 7 Step 2 betiğiyle yeniden oluştur.
- [ ] **Step 2:** Playwright (390×844) ile: şablonlu Bugün panel kapalı; bir hareket kartına dokunulmuş
  (panel açık); set eklenip panel kapatılmış (sayaç görünür); grafik Ağırlık / Antrenman / Tahmini 1RM
  sekmeleri ve "Tüm" aralığı; şablonsuz boş Bugün (yalnızca "Set ekle" çubuğu).
- [ ] **Step 3:** Denetle: `accent` yalnızca spec Karar 3'teki yerlerde (çizgi, noktalar, degrade, değer
  etiketi, aktif sekme alt çizgisi, birincil düğme); noktalar tam daire (esneme yok); değer etiketleri
  kırpılmıyor; eksen metinleri okunur; kapalı panel son kartı örtmüyor; "Şu anki"/"Fark" hizalı.

---

### Task 5 (kontrolcü): Dokümantasyon

Final tüm-branch incelemesi ve düzeltme dalgasından SONRA.

- [ ] **Step 1:** Test sayılarını komutla belirle (frontend özet satırı; backend `[Fact]` + `[InlineData]`).
- [ ] **Step 2:** `docs/superpowers/specs/2026-09-12-frontend-gorsel-tasarim-design.md` Karar 2 renk
  kurallarında `accent` listesine ekle: "hareket çizgi grafiğinin çizgisi, noktaları, alan degradesi ve
  değer etiketleri; grafik sekmelerinde aktif sekme alt çizgisi (dilim 3 spec Karar 3, kullanıcı kararı)".
- [ ] **Step 3:** `PLAN.md`: Durum Özeti'ne `| F4 | Frontend dilim 3: açılır panel, çizgi grafik, tahmini 1RM | ✅ |`;
  "Frontend Dilim 2" bölümünün altına "Frontend Dilim 3 ✅" bölümü (issue #43, spec/plan bağlantıları, ne
  yapıldı, kararlar, ayrı test sayıları, devreden notlar). Dilim 2 devreden notlarından kapananları
  (grafik çubuk genişliği/elips köşeler, "yalnızca bugünkü oturumda çubuk yok") işaretle.
- [ ] **Step 4:** `CLAUDE.md`: Kapsam'a "Frontend dilim 3 tamamlandı" satırı; özellik listesinin 5.
  maddesine tahmini 1RM (Brzycki, sorguda hesaplanır, saklanmaz) notu.
- [ ] **Step 5:** Dilim 3 spec'inin durumunu "✅ Uygulandı" yap. Commit:

```bash
git add PLAN.md CLAUDE.md docs/superpowers/specs
git commit -m "docs: frontend dilim 3 tamamlandi" -m "Refs #43" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Plan öz-incelemesi (yazım sırasında yapıldı)

- **Spec kapsamı:**

  | Spec maddesi | Görev |
  |---|---|
  | Karar 1 (Brzycki, tavan 12, null durumları, saklanmaz) | Görev 1 Step 1–2 |
  | Karar 2 (uç, IDOR, yanıt şekli, sıra, TR günü, en ağır set eşitliği, hacim tanımı, 1RM maksimumu, tek sorgu) | Görev 1 Step 3–6 |
  | Karar 3 (accent genişlemesi) | Görev 2 (`CizgiGrafik`, sekme alt çizgisi), Görev 5 Step 2 |
  | Karar 4 (veri bilmeyen çizgi grafik, gerçek genişlik, ilk/son etiket, tek nokta, boş) | Görev 2 Step 2–3 |
  | Karar 5 (sekmeler, aralık, Şu anki/Fark, boş durumlar, "Geçen sefer" kalkar, yerleşim) | Görev 2 Step 4–7 |
  | Karar 6 (kapalı başlama, kartla açma, kapatma, açık kalma, `hidden`, odak, sayaç görünür, boşluk) | Görev 3 |
  | Karar 7 (sorgu anahtarları, daraltma, tipler) | Görev 1 Step 8, Görev 2 Step 4 |
  | Görsel doğrulama | Görev 4 |

- **Adlar görevler boyunca aynı:** `OneRepMaxEstimator.Estimate`, `GetForExerciseInRangeAsync`,
  `IExerciseProgressService.GetAsync`, `ExerciseProgressResponse`/`ExerciseProgressPointResponse`
  (`sessionId`, `startedAt`, `date`, `topWeight`, `topWeightReps`, `volume`, `setCount`,
  `estimatedOneRepMax`), `eksenDegerleri`, `useGenislik`, `trBugundenOnce`, `formatAralik`,
  `formatFark`, `CizgiGrafik`, `IlerlemeAraligi`, `IlerlemeNoktasi`, `useExerciseProgress`,
  `queryKeys.exerciseProgressAll/exerciseProgress`, `AddSetForm` `acik/onAcikDegis`, `kartSec`,
  `paneliAc`.
- **Test sayısı:** backend 651 → Görev 1: **671**. Frontend 109 (19 dosya) → Görev 2: 117 (20) →
  Görev 3: **121** (20).
- **Dosya çakışması (sıralı):** `TodayPage.tsx` ve `TodayPage.test.tsx` Görev 2 (prop kaldırma, ilerleme
  ucu handler'ı) ve Görev 3 (panel); `queries.ts` yalnızca Görev 2; `schema.d.ts` yalnızca Görev 1.
- **Doğrulanmış varsayımlar:** `LocalDayRange.Resolve` ters aralıkta `ValidationException` fırlatır;
  geçmiş servisinin nötr metni "Egzersiz bulunamadı."; `AppDbContext.Exercises` DbSet'i var; global
  egzersiz Id 1 seed'dir; `StatsService` kurucusu Export ve AiInsight testlerinde de kullanılıyor (bu
  yüzden ayrı servis); Tailwind v4 preflight `[hidden]`'ı gizler; jsdom'da `ResizeObserver` yok.
- **Bilinen riskler:**
  1. `tr-TR` kısa ay adı "Ağu" Node ICU sürümüne göre farklı çıkarsa format ve grafik testlerinin
     beklenen metni gerçek çıktıya göre güncellenir (davranış değil biçim) ve raporlanır.
  2. `useId` karakter temizliği sonrası iki grafiğin aynı sayfada çakışma ihtimali yok (her useId
     benzersiz rakam taşır).
  3. Panel açıkken mobil klavyenin açılması (odak ağırlık alanına) gerçek cihazda denenmeli.
