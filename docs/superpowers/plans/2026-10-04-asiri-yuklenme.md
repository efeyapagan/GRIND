# Aşırı Yüklenme Sinyali — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Performans düşüşü ve efor artışı birlikte görülünce İlerleme sekmesinin üstünde deload öneren bir kart; aynı sinyal export metniyle GRINDY'ye gider.

**Architecture:** Saf `OverreachingDetector` (plato deseni) son 14 günü önceki 28 günle karşılaştırır. `StatsService` tek projeksiyon sorgusuyla setleri okuyup `GET /api/stats/overreaching`'te döner; `ExportService` aynı sonucu `ExportResponse.Overreaching`'e koyar, biçimlendirici bölüm yazar. Mobilde kendi verisini çeken `AsiriYuklenmeKarti` sinyal yoksa hiç çizilmez.

**Tech Stack:** ASP.NET Core 10 + EF Core (Npgsql), xUnit; React Native + Expo Router, TanStack Query, i18next, jest-expo; `packages/shared` vitest.

**Spec:** `docs/superpowers/specs/2026-10-04-asiri-yuklenme-design.md`

## Global Constraints

- Web'e dokunulmaz (#326). Yalnızca `src/`, `tests/`, `packages/shared`, `mobile/`, `docs/`, `CLAUDE.md`.
- Yeni tablo, migration ve saklama yok; sinyal sorgu anında hesaplanır.
- Pencereler TR günüyle: son dönem bugün dahil 14 gün, önceki dönem ondan önceki 28 gün; set, oturumunun `StartedAt`'inin TR gününe aittir (`TurkeyDay.LocalDateOf`).
- Eşikler sabit: düşüş ≥ %5 (yuvarlanmamış oranla karşılaştırılır), ≥ 2 hareket, RIR farkı ≥ 1 ve her dönemde ≥ 2 RIR'lı set, ≥ 2 zorluğu işaretli bitmiş oturum ve en az yarısı `Hard`/`Maximal`. RIR 5'e çekilir.
- Performans yalnızca `ExerciseMeasurement.WeightReps` hareketlerde, `OneRepMaxEstimator` ile.
- Yalnızca `currentUserId`.
- Mobil metinler tr + en kataloglarında aynı commit'te; `t(...)` ile; sayılar `formatWeight` ile.
- API tipleri elle yazılmaz: çalışan API'nin Swagger'ından, repo dışındaki bir klasörden `npm exec --yes --package=openapi-typescript@7.13.0 -- openapi-typescript http://localhost:5098/swagger/v1/swagger.json -o <repo>/packages/shared/src/api/schema.d.ts`.
- Testler `grind_test` veritabanını kullanır (CONTRIBUTING #459). Bu makinede komutlar Docker'da (`grind-346-sdk`/`grind-346-db`/`grind-346-node`) koşar; mobil suite `--maxWorkers=2`.
- Commit mesajları: kısa Türkçe (ASCII) başlık, `Refs #176`, son satır oturumun `Co-Authored-By` trailer'ı; `git commit -F <dosya>`.

## Review Focus

- Gece yarısını UTC'de aşan oturum (TR 00:30) → UTC tarihine değil TR gününe göre son döneme düşer (Task 1 testi).
- Düşüş tam %5 sınırında ve hemen altında (%4,9) → yalnızca ≥ %5 sayılır (Task 1 testi).
- Yalnızca son dönemde çalışılan ya da ağırlıksız/süreli hareket → değerlendirmeye girmez, sinyali tek başına yakmaz (Task 1 testi).
- RIR'ı tek sete girilmiş dönem → RIR kuralı atlanır, kart RIR satırı çizmez (Task 1 ve Task 5 testleri).
- Sinyal yokken export metni → bölüm hiç yazılmaz, mevcut tam çıktı testi birebir aynı kalır (Task 3 testi).

---

### Task 1: Saf hesaplayıcı ve DTO'lar

**Files:**
- Create: `src/Grind.Api/Models/Projections/OverreachingSetRow.cs`
- Create: `src/Grind.Api/Models/Dtos/Stats/OverreachingResponse.cs`
- Create: `src/Grind.Api/Common/Records/OverreachingDetector.cs`
- Test: `tests/Grind.Tests/Common/OverreachingDetectorTests.cs`

**Interfaces:**
- Produces:
  - `record OverreachingSetRow(long SessionId, DateTime SessionStartedAt, bool SessionEnded, SessionDifficulty? Difficulty, long ExerciseId, string ExerciseName, ExerciseMeasurement Measurement, decimal Weight, int? Reps, decimal? Rir)` (namespace `Grind.Api.Models.Projections`)
  - `record ExerciseDropResponse(long ExerciseId, string ExerciseName, decimal PreviousBest, decimal RecentBest, decimal DropPercent)`, `record OverreachingSignalResponse(IReadOnlyList<ExerciseDropResponse> Drops, decimal? RirBefore, decimal? RirRecent, int HardSessions, int RatedSessions)`, `record OverreachingResponse(OverreachingSignalResponse? Signal)` (namespace `Grind.Api.Models.Dtos.Stats`)
  - `static OverreachingSignalResponse? OverreachingDetector.Detect(IEnumerable<OverreachingSetRow> rows, DateOnly today)`, `static DateOnly OverreachingDetector.WindowStart(DateOnly today)` (namespace `Grind.Api.Common.Records`)

- [ ] **Step 1: Write the failing test** — `tests/Grind.Tests/Common/OverreachingDetectorTests.cs`:

```csharp
using Grind.Api.Common.Records;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;

namespace Grind.Tests.Common;

/// <summary>
/// #176: aşırı yüklenme sinyali = en az iki harekette tahmini 1RM ≥ %5 düşüşü VE efor artışı (RIR ≥ 1 düştü ya
/// da son dönemdeki oturumların en az yarısı Zor/Maksimal). DB'siz, saf.
/// Bugün 2026-03-12: son dönem 2026-02-27..03-12, önceki dönem 2026-01-30..02-26.
/// </summary>
public class OverreachingDetectorTests
{
    private static readonly DateOnly Bugun = new(2026, 3, 12);
    private static long _oturum = 1;

    /// <summary>TR günü 18:00 (UTC 15:00) — gün sınırından uzak.</summary>
    private static DateTime Gun(int ay, int gun) => new(2026, ay, gun, 15, 0, 0, DateTimeKind.Utc);

    private static OverreachingSetRow Set(
        long exerciseId, DateTime startedAtUtc, decimal weight, int reps = 5, decimal? rir = null,
        SessionDifficulty? zorluk = null, ExerciseMeasurement olcum = ExerciseMeasurement.WeightReps) =>
        new(_oturum++, startedAtUtc, true, zorluk, exerciseId, $"Hareket {exerciseId}", olcum, weight, reps, rir);

    /// <summary>A ve B: önceki 100 kg × 5, son dönem 95 kg × 5 → tam %5 düşüş. RIR 3 → 2.</summary>
    private static List<OverreachingSetRow> IkiHareketDusuyor(decimal sonAgirlikB = 95m) =>
    [
        Set(1, Gun(2, 10), 100m, rir: 3), Set(1, Gun(3, 5), 95m, rir: 2),
        Set(2, Gun(2, 12), 100m, rir: 3), Set(2, Gun(3, 6), sonAgirlikB, rir: 2),
    ];

    [Fact]
    public void Iki_harekette_dusus_ve_rir_dususu_sinyal_verir()
    {
        var sinyal = OverreachingDetector.Detect(IkiHareketDusuyor(), Bugun);

        Assert.NotNull(sinyal);
        Assert.Equal([1L, 2L], sinyal.Drops.Select(d => d.ExerciseId).Order());
        Assert.All(sinyal.Drops, d => Assert.Equal(5.0m, d.DropPercent));
        Assert.Equal(3m, sinyal.RirBefore);
        Assert.Equal(2m, sinyal.RirRecent);
    }

    [Fact]
    public void Tek_harekette_dusus_sinyal_vermez()
    {
        var setler = IkiHareketDusuyor().Where(s => s.ExerciseId == 1).ToList();

        Assert.Null(OverreachingDetector.Detect(setler, Bugun));
    }

    /// <summary>%4,9 düşüş sayılmaz: B 95,1 kg'a indiğinde düşen tek hareket A kalır.</summary>
    [Fact]
    public void Yuzde_bes_altindaki_dusus_sayilmaz()
    {
        Assert.Null(OverreachingDetector.Detect(IkiHareketDusuyor(sonAgirlikB: 95.1m), Bugun));
    }

    /// <summary>"Daha az kaldırıyorum" tek başına yetmez: RIR de zorluk da girilmemişse sinyal yok.</summary>
    [Fact]
    public void Efor_verisi_yoksa_sinyal_yok()
    {
        var setler = IkiHareketDusuyor().Select(s => s with { Rir = null }).ToList();

        Assert.Null(OverreachingDetector.Detect(setler, Bugun));
    }

    /// <summary>Zorluk kuralı: son dönemde işaretli 2 oturumun 1'i Zor → yarısı → sinyal (RIR yok).</summary>
    [Fact]
    public void Son_donemde_oturumlarin_yarisi_zorsa_sinyal_verir()
    {
        var setler = IkiHareketDusuyor().Select(s => s with { Rir = null }).ToList();
        setler[1] = setler[1] with { Difficulty = SessionDifficulty.Hard };
        setler[3] = setler[3] with { Difficulty = SessionDifficulty.Easy };

        var sinyal = OverreachingDetector.Detect(setler, Bugun);

        Assert.NotNull(sinyal);
        Assert.Equal(1, sinyal.HardSessions);
        Assert.Equal(2, sinyal.RatedSessions);
        Assert.Null(sinyal.RirBefore);
    }

    /// <summary>RIR yalnızca birer sete girildiyse RIR kuralı değerlendirilmez (her dönemde en az 2 set).</summary>
    [Fact]
    public void Rir_iki_setten_azsa_degerlendirilmez()
    {
        var setler = IkiHareketDusuyor();
        setler[2] = setler[2] with { Rir = null };
        setler[3] = setler[3] with { Rir = null };

        Assert.Null(OverreachingDetector.Detect(setler, Bugun));
    }

    /// <summary>Yalnızca son dönemde çalışılan ya da ağırlıksız hareket düşüş sayılmaz.</summary>
    [Fact]
    public void Tek_donemde_calisilan_ve_agirliksiz_hareket_degerlendirilmez()
    {
        List<OverreachingSetRow> setler =
        [
            .. IkiHareketDusuyor().Where(s => s.ExerciseId == 1),
            Set(3, Gun(3, 7), 60m, rir: 1),
            Set(4, Gun(2, 10), 0m, reps: 30, rir: 3, olcum: ExerciseMeasurement.Reps),
            Set(4, Gun(3, 7), 0m, reps: 10, rir: 1, olcum: ExerciseMeasurement.Reps),
        ];

        Assert.Null(OverreachingDetector.Detect(setler, Bugun));
    }

    /// <summary>
    /// TR 27 Şubat 00:30'da başlayan oturum (UTC 26 Şubat 21:30) son dönemdedir. B'nin "önceki" seti aslında
    /// son dönemde olduğu için B iki dönemde çalışılmış sayılmaz → yalnızca A düşer → sinyal yok. UTC tarihi
    /// kullanılsaydı B önceki dönemde sayılır ve sinyal yanardı.
    /// </summary>
    [Fact]
    public void Gece_yarisini_asan_oturum_TR_gunune_gore_doneme_duser()
    {
        var setler = IkiHareketDusuyor();
        setler[2] = setler[2] with { SessionStartedAt = new DateTime(2026, 2, 26, 21, 30, 0, DateTimeKind.Utc) };

        Assert.Null(OverreachingDetector.Detect(setler, Bugun));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/Grind.Tests --filter FullyQualifiedName~OverreachingDetectorTests`
Expected: derleme hatası — `OverreachingSetRow`, `OverreachingDetector` tanımlı değil.

- [ ] **Step 3: Write minimal implementation**

`src/Grind.Api/Models/Projections/OverreachingSetRow.cs`:

```csharp
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Projections;

/// <summary>
/// #176: aşırı yüklenme analizi için bir set — oturumun başlangıcı (dönemi o belirler), bitip bitmediği ve
/// zorluğu, hareketin adı ve ölçüm tipi, kilo/tekrar/RIR. Repository'nin okuma modeli.
/// </summary>
public record OverreachingSetRow(
    long SessionId, DateTime SessionStartedAt, bool SessionEnded, SessionDifficulty? Difficulty,
    long ExerciseId, string ExerciseName, ExerciseMeasurement Measurement,
    decimal Weight, int? Reps, decimal? Rir);
```

`src/Grind.Api/Models/Dtos/Stats/OverreachingResponse.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Stats;

/// <summary>#176: bir hareketin düşüşü — önceki ve son dönemdeki en iyi tahmini 1RM, yüzde (7.3 = %7,3).</summary>
public record ExerciseDropResponse(
    long ExerciseId, string ExerciseName, decimal PreviousBest, decimal RecentBest, decimal DropPercent);

/// <summary>
/// #176: yanan sinyal. <paramref name="Drops"/> düşüşü büyükten küçüğe. RIR ortalamaları yalnızca RIR kuralı
/// değerlendirilebildiyse (iki dönemde de ≥ 2 RIR'lı set) dolu. Zorluk sayıları son dönemin bitmiş oturumları.
/// </summary>
public record OverreachingSignalResponse(
    IReadOnlyList<ExerciseDropResponse> Drops,
    decimal? RirBefore,
    decimal? RirRecent,
    int HardSessions,
    int RatedSessions);

/// <summary>#176: <c>GET /api/stats/overreaching</c>; sinyal yoksa <c>Signal</c> null.</summary>
public record OverreachingResponse(OverreachingSignalResponse? Signal);
```

`src/Grind.Api/Common/Records/OverreachingDetector.cs`:

```csharp
using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;

namespace Grind.Api.Common.Records;

/// <summary>
/// Aşırı yüklenme (overreaching) tespitinin TEK karar noktası (#176). Saf ve durumsuz —
/// <see cref="PlateauDetector"/> deseni; sonuç SAKLANMAZ. Sinyal = "daha az kaldırıyorum ama daha çok
/// zorlanıyorum": en az <see cref="MinDroppingExercises"/> harekette tahmini 1RM'in son dönemdeki en iyisi
/// önceki dönemin en iyisinden ≥ %<see cref="DropThresholdPercent"/> düşük VE efor arttı (RIR düştü ya da
/// oturumlar Zor/Maksimal). Efor verisi hiç girilmemişse sinyal yanmaz: yalnızca performans düşüşü bilinçli
/// deload, hastalık ya da tatil sonrasında da görülür.
/// </summary>
public static class OverreachingDetector
{
    public const int RecentDays = 14;
    public const int PreviousDays = 28;
    public const decimal DropThresholdPercent = 5m;
    public const int MinDroppingExercises = 2;
    public const decimal MinRirDrop = 1m;
    public const int MinRirSets = 2;
    public const int MinRatedSessions = 2;

    /// <summary>Kaydırıcının "4+" durağı 5 saklanır; #266 öncesi büyük eski değerler de 5 sayılır.</summary>
    private const decimal MaxRir = 5m;

    /// <summary>Önceki dönemin ilk TR günü — repository bu günden itibaren okur.</summary>
    public static DateOnly WindowStart(DateOnly today) => today.AddDays(-(RecentDays + PreviousDays - 1));

    public static OverreachingSignalResponse? Detect(IEnumerable<OverreachingSetRow> rows, DateOnly today)
    {
        var recentStart = today.AddDays(-(RecentDays - 1));
        var windowStart = WindowStart(today);

        var dated = rows
            .Select(r => (Row: r, Day: TurkeyDay.LocalDateOf(r.SessionStartedAt)))
            .Where(x => x.Day >= windowStart && x.Day <= today)
            .Select(x => (x.Row, Recent: x.Day >= recentStart))
            .ToList();

        var drops = Drops(dated);
        if (drops.Count < MinDroppingExercises)
        {
            return null;
        }

        var (rirBefore, rirRecent) = RirAverages(dated);
        var rirRose = rirBefore is { } before && rirRecent is { } recent && before - recent >= MinRirDrop;

        var rated = dated
            .Where(x => x.Recent && x.Row.SessionEnded && x.Row.Difficulty is not null)
            .GroupBy(x => x.Row.SessionId)
            .Select(g => g.First().Row.Difficulty!.Value)
            .ToList();
        var hard = rated.Count(d => d is SessionDifficulty.Hard or SessionDifficulty.Maximal);
        var difficultyRose = rated.Count >= MinRatedSessions && hard * 2 >= rated.Count;

        if (!rirRose && !difficultyRose)
        {
            return null;
        }

        return new OverreachingSignalResponse(
            drops,
            rirBefore is null ? null : decimal.Round(rirBefore.Value, 1, MidpointRounding.AwayFromZero),
            rirRecent is null ? null : decimal.Round(rirRecent.Value, 1, MidpointRounding.AwayFromZero),
            hard,
            rated.Count);
    }

    private static List<ExerciseDropResponse> Drops(List<(OverreachingSetRow Row, bool Recent)> dated) =>
        dated
            .Where(x => x.Row.Measurement == ExerciseMeasurement.WeightReps && x.Row.Reps is not null)
            .Select(x => (x.Row, x.Recent, OneRepMax: OneRepMaxEstimator.Estimate(x.Row.Weight, x.Row.Reps!.Value)))
            .Where(x => x.OneRepMax is not null)
            .GroupBy(x => x.Row.ExerciseId)
            .Select(g =>
            {
                var previous = g.Where(x => !x.Recent).Select(x => x.OneRepMax!.Value).ToList();
                var recent = g.Where(x => x.Recent).Select(x => x.OneRepMax!.Value).ToList();
                if (previous.Count == 0 || recent.Count == 0)
                {
                    return null;
                }

                var previousBest = previous.Max();
                var recentBest = recent.Max();
                // Eşik YUVARLANMAMIŞ oranla karşılaştırılır: %4,95 "%5,0" yazılsa da düşüş sayılmaz.
                var drop = (previousBest - recentBest) / previousBest * 100m;
                return drop >= DropThresholdPercent
                    ? new ExerciseDropResponse(g.Key, g.First().Row.ExerciseName, previousBest, recentBest,
                        decimal.Round(drop, 1, MidpointRounding.AwayFromZero))
                    : null;
            })
            .OfType<ExerciseDropResponse>()
            .OrderByDescending(d => d.DropPercent)
            .ThenBy(d => d.ExerciseName)
            .ToList();

    private static (decimal? Before, decimal? Recent) RirAverages(List<(OverreachingSetRow Row, bool Recent)> dated)
    {
        var before = dated.Where(x => !x.Recent && x.Row.Rir is not null)
            .Select(x => Math.Min(x.Row.Rir!.Value, MaxRir)).ToList();
        var recent = dated.Where(x => x.Recent && x.Row.Rir is not null)
            .Select(x => Math.Min(x.Row.Rir!.Value, MaxRir)).ToList();

        return before.Count >= MinRirSets && recent.Count >= MinRirSets
            ? (before.Average(), recent.Average())
            : (null, null);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `dotnet test tests/Grind.Tests --filter FullyQualifiedName~OverreachingDetectorTests`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add src/Grind.Api/Models/Projections/OverreachingSetRow.cs src/Grind.Api/Models/Dtos/Stats/OverreachingResponse.cs \
  src/Grind.Api/Common/Records/OverreachingDetector.cs tests/Grind.Tests/Common/OverreachingDetectorTests.cs
git commit -F <mesaj: "feat: asiri yuklenme hesaplayicisi (#176)">
```

---

### Task 2: `GET /api/stats/overreaching` ucu

**Files:**
- Modify: `src/Grind.Api/Repositories/ISetEntryRepository.cs`, `src/Grind.Api/Repositories/SetEntryRepository.cs`
- Modify: `src/Grind.Api/Services/IStatsService.cs`, `src/Grind.Api/Services/StatsService.cs`
- Modify: `src/Grind.Api/Controllers/StatsController.cs`
- Test: `tests/Grind.Tests/Services/StatsServiceTests.cs`

**Interfaces:**
- Consumes: Task 1 `OverreachingSetRow`, `OverreachingResponse`, `OverreachingDetector.Detect/WindowStart`.
- Produces: `Task<IReadOnlyList<OverreachingSetRow>> ISetEntryRepository.GetOverreachingRowsAsync(long userId, DateTime fromUtcInclusive, CancellationToken cancellationToken = default)`; `Task<OverreachingResponse> IStatsService.GetOverreachingAsync(CancellationToken cancellationToken = default)`; HTTP `GET /api/stats/overreaching` → `{ "signal": null | { drops: [{ exerciseId, exerciseName, previousBest, recentBest, dropPercent }], rirBefore, rirRecent, hardSessions, ratedSessions } }`.

- [ ] **Step 1: Write the failing test** — `StatsServiceTests.cs` sonuna (sınıfın kapanış `}`'inden önce):

```csharp
    // ---- Aşırı yüklenme (#176) ----

    /// <summary>İki harekette ~%5 düşüş + RIR 3 → 2 üreten setler (Bugun = 2026-03-12).</summary>
    private static void AsiriYuklenmeSeed(AppDbContext context, User user, Exercise a, Exercise b)
    {
        foreach (var (exercise, gun, weight, rir) in new[]
                 {
                     (a, 10, 100m, 3m), (b, 12, 100m, 3m),
                 })
        {
            var oturum = Seed(context, user, exercise, new DateTime(2026, 2, gun, 15, 0, 0, DateTimeKind.Utc), (weight, 5));
            oturum.EndedAt = oturum.StartedAt.AddHours(1);
        }

        foreach (var (exercise, gun) in new[] { (a, 5), (b, 6) })
        {
            var oturum = Seed(context, user, exercise, new DateTime(2026, 3, gun, 15, 0, 0, DateTimeKind.Utc), (95m, 5));
            oturum.EndedAt = oturum.StartedAt.AddHours(1);
        }

        foreach (var set in context.ChangeTracker.Entries<SetEntry>().Select(e => e.Entity)
                     .Where(s => s.WorkoutSession.User == user))
        {
            set.Rir = set.WorkoutSession.StartedAt.Month == 2 ? 3m : 2m;
        }
    }

    [Fact]
    public async Task Asiri_yuklenme_sinyali_yalnizca_kendi_setlerinden_hesaplanir()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var ikinci = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            var baskasi = TestDatabase.NewUser();
            context.AddRange(ikinci, baskasi);
            AsiriYuklenmeSeed(context, baskasi, exercise, ikinci);
            await context.SaveChangesAsync();

            Assert.Null((await service.GetOverreachingAsync()).Signal);

            AsiriYuklenmeSeed(context, user, exercise, ikinci);
            await context.SaveChangesAsync();

            var sinyal = (await service.GetOverreachingAsync()).Signal;
            Assert.NotNull(sinyal);
            Assert.Equal(2, sinyal.Drops.Count);
            Assert.Equal(3m, sinyal.RirBefore);
            Assert.Equal(2m, sinyal.RirRecent);
        }
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/Grind.Tests --filter FullyQualifiedName~StatsServiceTests.Asiri`
Expected: derleme hatası — `GetOverreachingAsync` tanımlı değil.

- [ ] **Step 3: Write minimal implementation**

`ISetEntryRepository.cs`, `GetWeeklySetRowsAsync`'in altına:

```csharp
    /// <summary>
    /// #176: kullanıcının <paramref name="fromUtcInclusive"/>'ten itibaren BAŞLAMIŞ oturumlarındaki setleri, aşırı
    /// yüklenme analizinin ihtiyacı kadar alanla. Dönem ataması (TR günü) bellekte yapılır.
    /// </summary>
    Task<IReadOnlyList<OverreachingSetRow>> GetOverreachingRowsAsync(
        long userId, DateTime fromUtcInclusive, CancellationToken cancellationToken = default);
```

`SetEntryRepository.cs`, `GetWeeklySetRowsAsync`'in altına:

```csharp
    public async Task<IReadOnlyList<OverreachingSetRow>> GetOverreachingRowsAsync(
        long userId, DateTime fromUtcInclusive, CancellationToken cancellationToken = default)
        => await Set
            .Where(s => s.WorkoutSession.UserId == userId && s.WorkoutSession.StartedAt >= fromUtcInclusive)
            .Select(s => new OverreachingSetRow(
                s.WorkoutSessionId, s.WorkoutSession.StartedAt, s.WorkoutSession.EndedAt != null,
                s.WorkoutSession.Difficulty, s.ExerciseId, s.Exercise.Name, s.Exercise.Measurement,
                s.Weight, s.Reps, s.Rir))
            .ToListAsync(cancellationToken);
```

`IStatsService.cs`, `GetWeeklyAsync`'in altına:

```csharp
    /// <summary>
    /// #176: aşırı yüklenme sinyali — son 14 gün önceki 28 günle karşılaştırılır; yoksa <c>Signal</c> null.
    /// Bugüne göre, aralıktan bağımsız. Kural <c>OverreachingDetector</c>'da.
    /// </summary>
    Task<OverreachingResponse> GetOverreachingAsync(CancellationToken cancellationToken = default);
```

`StatsService.cs`, `GetWeeklyAsync`'in altına:

```csharp
    public async Task<OverreachingResponse> GetOverreachingAsync(CancellationToken cancellationToken = default)
    {
        var today = TurkeyDay.LocalDateOf(timeProvider.GetUtcNow().UtcDateTime);
        var (fromUtc, _) = TurkeyDay.RangeForLocalDate(OverreachingDetector.WindowStart(today));
        var rows = await setEntryRepository.GetOverreachingRowsAsync(currentUser.UserId, fromUtc, cancellationToken);
        return new OverreachingResponse(OverreachingDetector.Detect(rows, today));
    }
```

`StatsController.cs`, `weekly` ucunun altına:

```csharp
    /// <summary>
    /// #176: aşırı yüklenme sinyali (İlerleme sekmesi). Bugüne göre, aralıktan bağımsız; sinyal yoksa
    /// <c>signal</c> null.
    /// </summary>
    [HttpGet("overreaching")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<OverreachingResponse>> GetOverreaching(CancellationToken cancellationToken)
        => Ok(await statsService.GetOverreachingAsync(cancellationToken));
```

Eklemeler arasında tek boş satır bırak; dosya başında `using Grind.Api.Models.Projections;` / `using Grind.Api.Common.Records;` eksikse ekle.

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet build -c Release && dotnet test tests/Grind.Tests -c Release --no-build --filter "FullyQualifiedName~StatsServiceTests|FullyQualifiedName~OverreachingDetectorTests"` ve `dotnet dotnet-ef migrations has-pending-model-changes --project src/Grind.Api --configuration Release --no-build`
Expected: hepsi geçer; "No changes have been made to the model since the last migration."

- [ ] **Step 5: Commit**

```bash
git add src/Grind.Api tests/Grind.Tests/Services/StatsServiceTests.cs
git commit -F <mesaj: "feat: GET /api/stats/overreaching asiri yuklenme sinyali (#176)">
```

---

### Task 3: Export'a sinyal bölümü (GRINDY bağlantısı)

**Files:**
- Modify: `src/Grind.Api/Models/Dtos/Export/ExportResponse.cs`
- Modify: `src/Grind.Api/Services/ExportService.cs`
- Modify: `src/Grind.Api/Services/ExportTextFormatter.cs`
- Test: `tests/Grind.Tests/Services/ExportTextFormatterTests.cs`

**Interfaces:**
- Consumes: Task 1 `OverreachingSignalResponse`, `ExerciseDropResponse`; Task 2 `IStatsService.GetOverreachingAsync`.
- Produces: `ExportResponse(..., IReadOnlyList<ExerciseRecordResponse> AllTimeRecords, OverreachingSignalResponse? Overreaching = null)`.

- [ ] **Step 1: Write the failing test** — `ExportTextFormatterTests.cs`, `RIR_ve_rekor_ekleri_yazilir` testinin üstüne:

```csharp
    /// <summary>
    /// #176: aşırı yüklenme sinyali varsa GRINDY'nin okuyacağı bölüm yazılır; yoksa bölüm hiç yoktur (mevcut
    /// tam çıktı testi bunu da sabitler).
    /// </summary>
    [Fact]
    public void Asiri_yuklenme_sinyali_varsa_bolum_yazilir()
    {
        var sinyal = new OverreachingSignalResponse(
            [new ExerciseDropResponse(1, "Bench Press", 112.5m, 104.06m, 7.5m)], 2.5m, 1m, 3, 4);

        var metin = ExportTextFormatter.Format(Bos() with { Overreaching = sinyal });

        Assert.Contains("## Aşırı yüklenme sinyali (bugüne göre, aralıktan bağımsız)\n", metin);
        Assert.Contains("- Bench Press: tahmini 1RM 112.5 → 104.06 kg (−7.5%)\n", metin);
        Assert.Contains("- Ortalama RIR: 2.5 → 1\n", metin);
        Assert.Contains("- Zorluğu işaretli 4 antrenmandan 3'ü Zor/Maksimal\n", metin);
        Assert.DoesNotContain("Aşırı yüklenme", ExportTextFormatter.Format(Bos()));
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/Grind.Tests --filter FullyQualifiedName~ExportTextFormatterTests`
Expected: derleme hatası — `ExportResponse`'ta `Overreaching` yok.

- [ ] **Step 3: Write minimal implementation**

`ExportResponse.cs` — son parametreyi ekle ve özet yorumuna bir satır:

```csharp
/// <see cref="Overreaching"/> (#176) bugüne göre aşırı yüklenme sinyali, aralıktan BAĞIMSIZ; yoksa null.
```

```csharp
    IReadOnlyList<ExerciseRecordResponse> AllTimeRecords,
    OverreachingSignalResponse? Overreaching = null);
```

(`using Grind.Api.Models.Dtos.Stats;` ekle.)

`ExportService.cs` — `GetAsync` içinde `records` hesaplandıktan sonra, `return new ExportResponse(`'tan önce:

```csharp
        var overreaching = await statsService.GetOverreachingAsync(cancellationToken);
```

ve kurucuya son argüman olarak `records,` satırının yerine:

```csharp
            records,
            overreaching.Signal);
```

`ExportTextFormatter.cs` — `AppendRecords(text, export.AllTimeRecords);` satırının altına `AppendOverreaching(text, export.Overreaching);` ekle ve `AppendRecords` metodunun altına:

```csharp
    /// <summary>
    /// #176: aşırı yüklenme sinyali — yalnızca yanıyorsa. GRINDY yorumu bu metinle üretildiği için sinyali görür
    /// ve açıklar; ayrı bir AI akışı yoktur.
    /// </summary>
    private static void AppendOverreaching(StringBuilder text, OverreachingSignalResponse? signal)
    {
        if (signal is null)
        {
            return;
        }

        Section(text, "Aşırı yüklenme sinyali (bugüne göre, aralıktan bağımsız)");
        Line(text, "Son 14 günün en iyi tahmini 1RM'i önceki 28 güne göre en az %5 düştü ve efor arttı:");
        foreach (var drop in signal.Drops)
        {
            Line(text, Inv(
                $"- {SingleLine(drop.ExerciseName)}: tahmini 1RM {drop.PreviousBest:0.##} → {drop.RecentBest:0.##} kg (−{drop.DropPercent:0.#}%)"));
        }

        if (signal is { RirBefore: { } before, RirRecent: { } recent })
        {
            Line(text, Inv($"- Ortalama RIR: {before:0.#} → {recent:0.#}"));
        }

        if (signal.RatedSessions > 0)
        {
            Line(text, Inv($"- Zorluğu işaretli {signal.RatedSessions} antrenmandan {signal.HardSessions}'ü Zor/Maksimal"));
        }
    }
```

(`using Grind.Api.Models.Dtos.Stats;` eksikse ekle.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet build -c Release && dotnet test tests/Grind.Tests -c Release --no-build --filter "FullyQualifiedName~ExportTextFormatterTests|FullyQualifiedName~ExportServiceTests|FullyQualifiedName~AiInsightServiceTests"`
Expected: hepsi geçer; `Tam_ciktiyi_birebir_uretir` değişmeden geçer (sinyal yokken bölüm yok).

- [ ] **Step 5: Commit**

```bash
git add src/Grind.Api tests/Grind.Tests/Services/ExportTextFormatterTests.cs
git commit -F <mesaj: "feat: export metninde asiri yuklenme sinyali, GRINDY baglami (#176)">
```

---

### Task 4: Ortak paket — tip, sorgu, tazeleme, metinler

**Files:**
- Regenerate: `packages/shared/src/api/schema.d.ts`
- Modify: `packages/shared/src/api/queries.ts`
- Modify: `packages/shared/src/i18n/tr.ts`, `packages/shared/src/i18n/en.ts`
- Test: `packages/shared/src/api/asiriYuklenmeTazele.test.ts`

**Interfaces:**
- Consumes: Task 2 HTTP yanıtı.
- Produces (`@grind/shared/api/queries`): `interface HareketDususu { exerciseId: number; exerciseName: string; previousBest: number; recentBest: number; dropPercent: number }`, `interface AsiriYuklenmeSinyali { drops: HareketDususu[]; rirBefore: number | null; rirRecent: number | null; hardSessions: number; ratedSessions: number }`, `useOverreaching(): UseQueryResult<AsiriYuklenmeSinyali | null>`, `queryKeys.overreaching`. i18n grup `asiriYuklenme` (anahtarlar Step 5).

- [ ] **Step 1: Regenerate API types** — API'yi çalıştır (Docker'da, `Jwt__Key` geçici), repo dışından:
`npm exec --yes --package=openapi-typescript@7.13.0 -- openapi-typescript http://localhost:5098/swagger/v1/swagger.json -o <repo>/packages/shared/src/api/schema.d.ts`
Expected: diff yalnızca `/api/stats/overreaching` yolunu, `OverreachingResponse` / `OverreachingSignalResponse` / `ExerciseDropResponse` şemalarını ve `ExportResponse.overreaching` alanını ekler.

- [ ] **Step 2: Write the failing test** — `packages/shared/src/api/asiriYuklenmeTazele.test.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { oturumBittiTazele, oturumSilindiTazele, queryKeys, setDegistiTazele } from './queries';

/**
 * #176: sinyal setlerden, oturum silmeden ve oturum bitirmeden (zorluk bitirirken isaretlenir) etkilenir; uc
 * akis da `overreaching` sorgusunu tazeler.
 */
test('set degisimi, oturum silme ve bitirme asiri yuklenme sinyalini tazeler', () => {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');

  setDegistiTazele(client, { sessionId: 1, exerciseId: 2 });
  oturumSilindiTazele(client, 1);
  oturumBittiTazele(client);

  const sinyalTazelemeleri = invalidate.mock.calls.filter(
    ([filtre]) => JSON.stringify(filtre?.queryKey) === JSON.stringify(queryKeys.overreaching),
  );
  expect(sinyalTazelemeleri).toHaveLength(3);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test --workspace @grind/shared -- asiriYuklenmeTazele`
Expected: FAIL — `queryKeys.overreaching` undefined, 0 çağrı.

- [ ] **Step 4: Write minimal implementation** — `queries.ts`:

Tip takma adlarının yanına:

```ts
type OverreachingResponse = components['schemas']['OverreachingResponse'];
type ExerciseDropResponse = components['schemas']['ExerciseDropResponse'];
```

`queryKeys` içine (`weeklyStats` satırının altına):

```ts
  // #176: asiri yuklenme sinyali (Ilerleme sekmesinin en ustu).
  overreaching: ['overreaching'] as const,
```

`setDegistiTazele`, `oturumSilindiTazele` ve `oturumBittiTazele` gövdelerinin sonuna:

```ts
  void queryClient.invalidateQueries({ queryKey: queryKeys.overreaching });
```

(`setDegistiTazele`'dekinin üstüne `// #176: sinyal setlerden turer.`, `oturumBittiTazele`'dekinin üstüne `// #176: zorluk bitirirken isaretlenir, sinyalin efor kuralina girer.` yorumu.)

`useVolumeByExercise`'ın altına:

```ts
export interface HareketDususu {
  exerciseId: number;
  exerciseName: string;
  previousBest: number;
  recentBest: number;
  dropPercent: number;
}

/** #176: yanan sinyal; RIR ortalamalari yalnizca RIR kurali degerlendirilebildiyse dolu. */
export interface AsiriYuklenmeSinyali {
  drops: HareketDususu[];
  rirBefore: number | null;
  rirRecent: number | null;
  hardSessions: number;
  ratedSessions: number;
}

function dogrulanmisDusus(yanit: ExerciseDropResponse): HareketDususu {
  if (
    yanit.exerciseId === undefined ||
    !yanit.exerciseName ||
    yanit.previousBest === undefined ||
    yanit.recentBest === undefined ||
    yanit.dropPercent === undefined
  ) {
    throw new Error('Sunucudan eksik dusus satiri alindi.');
  }
  return {
    exerciseId: yanit.exerciseId,
    exerciseName: yanit.exerciseName,
    previousBest: yanit.previousBest,
    recentBest: yanit.recentBest,
    dropPercent: yanit.dropPercent,
  };
}

/** #176: `GET /api/stats/overreaching` -- sinyal yoksa `null`. */
export function useOverreaching() {
  return useQuery({
    queryKey: queryKeys.overreaching,
    queryFn: async (): Promise<AsiriYuklenmeSinyali | null> => {
      const sinyal = (await request<OverreachingResponse>('/stats/overreaching')).signal;
      if (!sinyal) {
        return null;
      }
      if (sinyal.hardSessions === undefined || sinyal.ratedSessions === undefined) {
        throw new Error('Sunucudan eksik asiri yuklenme sinyali alindi.');
      }
      return {
        drops: (sinyal.drops ?? []).map(dogrulanmisDusus),
        rirBefore: sinyal.rirBefore ?? null,
        rirRecent: sinyal.rirRecent ?? null,
        hardSessions: sinyal.hardSessions,
        ratedSessions: sinyal.ratedSessions,
      };
    },
  });
}
```

- [ ] **Step 5: Add catalog keys** — `tr.ts`, `ilerleme` grubunun altına yeni grup:

```ts
  // #176: İlerleme sekmesinin üstündeki aşırı yüklenme kartı.
  asiriYuklenme: {
    baslik: 'Aşırı yüklenme sinyali',
    rozet: 'Deload önerisi',
    dususSatiri: '{{hareket}} · {{onceki}} → {{son}} kg (−{{yuzde}}%)',
    rirSatiri: 'Ortalama RIR {{onceki}} → {{son}}',
    zorlukSatiri: 'Son 2 haftada {{zor}}/{{toplam}} antrenman Zor ya da Maksimal',
    oneri:
      "Bu hafta deload yap: aynı hareketler, setlerin yaklaşık yarısı ve ağırlıkta ~%10 azaltma — ya da 2–3 gün aktif dinlenme. GRINDY'den yorum istersen bu sinyali ayrıntılı açıklar.",
  },
```

`en.ts`, aynı yere:

```ts
  asiriYuklenme: {
    baslik: 'Overreaching signal',
    rozet: 'Deload suggested',
    dususSatiri: '{{hareket}} · {{onceki}} → {{son}} kg (−{{yuzde}}%)',
    rirSatiri: 'Average RIR {{onceki}} → {{son}}',
    zorlukSatiri: 'Last 2 weeks: {{zor}}/{{toplam}} workouts Hard or Maximal',
    oneri:
      'Take a deload week: same exercises, about half the sets and ~10% less weight — or 2–3 days of active rest. Ask GRINDY for an insight and it will explain this signal in detail.',
  },
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run typecheck --workspace @grind/shared && npm run test --workspace @grind/shared`
Expected: tip kontrolü temiz; `asiriYuklenmeTazele` ve `katalog.test.ts` dahil tümü geçer.

- [ ] **Step 7: Commit**

```bash
git add packages/shared
git commit -F <mesaj: "feat: ortak pakette asiri yuklenme sorgusu ve metinleri (#176)">
```

---

### Task 5: Mobil kart ve İlerleme ekranı

**Files:**
- Create: `mobile/src/components/AsiriYuklenmeKarti.tsx`
- Modify: `mobile/app/(tabs)/profile/progress.tsx`
- Modify: `mobile/__tests__/e2e/ilerleme.test.tsx` (sahte uç)
- Modify: `CLAUDE.md`
- Test: `mobile/src/components/AsiriYuklenmeKarti.test.tsx`

**Interfaces:**
- Consumes: Task 4 `useOverreaching`, `AsiriYuklenmeSinyali`, `asiriYuklenme.*` anahtarları; mevcut `CamKart`, `Rozet` (`mobile/src/ui/Rozet.tsx`, prop `ton="acik"`), `formatWeight`.
- Produces: `export default function AsiriYuklenmeKarti()` — kendi verisini çeker; sinyal yoksa, yüklenirken ya da hatada `null` döner.

- [ ] **Step 1: Write the failing test** — `mobile/src/components/AsiriYuklenmeKarti.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { request } from '@grind/shared/api/client';
import AsiriYuklenmeKarti from './AsiriYuklenmeKarti';

jest.mock('@grind/shared/api/client', () => {
  const actual = jest.requireActual('@grind/shared/api/client');
  return { ...actual, request: jest.fn() };
});

const requestMock = request as jest.Mock;

function kur(signal: unknown) {
  requestMock.mockImplementation(async (path: string) => {
    if (path === '/stats/overreaching') return { signal };
    throw new Error(`beklenmeyen istek ${path}`);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AsiriYuklenmeKarti />
    </QueryClientProvider>,
  );
}

/** #176: sinyal yanarken dusen hareketler, efor satirlari ve oneri gorunur. */
test('sinyal varken dusus ve efor satirlariyla kart cizilir', async () => {
  await kur({
    drops: [{ exerciseId: 1, exerciseName: 'Bench Press', previousBest: 112.5, recentBest: 104.06, dropPercent: 7.5 }],
    rirBefore: 2.5,
    rirRecent: 1,
    hardSessions: 3,
    ratedSessions: 4,
  });

  expect(await screen.findByText('Aşırı yüklenme sinyali')).toBeTruthy();
  expect(screen.getByText('Deload önerisi')).toBeTruthy();
  expect(screen.getByText('Bench Press · 112,5 → 104,06 kg (−7,5%)')).toBeTruthy();
  expect(screen.getByText('Ortalama RIR 2,5 → 1')).toBeTruthy();
  expect(screen.getByText('Son 2 haftada 3/4 antrenman Zor ya da Maksimal')).toBeTruthy();
});

/** RIR kurali degerlendirilemediyse (ortalamalar null) RIR satiri yok; zorlugu isaretli oturum yoksa o da yok. */
test('degerlendirilemeyen efor satirlari cizilmez', async () => {
  await kur({
    drops: [{ exerciseId: 1, exerciseName: 'Squat', previousBest: 150, recentBest: 140, dropPercent: 6.7 }],
    rirBefore: null,
    rirRecent: null,
    hardSessions: 0,
    ratedSessions: 0,
  });

  expect(await screen.findByText('Aşırı yüklenme sinyali')).toBeTruthy();
  expect(screen.queryByText(/Ortalama RIR/)).toBeNull();
  expect(screen.queryByText(/Son 2 haftada/)).toBeNull();
});

test('sinyal yokken hicbir sey cizilmez', async () => {
  await kur(null);

  await new Promise((r) => setTimeout(r, 50));
  expect(screen.queryByText('Aşırı yüklenme sinyali')).toBeNull();
  expect(screen.toJSON()).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest src/components/AsiriYuklenmeKarti.test.tsx`
Expected: FAIL — modül yok.

- [ ] **Step 3: Write minimal implementation** — `mobile/src/components/AsiriYuklenmeKarti.tsx`:

```tsx
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import { useOverreaching } from '@grind/shared/api/queries';
import { formatWeight } from '@grind/shared/lib/format';
import CamKart from '../ui/CamKart';
import Rozet from '../ui/Rozet';

/**
 * #176: asiri yuklenme (overreaching) sinyali -- yalnizca yanarken, Ilerleme sekmesinin en ustunde. Kural
 * sunucuda (`OverreachingDetector`); istemci yeniden hesaplamaz. Kapatilamaz: sinyal veriye bagli, deload
 * yapilip performans toparlaninca kendiliginden kaybolur.
 */
export default function AsiriYuklenmeKarti() {
  const { t } = useTranslation();
  const dil = useDil();
  const { data: sinyal } = useOverreaching();

  if (!sinyal) {
    return null;
  }

  return (
    <CamKart className="flex-col gap-3 p-4">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-heading text-fg">{t('asiriYuklenme.baslik')}</Text>
        <Rozet ton="acik">{t('asiriYuklenme.rozet')}</Rozet>
      </View>
      <View className="flex-col gap-1">
        {sinyal.drops.map((dusus) => (
          <Text key={dusus.exerciseId} className="text-body text-fg">
            {t('asiriYuklenme.dususSatiri', {
              hareket: dusus.exerciseName,
              onceki: formatWeight(dusus.previousBest, dil),
              son: formatWeight(dusus.recentBest, dil),
              yuzde: formatWeight(dusus.dropPercent, dil),
            })}
          </Text>
        ))}
      </View>
      {sinyal.rirBefore !== null && sinyal.rirRecent !== null && (
        <Text className="text-body text-muted">
          {t('asiriYuklenme.rirSatiri', {
            onceki: formatWeight(sinyal.rirBefore, dil),
            son: formatWeight(sinyal.rirRecent, dil),
          })}
        </Text>
      )}
      {sinyal.ratedSessions > 0 && (
        <Text className="text-body text-muted">
          {t('asiriYuklenme.zorlukSatiri', { zor: sinyal.hardSessions, toplam: sinyal.ratedSessions })}
        </Text>
      )}
      <Text className="text-body text-muted">{t('asiriYuklenme.oneri')}</Text>
    </CamKart>
  );
}
```

`progress.tsx`: import `AsiriYuklenmeKarti`; `ScrollView`'un ilk çocuğu olarak `<AsiriYuklenmeKarti />` (`<HaftalikHacimKarti …/>`'nın üstüne). Dosya başındaki yorum bloğuna: `#176: en ustte asiri yuklenme karti, yalnizca sinyal yanarken.`

`mobile/__tests__/e2e/ilerleme.test.tsx`: `if (path === '/stats/weekly') …` satırının altına `if (path === '/stats/overreaching') return { signal: null };`.

`CLAUDE.md` "Kapsam ve Sıra" listesine, #184 maddesinin altına:

```md
- **Aşırı yüklenme sinyali (2026-10-04, #176)** — kural tabanlı, saklanmaz (`OverreachingDetector`, plato deseni):
  son 14 günde en az 2 kilolu harekette tahmini 1RM önceki 28 güne göre ≥ %5 düşük VE efor arttı (RIR ≥ 1 düştü,
  her dönemde ≥ 2 RIR'lı set; ya da son dönemde ≥ 2 işaretli oturumun en az yarısı Zor/Maksimal). Yanarsa İlerleme
  sekmesinin en üstünde kapatılamaz bir deload kartı; `GET /api/stats/overreaching`. AI'a ayrı akış yok: sinyal
  export metninde bölüm olarak yer alır, GRINDY yorumu onu görür. Ayrıntı:
  [docs/superpowers/specs/2026-10-04-asiri-yuklenme-design.md](docs/superpowers/specs/2026-10-04-asiri-yuklenme-design.md).
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run typecheck --workspace mobile && cd mobile && npx jest --forceExit --maxWorkers=2`
Expected: tip kontrolü temiz; yeni 3 test, `ilerleme` e2e ve `cevrimdisi`/`cevrilmemisMetin` dahil tüm suite geçer.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/AsiriYuklenmeKarti.tsx mobile/src/components/AsiriYuklenmeKarti.test.tsx \
  "mobile/app/(tabs)/profile/progress.tsx" mobile/__tests__/e2e/ilerleme.test.tsx CLAUDE.md
git commit -F <mesaj: "feat: Ilerleme sekmesinde asiri yuklenme karti (#176)">
```

---

### Task 6: Tüm doğrulama ve PR akışı

- [ ] **Step 1:** Backend: `dotnet build -c Release`, drift kontrolü, `dotnet test` (tümü). Shared ve mobil: tip kontrolü + testler (tümü, mobil `--maxWorkers=2`).
- [ ] **Step 2:** `git-flow/SKILL.md` adım 4–6: `dev` PR'ı (`Refs #176`, test planında komutla sayılmış sonuçlar), CI yeşilse merge; aynı branch'ten master PR'ı (`Closes #176`); geri-merge ve `merge-base --is-ancestor` → `OK`.
