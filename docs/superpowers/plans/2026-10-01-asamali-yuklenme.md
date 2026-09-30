# Aşamalı Yüklenme Analizi — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Profil'e "İlerleme" sekmesi: haftalık hacim trendi, kas grubuna göre haftalık set dağılımı ve seçilen hareketin tahmini 1RM trendi.

**Architecture:** Backend'de tek yeni uç `GET /api/stats/weekly`, hafta başına bir satır (hacim + dört kategori set sayısı). Satırları saf `WeeklyStatsCalculator` üretir, repository yalnızca projeksiyon okur. Mobilde ekran bir kez çeker; kesim ve fark hesabı `packages/shared` içindeki saf yardımcılarda. 1RM kartı mevcut `.../progress` ucunu ve hareket grafiğini yeniden kullanır.

**Tech Stack:** ASP.NET Core 10 + EF Core (Npgsql), xUnit; React Native + Expo Router, TanStack Query, i18next, jest-expo; `packages/shared` vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-asamali-yuklenme-design.md`

## Global Constraints

- Web'e dokunulmaz (#326, issue #184 yorumu). Yalnızca `src/`, `tests/`, `packages/shared`, `mobile/`.
- Yeni tablo ve migration yok.
- Hafta Pazartesi–Pazar, `StreakCalculator.WeekStart`; set, oturumunun `StartedAt`'inin TR günüyle haftaya düşer (`TurkeyDay.LocalDateOf`).
- Hacim = `Weight × (Reps ?? 0)`.
- Kas grubu = `Exercise.Category` (Push / Pull / Legs / Other); her set kategorisine sayılır, ölçüm tipinden bağımsız.
- Kullanıcıya görünen her metin `packages/shared/src/i18n/tr.ts` ve `en.ts`'e aynı commit'te; `t(...)` ile kullanılır.
- API tipleri elle yazılmaz: `packages/shared/src/api/schema.d.ts` çalışan API'nin Swagger'ından `openapi-typescript` ile üretilir.
- Yeni renk token'ı yok; çubuklar `accent`, etiketler mevcut tipografi sınıfları.
- Commit mesajları: kısa Türkçe (ASCII) başlık, `Refs #184`, son satır oturumun `Co-Authored-By` trailer'ı; `git commit -F <dosya>`.
- Bu makinede `dotnet` ve `node` kurulu değil. Komutlar Docker'da (CONTRIBUTING'teki PostgreSQL 5433 + `mcr.microsoft.com/dotnet/sdk:10.0`, `node:24`) ya da CI'da koşar. Docker Desktop çalışmıyorsa önce açılmalı; açılamazsa testler CI'da doğrulanır ve bu PR'da söylenir.

## Review Focus

- Pazar 23:30'da (TR) başlayan oturum → setleri o haftaya düşer, ertesi haftaya değil (Task 1 testi).
- Setleri yalnızca bu haftada olan kullanıcı → hacim kartı grafik yerine "tamamlanmış hafta yok" açıklaması gösterir (Task 4 testi).
- Seçili haftada hiç set yok → dört sıfır çubuk değil "Bu haftada antrenman yok" (Task 4 testi).
- İlk hafta seçili → karşılaştırılacak önceki hafta yok, fark yazılmaz (Task 3 testi).
- Hiç kilolu (`WeightReps`) hareket yapılmamış → 1RM kartı grafik yerine açıklama gösterir (Task 3 ve Task 5 testleri).

---

### Task 1: Haftalık satırları üreten saf hesaplayıcı

**Files:**
- Create: `src/Grind.Api/Models/Projections/WeeklySetRow.cs`
- Create: `src/Grind.Api/Models/Dtos/Stats/WeeklyStatsResponse.cs`
- Create: `src/Grind.Api/Common/Time/WeeklyStatsCalculator.cs`
- Test: `tests/Grind.Tests/Common/WeeklyStatsCalculatorTests.cs`

**Interfaces:**
- Produces:
  - `record WeeklySetRow(DateTime SessionStartedAt, decimal Weight, int? Reps, ExerciseCategory Category)` (namespace `Grind.Api.Models.Projections`)
  - `record WeeklyStatsRow(DateOnly WeekStart, decimal Volume, int PushSets, int PullSets, int LegsSets, int OtherSets)` ve `record WeeklyStatsResponse(IReadOnlyList<WeeklyStatsRow> Weeks)` (namespace `Grind.Api.Models.Dtos.Stats`)
  - `static IReadOnlyList<WeeklyStatsRow> WeeklyStatsCalculator.Build(IEnumerable<WeeklySetRow> sets, DateOnly today)` (namespace `Grind.Api.Common.Time`)

- [ ] **Step 1: Write the failing test**

```csharp
using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;

namespace Grind.Tests.Common;

/// <summary>#184: İlerleme sekmesinin haftalık satırları. DB'siz, saf.</summary>
public class WeeklyStatsCalculatorTests
{
    /// <summary>2026-03-12 Perşembe; haftası 2026-03-09 Pazartesi başlar.</summary>
    private static readonly DateOnly Bugun = new(2026, 3, 12);

    private static WeeklySetRow Set(DateTime startedAtUtc, decimal weight, int? reps, ExerciseCategory category) =>
        new(startedAtUtc, weight, reps, category);

    [Fact]
    public void Hic_set_yoksa_bos_liste_doner()
    {
        Assert.Empty(WeeklyStatsCalculator.Build([], Bugun));
    }

    /// <summary>
    /// Oturum Pazar 23:30'da (TR, UTC 20:30) başladıysa setleri o haftadadır — antrenmanın hangi güne ait
    /// olduğu kuralı (CLAUDE.md): başladığı gün. Pazartesi 00:30'da başlayan ertesi haftadadır.
    /// </summary>
    [Fact]
    public void Set_oturumun_basladigi_TR_gununun_haftasina_duser()
    {
        var pazarGecesi = new DateTime(2026, 3, 8, 20, 30, 0, DateTimeKind.Utc);
        var pazartesiGecesi = new DateTime(2026, 3, 8, 21, 30, 0, DateTimeKind.Utc);

        var haftalar = WeeklyStatsCalculator.Build(
            [Set(pazarGecesi, 100m, 5, ExerciseCategory.Push), Set(pazartesiGecesi, 60m, 10, ExerciseCategory.Pull)],
            Bugun);

        Assert.Equal(
            [
                new WeeklyStatsRow(new DateOnly(2026, 3, 2), 500m, 1, 0, 0, 0),
                new WeeklyStatsRow(new DateOnly(2026, 3, 9), 600m, 0, 1, 0, 0),
            ],
            haftalar);
    }

    /// <summary>İlk antrenman haftasından bu haftaya aradaki boş haftalar sıfırla doldurulur.</summary>
    [Fact]
    public void Bos_haftalar_bu_haftaya_kadar_sifirla_doldurulur()
    {
        var subatOrtasi = new DateTime(2026, 2, 17, 15, 0, 0, DateTimeKind.Utc);

        var haftalar = WeeklyStatsCalculator.Build([Set(subatOrtasi, 50m, 10, ExerciseCategory.Legs)], Bugun);

        Assert.Equal(
            [
                new WeeklyStatsRow(new DateOnly(2026, 2, 16), 500m, 0, 0, 1, 0),
                new WeeklyStatsRow(new DateOnly(2026, 2, 23), 0m, 0, 0, 0, 0),
                new WeeklyStatsRow(new DateOnly(2026, 3, 2), 0m, 0, 0, 0, 0),
                new WeeklyStatsRow(new DateOnly(2026, 3, 9), 0m, 0, 0, 0, 0),
            ],
            haftalar);
    }

    /// <summary>
    /// #346: süreli set (tekrar yok) ve ağırlıksız set hacme 0 katar ama kategorisine sayılır.
    /// </summary>
    [Fact]
    public void Agirliksiz_ve_sureli_setler_hacme_eklenmez_ama_kategorisine_sayilir()
    {
        var an = new DateTime(2026, 3, 10, 15, 0, 0, DateTimeKind.Utc);

        var haftalar = WeeklyStatsCalculator.Build(
            [
                Set(an, 0m, null, ExerciseCategory.Other),
                Set(an, 0m, 20, ExerciseCategory.Other),
                Set(an, 80m, 8, ExerciseCategory.Push),
            ],
            Bugun);

        Assert.Equal([new WeeklyStatsRow(new DateOnly(2026, 3, 9), 640m, 1, 0, 0, 2)], haftalar);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/Grind.Tests --filter FullyQualifiedName~WeeklyStatsCalculatorTests`
Expected: derleme hatası — `WeeklyStatsCalculator`, `WeeklySetRow`, `WeeklyStatsRow` tanımlı değil.

- [ ] **Step 3: Write minimal implementation**

`src/Grind.Api/Models/Projections/WeeklySetRow.cs`:

```csharp
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Projections;

/// <summary>
/// #184: haftalık istatistik için bir set — oturumun başlangıcı (haftayı o belirler), hacim alanları ve
/// hareketin kas grubu. Repository'nin okuma modeli.
/// </summary>
public record WeeklySetRow(DateTime SessionStartedAt, decimal Weight, int? Reps, ExerciseCategory Category);
```

`src/Grind.Api/Models/Dtos/Stats/WeeklyStatsResponse.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// #184: bir haftanın (Pazartesi–Pazar, TR) hacmi ve kas grubuna göre set sayıları. Kategoriler sözlük
/// değil düz alan: Swagger'dan üretilen istemci tipi net kalsın.
/// </summary>
public record WeeklyStatsRow(
    DateOnly WeekStart, decimal Volume, int PushSets, int PullSets, int LegsSets, int OtherSets);

/// <summary>
/// İlk antrenman haftasından bu haftaya, eskiden yeniye; antrenmansız haftalar sıfır. Son satır içinde
/// bulunulan (henüz bitmemiş) haftadır. Hiç set yoksa boş.
/// </summary>
public record WeeklyStatsResponse(IReadOnlyList<WeeklyStatsRow> Weeks);
```

`src/Grind.Api/Common/Time/WeeklyStatsCalculator.cs`:

```csharp
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;

namespace Grind.Api.Common.Time;

/// <summary>
/// #184: setleri Pazartesi–Pazar haftalarına toplar. Saf: DB ve saat bilmez, "bugün" dışarıdan gelir.
/// Hafta sınırı seri hesabıyla aynı (<see cref="StreakCalculator.WeekStart"/>); bir set, oturumunun
/// başladığı TR gününün haftasına düşer.
/// </summary>
public static class WeeklyStatsCalculator
{
    private const int DaysPerWeek = 7;

    public static IReadOnlyList<WeeklyStatsRow> Build(IEnumerable<WeeklySetRow> sets, DateOnly today)
    {
        var byWeek = sets
            .GroupBy(s => StreakCalculator.WeekStart(TurkeyDay.LocalDateOf(s.SessionStartedAt)))
            .ToDictionary(g => g.Key, g => g.ToList());

        if (byWeek.Count == 0)
        {
            return [];
        }

        var first = byWeek.Keys.Min();
        // Gelecek tarihli bir oturum (saat hatası) varsa satır kaybolmasın diye son hafta en az o haftadır.
        var last = new[] { StreakCalculator.WeekStart(today), byWeek.Keys.Max() }.Max();

        var rows = new List<WeeklyStatsRow>();
        for (var week = first; week <= last; week = week.AddDays(DaysPerWeek))
        {
            var weekSets = byWeek.GetValueOrDefault(week) ?? [];
            rows.Add(new WeeklyStatsRow(
                week,
                weekSets.Sum(s => s.Weight * (s.Reps ?? 0)),
                weekSets.Count(s => s.Category == ExerciseCategory.Push),
                weekSets.Count(s => s.Category == ExerciseCategory.Pull),
                weekSets.Count(s => s.Category == ExerciseCategory.Legs),
                weekSets.Count(s => s.Category == ExerciseCategory.Other)));
        }

        return rows;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `dotnet test tests/Grind.Tests --filter FullyQualifiedName~WeeklyStatsCalculatorTests`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/Grind.Api/Models/Projections/WeeklySetRow.cs src/Grind.Api/Models/Dtos/Stats/WeeklyStatsResponse.cs \
  src/Grind.Api/Common/Time/WeeklyStatsCalculator.cs tests/Grind.Tests/Common/WeeklyStatsCalculatorTests.cs
git commit -F <mesaj: "feat: haftalik istatistik hesaplayicisi (#184)">
```

---

### Task 2: `GET /api/stats/weekly` ucu

**Files:**
- Modify: `src/Grind.Api/Repositories/ISetEntryRepository.cs` (yeni metot)
- Modify: `src/Grind.Api/Repositories/SetEntryRepository.cs` (yeni metot)
- Modify: `src/Grind.Api/Services/IStatsService.cs`, `src/Grind.Api/Services/StatsService.cs`
- Modify: `src/Grind.Api/Controllers/StatsController.cs`
- Test: `tests/Grind.Tests/Services/StatsServiceTests.cs`

**Interfaces:**
- Consumes: Task 1'deki `WeeklySetRow`, `WeeklyStatsResponse`, `WeeklyStatsCalculator.Build`.
- Produces: `Task<IReadOnlyList<WeeklySetRow>> ISetEntryRepository.GetWeeklySetRowsAsync(long userId, CancellationToken cancellationToken = default)`; `Task<WeeklyStatsResponse> IStatsService.GetWeeklyAsync(CancellationToken cancellationToken = default)`; HTTP `GET /api/stats/weekly` → `WeeklyStatsResponse` (JSON: `{ "weeks": [{ "weekStart": "2026-03-09", "volume": 640, "pushSets": 1, "pullSets": 0, "legsSets": 0, "otherSets": 2 }] }`).

- [ ] **Step 1: Write the failing test** — `StatsServiceTests.cs` sonuna (sınıfın kapanış `}`'inden önce):

```csharp
    // ---- Haftalık (#184) ----

    /// <summary>
    /// #184: uç yalnızca çağıranın setlerini sayar ve son satırı bu haftadır (Bugun = 2026-03-12 → 2026-03-09).
    /// </summary>
    [Fact]
    public async Task Haftalik_istatistik_yalnizca_kendi_setlerini_sayar()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Bugun, (100m, 5), (100m, 5));

            var baskasi = TestDatabase.NewUser();
            context.Add(baskasi);
            Seed(context, baskasi, exercise, Bugun, (200m, 10));
            await context.SaveChangesAsync();

            var yanit = await service.GetWeeklyAsync();

            var hafta = Assert.Single(yanit.Weeks);
            Assert.Equal(new DateOnly(2026, 3, 9), hafta.WeekStart);
            Assert.Equal(1000m, hafta.Volume);
            Assert.Equal(2, hafta.OtherSets); // TestDatabase.NewExercise → Category.Other
        }
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/Grind.Tests --filter FullyQualifiedName~StatsServiceTests.Haftalik`
Expected: derleme hatası — `GetWeeklyAsync` tanımlı değil.

- [ ] **Step 3: Write minimal implementation**

`ISetEntryRepository.cs`, `GetAllForUserAsync`'in altına:

```csharp
    /// <summary>
    /// #184: kullanıcının tüm setleri, haftalık istatistiğin ihtiyacı kadar alanla (oturum başlangıcı,
    /// kilo, tekrar, kas grubu). Gruplama bellekte — TR günü kuralının SQL'de ikinci kopyası yazılmaz.
    /// </summary>
    Task<IReadOnlyList<WeeklySetRow>> GetWeeklySetRowsAsync(
        long userId, CancellationToken cancellationToken = default);
```

`SetEntryRepository.cs`, `GetAllForUserAsync`'in altına:

```csharp
    public async Task<IReadOnlyList<WeeklySetRow>> GetWeeklySetRowsAsync(
        long userId, CancellationToken cancellationToken = default)
        => await Set
            .Where(s => s.WorkoutSession.UserId == userId)
            .Select(s => new WeeklySetRow(s.WorkoutSession.StartedAt, s.Weight, s.Reps, s.Exercise.Category))
            .ToListAsync(cancellationToken);
```

(İki dosyada da `using Grind.Api.Models.Projections;` yoksa ekle.)

`IStatsService.cs`, `GetPlateausAsync`'in altına:

```csharp
    /// <summary>
    /// #184: ilk antrenman haftasından bu haftaya haftalık hacim ve kas grubuna göre set sayısı; boş haftalar
    /// sıfır. Aralıktan bağımsız, tüm geçmişten. Kural <c>WeeklyStatsCalculator</c>'da.
    /// </summary>
    Task<WeeklyStatsResponse> GetWeeklyAsync(CancellationToken cancellationToken = default);
```

`StatsService.cs`, `GetPlateausAsync`'in altına:

```csharp
    public async Task<WeeklyStatsResponse> GetWeeklyAsync(CancellationToken cancellationToken = default)
    {
        var sets = await setEntryRepository.GetWeeklySetRowsAsync(currentUser.UserId, cancellationToken);
        var today = TurkeyDay.LocalDateOf(timeProvider.GetUtcNow().UtcDateTime);
        return new WeeklyStatsResponse(WeeklyStatsCalculator.Build(sets, today));
    }
```

`StatsController.cs`, `plateaus` ucunun altına:

```csharp
    /// <summary>
    /// #184: haftalık hacim ve kas grubuna göre set sayısı (İlerleme sekmesi). Aralıktan bağımsız; son satır
    /// içinde bulunulan haftadır.
    /// </summary>
    [HttpGet("weekly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<WeeklyStatsResponse>> GetWeekly(CancellationToken cancellationToken)
        => Ok(await statsService.GetWeeklyAsync(cancellationToken));
```

`IStatsService`'i uygulayan başka bir sınıf (test sahtesi) varsa derleme onu gösterir; ona da aynı metodu `throw new NotSupportedException()` değil, gerçek bir boş yanıtla (`new WeeklyStatsResponse([])`) ekle.

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet build -c Release && dotnet test tests/Grind.Tests --filter "FullyQualifiedName~StatsServiceTests|FullyQualifiedName~WeeklyStatsCalculatorTests"`
Expected: hepsi geçer. Ardından `dotnet dotnet-ef migrations has-pending-model-changes --project src/Grind.Api --configuration Release --no-build` → "No changes have been made" (şema değişmedi).

- [ ] **Step 5: Commit**

```bash
git add src/Grind.Api tests/Grind.Tests/Services/StatsServiceTests.cs
git commit -F <mesaj: "feat: GET /api/stats/weekly haftalik hacim ve kas grubu setleri (#184)">
```

---

### Task 3: Ortak paket — tipler, sorgular, saf yardımcılar, metinler

**Files:**
- Regenerate: `packages/shared/src/api/schema.d.ts`
- Modify: `packages/shared/src/api/queries.ts`
- Create: `packages/shared/src/lib/haftalikIlerleme.ts`
- Modify: `packages/shared/package.json` (exports)
- Modify: `packages/shared/src/i18n/tr.ts`, `packages/shared/src/i18n/en.ts`
- Test: `packages/shared/src/lib/haftalikIlerleme.test.ts`

**Interfaces:**
- Consumes: Task 2'nin HTTP yanıtı; `GET /api/stats/volume/by-exercise?From=YYYY-MM-DD` (mevcut; `{ items: [{ exerciseId, exerciseName, volume, setCount }] }`).
- Produces (`@grind/shared/api/queries`):
  - `interface HaftalikIstatistik { weekStart: string; volume: number; pushSets: number; pullSets: number; legsSets: number; otherSets: number }`
  - `useWeeklyStats(): UseQueryResult<HaftalikIstatistik[]>`
  - `interface EgzersizHacmi { exerciseId: number; exerciseName: string; volume: number; setCount: number }`
  - `useVolumeByExercise(from: string): UseQueryResult<EgzersizHacmi[]>`
  - `queryKeys.weeklyStats`, `queryKeys.volumeByExerciseAll`, `queryKeys.volumeByExercise(from)`
- Produces (`@grind/shared/lib/haftalikIlerleme`):
  - `type HacimAraligi = '1a' | '3a' | 'tum'`
  - `hacimHaftalari(haftalar: readonly HaftalikIstatistik[], aralik: HacimAraligi): HaftalikIstatistik[]`
  - `const KAS_GRUPLARI: readonly EgzersizKategorisi[]` (`['Push', 'Pull', 'Legs', 'Other']`)
  - `interface KasGrubuSatiri { kategori: EgzersizKategorisi; set: number; fark: number | null }`
  - `kasGrubuSatirlari(haftalar: readonly HaftalikIstatistik[], sira: number): KasGrubuSatiri[]`
  - `varsayilanBirTekrarHareketi(hacimler: readonly EgzersizHacmi[], egzersizler: readonly Egzersiz[]): number | null`
- Produces (i18n): `kabuk.sekmeIlerleme`; grup `ilerleme` (anahtarlar Step 5'te).

- [ ] **Step 1: Regenerate API types**

API'yi çalıştır (Docker'da: `ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://127.0.0.1:5098 Jwt__Key=<32+ karakter> dotnet run -c Release --no-launch-profile` src/Grind.Api içinde), sonra:

Run (repo DIŞINDAKİ bir klasörden — CLAUDE.md "Web işleri bitti": web workspace'inin aracı kullanılmaz, sürüm sabit):
`npm exec --yes --package=openapi-typescript@7.13.0 -- openapi-typescript http://localhost:5098/swagger/v1/swagger.json -o <repo>/packages/shared/src/api/schema.d.ts`
Expected: `git diff packages/shared/src/api/schema.d.ts` yalnızca `/api/stats/weekly` yolunu ve `WeeklyStatsResponse` / `WeeklyStatsRow` şemalarını ekler.

- [ ] **Step 2: Write the failing test** — `packages/shared/src/lib/haftalikIlerleme.test.ts`:

```ts
import { expect, test } from 'vitest';
import type { Egzersiz, EgzersizHacmi, HaftalikIstatistik } from '../api/queries';
import { hacimHaftalari, kasGrubuSatirlari, varsayilanBirTekrarHareketi } from './haftalikIlerleme';

function hafta(weekStart: string, volume: number, sets: [number, number, number, number] = [0, 0, 0, 0]): HaftalikIstatistik {
  const [pushSets, pullSets, legsSets, otherSets] = sets;
  return { weekStart, volume, pushSets, pullSets, legsSets, otherSets };
}

// 6 hafta; sonuncusu (2026-03-09) icinde bulunulan, henuz bitmemis hafta.
const HAFTALAR = [
  hafta('2026-02-02', 100),
  hafta('2026-02-09', 200),
  hafta('2026-02-16', 0),
  hafta('2026-02-23', 400),
  hafta('2026-03-02', 500, [6, 4, 3, 1]),
  hafta('2026-03-09', 50, [8, 4, 1, 0]),
];

/** #184: devam eden hafta grafige girmez -- Pazartesi gunu "Su anki" gerileme gibi okunmasin. */
test('hacim haftalari devam eden haftayi disarida birakir, 1A son 4 tamamlanmis hafta', () => {
  expect(hacimHaftalari(HAFTALAR, 'tum').map((h) => h.weekStart)).toEqual([
    '2026-02-02', '2026-02-09', '2026-02-16', '2026-02-23', '2026-03-02',
  ]);
  expect(hacimHaftalari(HAFTALAR, '1a').map((h) => h.weekStart)).toEqual([
    '2026-02-09', '2026-02-16', '2026-02-23', '2026-03-02',
  ]);
});

test('yalnizca bu hafta varsa tamamlanmis hafta yoktur', () => {
  expect(hacimHaftalari([hafta('2026-03-09', 50)], 'tum')).toEqual([]);
});

test('kas grubu satirlari secili haftanin setlerini ve onceki haftaya farki verir', () => {
  expect(kasGrubuSatirlari(HAFTALAR, 5)).toEqual([
    { kategori: 'Push', set: 8, fark: 2 },
    { kategori: 'Pull', set: 4, fark: 0 },
    { kategori: 'Legs', set: 1, fark: -2 },
    { kategori: 'Other', set: 0, fark: -1 },
  ]);
});

/** Ilk haftanin karsilastirilacak onceki haftasi yok: fark null, "+0" diye yazilmaz. */
test('ilk haftada fark yoktur', () => {
  expect(kasGrubuSatirlari(HAFTALAR, 0).every((satir) => satir.fark === null)).toBe(true);
});

function egzersiz(id: number, measurement: Egzersiz['measurement']): Egzersiz {
  return { id, name: `Hareket ${id}`, category: 'Push', measurement };
}

function hacim(exerciseId: number, setCount: number): EgzersizHacmi {
  return { exerciseId, exerciseName: `Hareket ${exerciseId}`, volume: 0, setCount };
}

/** #184: varsayilan 1RM hareketi en cok set atilan KILOLU hareket; agirliksiz/sureli harekette 1RM yok. */
test('varsayilan 1RM hareketi en cok set atilan kilolu harekettir', () => {
  const egzersizler = [egzersiz(1, 'WeightReps'), egzersiz(2, 'Reps'), egzersiz(3, 'WeightReps')];
  expect(varsayilanBirTekrarHareketi([hacim(1, 10), hacim(2, 40), hacim(3, 12)], egzersizler)).toBe(3);
});

test('kilolu hareket yoksa varsayilan yoktur', () => {
  expect(varsayilanBirTekrarHareketi([hacim(2, 40)], [egzersiz(2, 'Duration')])).toBeNull();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test --workspace @grind/shared -- haftalikIlerleme`
Expected: FAIL — `./haftalikIlerleme` modülü yok.

- [ ] **Step 4: Write minimal implementation**

`packages/shared/src/api/queries.ts` — tip takma adlarının yanına (dosyanın başı):

```ts
type WeeklyStatsResponse = components['schemas']['WeeklyStatsResponse'];
type WeeklyStatsRow = components['schemas']['WeeklyStatsRow'];
type ExerciseVolumeResponseVolumeSummaryResponse = components['schemas']['ExerciseVolumeResponseVolumeSummaryResponse'];
type ExerciseVolumeResponse = components['schemas']['ExerciseVolumeResponse'];
```

`queryKeys` içine (`plateaus` satırının altına):

```ts
  // #184: Ilerleme sekmesi. Set eklenince/silinince tazelenir (bkz. setDegistiTazele).
  weeklyStats: ['weeklyStats'] as const,
  volumeByExerciseAll: ['volumeByExercise'] as const,
  volumeByExercise: (from: string) => [...queryKeys.volumeByExerciseAll, from] as const,
```

`setDegistiTazele` gövdesinin sonuna:

```ts
  // #184: Ilerleme sekmesinin haftalik satirlari ve 1RM kartinin varsayilan hareketi setlerden turer.
  void queryClient.invalidateQueries({ queryKey: queryKeys.weeklyStats });
  void queryClient.invalidateQueries({ queryKey: queryKeys.volumeByExerciseAll });
```

`usePlateaus`'un altına:

```ts
/** #184: bir hafta (Pazartesi–Pazar, TR). `weekStart` "YYYY-MM-DD". */
export interface HaftalikIstatistik {
  weekStart: string;
  volume: number;
  pushSets: number;
  pullSets: number;
  legsSets: number;
  otherSets: number;
}

/** `0` gecerli: kontroller `=== undefined` ile. */
function dogrulanmisHafta(yanit: WeeklyStatsRow): HaftalikIstatistik {
  if (
    !yanit.weekStart ||
    yanit.volume === undefined ||
    yanit.pushSets === undefined ||
    yanit.pullSets === undefined ||
    yanit.legsSets === undefined ||
    yanit.otherSets === undefined
  ) {
    throw new Error('Sunucudan eksik haftalik istatistik alindi.');
  }
  return {
    weekStart: yanit.weekStart,
    volume: yanit.volume,
    pushSets: yanit.pushSets,
    pullSets: yanit.pullSets,
    legsSets: yanit.legsSets,
    otherSets: yanit.otherSets,
  };
}

/**
 * #184: `GET /api/stats/weekly` -- ilk antrenman haftasindan bu haftaya, eskiden yeniye; son satir icinde
 * bulunulan hafta. Tek istek: hacim karti ve kas grubu karti ayni veriyi keser.
 */
export function useWeeklyStats() {
  return useQuery({
    queryKey: queryKeys.weeklyStats,
    queryFn: async (): Promise<HaftalikIstatistik[]> =>
      ((await request<WeeklyStatsResponse>('/stats/weekly')).weeks ?? []).map(dogrulanmisHafta),
  });
}

export interface EgzersizHacmi {
  exerciseId: number;
  exerciseName: string;
  volume: number;
  setCount: number;
}

function dogrulanmisEgzersizHacmi(yanit: ExerciseVolumeResponse): EgzersizHacmi {
  if (yanit.exerciseId === undefined || !yanit.exerciseName || yanit.volume === undefined || yanit.setCount === undefined) {
    throw new Error('Sunucudan eksik egzersiz hacmi alindi.');
  }
  return {
    exerciseId: yanit.exerciseId,
    exerciseName: yanit.exerciseName,
    volume: yanit.volume,
    setCount: yanit.setCount,
  };
}

/** #184: `from` ("YYYY-MM-DD", TR gunu) ile bugun arasinda hareket basina hacim ve set sayisi. */
export function useVolumeByExercise(from: string) {
  return useQuery({
    queryKey: queryKeys.volumeByExercise(from),
    queryFn: async (): Promise<EgzersizHacmi[]> =>
      ((await request<ExerciseVolumeResponseVolumeSummaryResponse>(`/stats/volume/by-exercise?From=${from}`)).items ?? []).map(
        dogrulanmisEgzersizHacmi,
      ),
  });
}
```

`packages/shared/src/lib/haftalikIlerleme.ts`:

```ts
import type { Egzersiz, EgzersizHacmi, EgzersizKategorisi, HaftalikIstatistik } from '../api/queries';

/** #184: hacim grafiginin araligi -- 1A son 4, 3A son 13 tamamlanmis hafta, Tum hepsi. */
export type HacimAraligi = '1a' | '3a' | 'tum';

const HAFTA_SAYISI: Record<HacimAraligi, number | null> = { '1a': 4, '3a': 13, tum: null };

/**
 * Hacim grafiginin haftalari. Sunucunun son satiri icinde bulunulan, henuz bitmemis haftadir: grafige
 * girerse Pazartesi gunu tek antrenmanla "Su anki" dusuk gorunur ve gerileme gibi okunur (spec Karar 3).
 * Bos gecmis haftalar (hacim 0) grafikte kalir.
 */
export function hacimHaftalari(haftalar: readonly HaftalikIstatistik[], aralik: HacimAraligi): HaftalikIstatistik[] {
  const tamamlanmis = haftalar.slice(0, -1);
  const sayi = HAFTA_SAYISI[aralik];
  return sayi === null ? tamamlanmis : tamamlanmis.slice(-sayi);
}

export const KAS_GRUPLARI: readonly EgzersizKategorisi[] = ['Push', 'Pull', 'Legs', 'Other'];

export interface KasGrubuSatiri {
  kategori: EgzersizKategorisi;
  set: number;
  /** Onceki haftaya gore; ilk haftada karsilastirilacak hafta yok, `null`. */
  fark: number | null;
}

function setSayisi(hafta: HaftalikIstatistik, kategori: EgzersizKategorisi): number {
  if (kategori === 'Push') return hafta.pushSets;
  if (kategori === 'Pull') return hafta.pullSets;
  if (kategori === 'Legs') return hafta.legsSets;
  return hafta.otherSets;
}

/** #184: `sira`daki haftanin dort kas grubu satiri (Push, Pull, Legs, Other sirasiyla). */
export function kasGrubuSatirlari(haftalar: readonly HaftalikIstatistik[], sira: number): KasGrubuSatiri[] {
  const hafta = haftalar[sira];
  const onceki = sira > 0 ? haftalar[sira - 1] : null;
  return KAS_GRUPLARI.map((kategori) => {
    const set = setSayisi(hafta, kategori);
    return { kategori, set, fark: onceki ? set - setSayisi(onceki, kategori) : null };
  });
}

/**
 * #184: 1RM kartinin acilistaki hareketi -- verilen hacim listesinde (son 90 gun) en cok set atilan kilolu
 * (`WeightReps`) hareket; esitlikte ada gore. Agirliksiz ve sureli harekette 1RM tahmini yoktur (#346).
 */
export function varsayilanBirTekrarHareketi(
  hacimler: readonly EgzersizHacmi[],
  egzersizler: readonly Egzersiz[],
): number | null {
  const kilolu = new Set(
    egzersizler.filter((e) => (e.measurement ?? 'WeightReps') === 'WeightReps').map((e) => e.id),
  );
  const aday = hacimler
    .filter((h) => kilolu.has(h.exerciseId))
    .sort((a, b) => b.setCount - a.setCount || a.exerciseName.localeCompare(b.exerciseName))[0];
  return aday?.exerciseId ?? null;
}
```

`packages/shared/package.json` `exports`'a (`./lib/ilerleme` satırının altına):

```json
    "./lib/haftalikIlerleme": "./src/lib/haftalikIlerleme.ts",
```

- [ ] **Step 5: Add catalog keys** — `tr.ts`, `kabuk` grubunda `sekmeGecmis`'in yanına `sekmeIlerleme: 'İlerleme',`; en üst seviyede yeni grup (`rekorlar` grubunun altına):

```ts
  // #184: Profil'deki İlerleme sekmesi.
  ilerleme: {
    hataBaslik: 'İlerleme alınamadı',
    hataMesaj: 'Lütfen sayfayı yenileyin.',
    bos: 'Antrenman kaydettikçe ilerlemen burada görünür.',
    hacimBaslik: 'Haftalık hacim',
    hacimOzet: 'haftalık hacim',
    tamamlanmisHaftaYok: 'İlk haftan bitince haftalık hacmin burada görünür.',
    kasGrubuBaslik: 'Kas grubuna göre setler',
    buHafta: 'Bu hafta',
    oncekiHafta: 'Önceki hafta',
    sonrakiHafta: 'Sonraki hafta',
    haftadaAntrenmanYok: 'Bu haftada antrenman yok.',
    kasGrubuSatiri_one: '{{grup}}: {{count}} set',
    kasGrubuSatiri_other: '{{grup}}: {{count}} set',
    birTekrarBaslik: 'Tahmini 1RM',
    hareketDegistir: 'Hareketi değiştir',
    kiloluHareketYok: 'Tahmini 1RM için kilolu bir hareket kaydet.',
  },
```

`en.ts`, aynı yerlere `sekmeIlerleme: 'Progress',` ve:

```ts
  ilerleme: {
    hataBaslik: 'Could not load progress',
    hataMesaj: 'Please refresh the page.',
    bos: 'Your progress will show up here as you log workouts.',
    hacimBaslik: 'Weekly volume',
    hacimOzet: 'weekly volume',
    tamamlanmisHaftaYok: 'Your weekly volume shows up here once your first week is complete.',
    kasGrubuBaslik: 'Sets by muscle group',
    buHafta: 'This week',
    oncekiHafta: 'Previous week',
    sonrakiHafta: 'Next week',
    haftadaAntrenmanYok: 'No workouts this week.',
    kasGrubuSatiri_one: '{{grup}}: {{count}} set',
    kasGrubuSatiri_other: '{{grup}}: {{count}} sets',
    birTekrarBaslik: 'Estimated 1RM',
    hareketDegistir: 'Change exercise',
    kiloluHareketYok: 'Log a weighted exercise to see your estimated 1RM.',
  },
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run typecheck --workspace @grind/shared && npm run test --workspace @grind/shared`
Expected: tip kontrolü temiz; `haftalikIlerleme` 6 test ve `katalog.test.ts` dahil tümü geçer.

- [ ] **Step 7: Commit**

```bash
git add packages/shared
git commit -F <mesaj: "feat: ortak pakette haftalik istatistik sorgusu ve yardimcilari (#184)">
```

---

### Task 4: Mobil — haftalık hacim ve kas grubu kartları

**Files:**
- Create: `mobile/src/components/HaftalikHacimKarti.tsx`
- Create: `mobile/src/components/KasGrubuKarti.tsx`
- Test: `mobile/src/components/HaftalikHacimKarti.test.tsx`, `mobile/src/components/KasGrubuKarti.test.tsx`

**Interfaces:**
- Consumes: Task 3'teki `HaftalikIstatistik`, `hacimHaftalari`, `HacimAraligi`, `kasGrubuSatirlari`; mevcut `CizgiGrafik` (`mobile/src/ui/CizgiGrafik.tsx`, props `noktalar`, `birim`, `baslik`, `bicimle?`), `CamKart`, `formatWeight`, `formatFark`, `formatKisaTarih`, `formatAralik`.
- Produces: `export default function HaftalikHacimKarti({ haftalar }: { haftalar: readonly HaftalikIstatistik[] })`; `export default function KasGrubuKarti({ haftalar }: { haftalar: readonly HaftalikIstatistik[] })` (haftalar boş gelmez; ekran boşken kartları çizmez).

- [ ] **Step 1: Write the failing tests**

`mobile/src/components/KasGrubuKarti.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { HaftalikIstatistik } from '@grind/shared/api/queries';
import KasGrubuKarti from './KasGrubuKarti';

function hafta(weekStart: string, sets: [number, number, number, number]): HaftalikIstatistik {
  const [pushSets, pullSets, legsSets, otherSets] = sets;
  return { weekStart, volume: 0, pushSets, pullSets, legsSets, otherSets };
}

const HAFTALAR = [hafta('2026-02-23', [0, 0, 0, 0]), hafta('2026-03-02', [6, 4, 3, 1]), hafta('2026-03-09', [8, 4, 1, 0])];

test('varsayilan bu hafta: setler ve onceki haftaya fark, esit farkta metin yok', async () => {
  await render(<KasGrubuKarti haftalar={HAFTALAR} />);

  expect(screen.getByText('Bu hafta')).toBeTruthy();
  expect(screen.getByLabelText('Push: 8 set')).toBeTruthy();
  expect(screen.getByText('+2')).toBeTruthy();
  expect(screen.getByText('−2')).toBeTruthy();
  expect(screen.queryByText('+0')).toBeNull();
  expect(screen.getByRole('button', { name: 'Sonraki hafta' }).props.accessibilityState).toMatchObject({ disabled: true });
});

test('onceki haftaya gecince o haftanin setleri gorunur', async () => {
  await render(<KasGrubuKarti haftalar={HAFTALAR} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Önceki hafta' }));

  expect(screen.queryByText('Bu hafta')).toBeNull();
  expect(screen.getByLabelText('Push: 6 set')).toBeTruthy();
});

/** Setsiz hafta: dort sifir cubuk degil tek bir aciklama. */
test('setsiz haftada antrenman yok yazar', async () => {
  await render(<KasGrubuKarti haftalar={HAFTALAR} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Önceki hafta' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Önceki hafta' }));

  expect(screen.getByText('Bu haftada antrenman yok.')).toBeTruthy();
  expect(screen.queryByLabelText('Push: 0 set')).toBeNull();
  expect(screen.getByRole('button', { name: 'Önceki hafta' }).props.accessibilityState).toMatchObject({ disabled: true });
});
```

`mobile/src/components/HaftalikHacimKarti.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import type { HaftalikIstatistik } from '@grind/shared/api/queries';
import HaftalikHacimKarti from './HaftalikHacimKarti';

function hafta(weekStart: string, volume: number): HaftalikIstatistik {
  return { weekStart, volume, pushSets: 0, pullSets: 0, legsSets: 0, otherSets: 0 };
}

/** Devam eden hafta (son satir, 50 kg) "Su anki" olmaz: son tamamlanmis hafta (5.000) olur. */
test('su anki hacim son tamamlanmis haftadir', async () => {
  await render(<HaftalikHacimKarti haftalar={[hafta('2026-02-23', 4000), hafta('2026-03-02', 5000), hafta('2026-03-09', 50)]} />);

  expect(screen.getByText('5.000')).toBeTruthy();
  expect(screen.getByText('+1.000')).toBeTruthy();
});

test('tamamlanmis hafta yoksa grafik yerine aciklama', async () => {
  await render(<HaftalikHacimKarti haftalar={[hafta('2026-03-09', 50)]} />);

  expect(screen.getByText('İlk haftan bitince haftalık hacmin burada görünür.')).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest src/components/KasGrubuKarti.test.tsx src/components/HaftalikHacimKarti.test.tsx`
Expected: FAIL — modüller yok.

- [ ] **Step 3: Write minimal implementation**

`mobile/src/components/KasGrubuKarti.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useDil } from '@grind/shared/i18n';
import type { HaftalikIstatistik } from '@grind/shared/api/queries';
import { formatAralik } from '@grind/shared/lib/format';
import { kasGrubuSatirlari } from '@grind/shared/lib/haftalikIlerleme';
import CamKart from '../ui/CamKart';
import { useIkonRenk } from '../ui/renkler';

/** "YYYY-MM-DD" + n gun, ayni bicimde (UTC ogleni: saat dilimi gunu kaydirmasin). */
function gunEkle(iso: string, gun: number): string {
  const tarih = new Date(`${iso}T12:00:00Z`);
  tarih.setUTCDate(tarih.getUTCDate() + gun);
  return tarih.toISOString().slice(0, 10);
}

/**
 * #184: secili haftanin kas grubuna gore set dagilimi (spec Karar 4). Varsayilan bu hafta (sunucunun son
 * satiri); oklarla ilk haftaya kadar geri gidilir. Cubuk uzunlugu o haftanin en yuksek grubuna oranli,
 * yaninda onceki haftaya fark (esitse yazilmaz). Setsiz haftada tek aciklama.
 */
export default function KasGrubuKarti({ haftalar }: { haftalar: readonly HaftalikIstatistik[] }) {
  const { t } = useTranslation();
  const dil = useDil();
  const ikonRenk = useIkonRenk();
  const sonSira = haftalar.length - 1;
  const [sira, setSira] = useState(sonSira);
  const hafta = haftalar[sira];
  const satirlar = kasGrubuSatirlari(haftalar, sira);
  const enCok = Math.max(...satirlar.map((s) => s.set));
  const baslik =
    sira === sonSira
      ? t('ilerleme.buHafta')
      : formatAralik(`${hafta.weekStart}T12:00:00Z`, `${gunEkle(hafta.weekStart, 6)}T12:00:00Z`, dil);

  return (
    <CamKart className="flex-col gap-3 p-4">
      <Text className="text-label text-muted uppercase">{t('ilerleme.kasGrubuBaslik')}</Text>
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ilerleme.oncekiHafta')}
          accessibilityState={{ disabled: sira === 0 }}
          disabled={sira === 0}
          onPress={() => setSira(sira - 1)}
          className={`size-11 items-center justify-center ${sira === 0 ? 'opacity-40' : ''}`}
        >
          <ChevronLeft color={ikonRenk.fg} size={20} />
        </Pressable>
        <Text className="text-body text-fg">{baslik}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ilerleme.sonrakiHafta')}
          accessibilityState={{ disabled: sira === sonSira }}
          disabled={sira === sonSira}
          onPress={() => setSira(sira + 1)}
          className={`size-11 items-center justify-center ${sira === sonSira ? 'opacity-40' : ''}`}
        >
          <ChevronRight color={ikonRenk.fg} size={20} />
        </Pressable>
      </View>
      {enCok === 0 ? (
        <Text className="text-body text-muted">{t('ilerleme.haftadaAntrenmanYok')}</Text>
      ) : (
        satirlar.map(({ kategori, set, fark }) => (
          <View
            key={kategori}
            accessible
            accessibilityLabel={t('ilerleme.kasGrubuSatiri', { grup: t(`antrenman.kategori.${kategori}`), count: set })}
            className="flex-row items-center gap-3"
          >
            <Text className="w-14 text-label text-muted">{t(`antrenman.kategori.${kategori}`)}</Text>
            <View className="h-3 flex-1 overflow-hidden rounded-full bg-surface-3">
              <View className="h-full rounded-full bg-accent" style={{ width: `${(set / enCok) * 100}%` }} />
            </View>
            <Text className="w-8 text-right text-body text-fg">{set}</Text>
            <Text className="w-8 text-right text-label-xs text-muted">
              {fark === null || fark === 0 ? '' : fark > 0 ? `+${fark}` : `−${Math.abs(fark)}`}
            </Text>
          </View>
        ))
      )}
    </CamKart>
  );
}
```

`mobile/src/components/HaftalikHacimKarti.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import type { HaftalikIstatistik } from '@grind/shared/api/queries';
import { formatAralik, formatFark, formatKisaTarih, formatWeight } from '@grind/shared/lib/format';
import { hacimHaftalari, type HacimAraligi } from '@grind/shared/lib/haftalikIlerleme';
import CamKart from '../ui/CamKart';
import CizgiGrafik from '../ui/CizgiGrafik';

const ARALIKLAR = [
  { anahtar: '1a' as HacimAraligi, etiket: 'hareketGecmisi.aralikBirAy' },
  { anahtar: '3a' as HacimAraligi, etiket: 'hareketGecmisi.aralikUcAy' },
  { anahtar: 'tum' as HacimAraligi, etiket: 'hareketGecmisi.aralikTum' },
] as const;

/**
 * #184: tamamlanmis haftalarin toplam hacmi (spec Karar 3). Hareket grafigiyle ayni dil: ustte
 * "Su anki / Fark", altinda cizgi, en altta aralik secici. Devam eden hafta cizilmez.
 */
export default function HaftalikHacimKarti({ haftalar }: { haftalar: readonly HaftalikIstatistik[] }) {
  const { t } = useTranslation();
  const dil = useDil();
  const [aralik, setAralik] = useState<HacimAraligi>('3a');
  const cizilecekler = hacimHaftalari(haftalar, aralik);
  const ilk = cizilecekler[0];
  const son = cizilecekler[cizilecekler.length - 1];

  return (
    <CamKart className="flex-col gap-3 p-4">
      <Text className="text-label text-muted uppercase">{t('ilerleme.hacimBaslik')}</Text>
      {cizilecekler.length === 0 ? (
        <Text className="text-body text-muted">{t('ilerleme.tamamlanmisHaftaYok')}</Text>
      ) : (
        <>
          <View className="flex-row gap-8">
            <View className="flex-col gap-1">
              <Text className="text-label text-muted">{t('hareketGecmisi.suAnki')}</Text>
              <Text className="text-metric text-fg">{formatWeight(son.volume, dil)}</Text>
            </View>
            {cizilecekler.length > 1 && (
              <View className="flex-col gap-1">
                <Text className="text-label text-muted">{t('hareketGecmisi.fark')}</Text>
                <Text className="text-metric text-fg">{formatFark(son.volume - ilk.volume, dil)}</Text>
              </View>
            )}
          </View>
          <Text className="text-label text-muted">
            {formatAralik(`${ilk.weekStart}T12:00:00Z`, `${son.weekStart}T12:00:00Z`, dil)}
          </Text>
          <CizgiGrafik
            noktalar={cizilecekler.map((hafta) => ({
              etiket: formatKisaTarih(`${hafta.weekStart}T12:00:00Z`, dil),
              deger: hafta.volume,
            }))}
            birim="kg"
            baslik={t('hareketGecmisi.grafikBasligi', {
              ad: t('ilerleme.hacimBaslik'),
              ozet: t('ilerleme.hacimOzet'),
              count: cizilecekler.length,
            })}
          />
        </>
      )}
      <View className="flex-row gap-1 rounded-lg bg-surface-2 p-1">
        {ARALIKLAR.map((aday) => {
          const secili = aday.anahtar === aralik;
          return (
            <Pressable
              key={aday.anahtar}
              accessibilityRole="button"
              accessibilityState={{ selected: secili }}
              onPress={() => setAralik(aday.anahtar)}
              className={`min-h-11 flex-1 items-center justify-center rounded-md ${secili ? 'bg-surface-4' : ''}`}
            >
              <Text className={`text-label ${secili ? 'text-fg' : 'text-muted'}`}>{t(aday.etiket)}</Text>
            </Pressable>
          );
        })}
      </View>
    </CamKart>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest src/components/KasGrubuKarti.test.tsx src/components/HaftalikHacimKarti.test.tsx && npm run typecheck --workspace mobile`
Expected: 5 passed; tip kontrolü temiz.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/KasGrubuKarti.tsx mobile/src/components/KasGrubuKarti.test.tsx \
  mobile/src/components/HaftalikHacimKarti.tsx mobile/src/components/HaftalikHacimKarti.test.tsx
git commit -F <mesaj: "feat: haftalik hacim ve kas grubu kartlari (#184)">
```

---

### Task 5: Mobil — tahmini 1RM kartı

**Files:**
- Modify: `mobile/src/components/HareketGecmisi.tsx` (`HareketGrafigi` dışa açılır, `sabitSekme` prop'u)
- Create: `mobile/src/components/BirTekrarKarti.tsx`
- Test: `mobile/src/components/BirTekrarKarti.test.tsx`

**Interfaces:**
- Consumes: Task 3'teki `useVolumeByExercise`, `varsayilanBirTekrarHareketi`; mevcut `useExercises`, `HareketSecici` (`mobile/src/ui/HareketSecici.tsx`: props `id`, `egzersizler`, `secilenId`, `secilenAd`, `onSec`, `otomatikOdak?`, `onKapat?`).
- Produces: `export function HareketGrafigi({ exerciseId, exerciseName, sabitSekme }: { exerciseId: number; exerciseName: string; sabitSekme?: 'birTekrar' })`; `export default function BirTekrarKarti()`.

- [ ] **Step 1: Write the failing test** — `mobile/src/components/BirTekrarKarti.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { request } from '@grind/shared/api/client';
import BirTekrarKarti from './BirTekrarKarti';

jest.mock('@grind/shared/api/client', () => {
  const actual = jest.requireActual('@grind/shared/api/client');
  return { ...actual, request: jest.fn() };
});

const requestMock = request as jest.Mock;

function kur(egzersizler: unknown[], hacimler: unknown[]) {
  requestMock.mockImplementation(async (path: string) => {
    if (path === '/exercises') return egzersizler;
    if (path.startsWith('/stats/volume/by-exercise')) return { from: null, to: null, totalVolume: 0, items: hacimler };
    if (path.startsWith('/stats/exercises/')) return { exerciseId: 1, exerciseName: 'x', points: [] };
    throw new Error(`beklenmeyen istek ${path}`);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BirTekrarKarti />
    </QueryClientProvider>,
  );
}

const BENCH = { id: 1, name: 'Bench Press', category: 'Push', measurement: 'WeightReps', isArchived: false, isGlobal: true, media: [] };
const CRUNCH = { id: 160, name: 'Crunch', category: 'Other', measurement: 'Reps', isArchived: false, isGlobal: true, media: [] };

/** #184: acilista en cok set atilan KILOLU hareket secili gelir -- daha cok set atilan crunch degil. */
test('varsayilan hareket en cok set atilan kilolu harekettir', async () => {
  await kur(
    [BENCH, CRUNCH],
    [
      { exerciseId: 160, exerciseName: 'Crunch', volume: 0, setCount: 40 },
      { exerciseId: 1, exerciseName: 'Bench Press', volume: 5000, setCount: 12 },
    ],
  );

  expect(await screen.findByRole('button', { name: 'Hareketi değiştir: Bench Press' })).toBeTruthy();
});

test('kilolu hareket yoksa aciklama gorunur', async () => {
  await kur([CRUNCH], [{ exerciseId: 160, exerciseName: 'Crunch', volume: 0, setCount: 40 }]);

  expect(await screen.findByText('Tahmini 1RM için kilolu bir hareket kaydet.')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest src/components/BirTekrarKarti.test.tsx`
Expected: FAIL — modül yok.

- [ ] **Step 3: Write minimal implementation**

`HareketGecmisi.tsx` — `function HareketGrafigi({ exerciseId, exerciseName }: Props)` satırını ve ilk state satırını değiştir:

```tsx
/**
 * #184: `sabitSekme` verilirse sekme satiri cizilmez ve grafik yalnizca o sekmeyi gosterir (Ilerleme
 * sekmesindeki 1RM karti).
 */
export function HareketGrafigi({
  exerciseId,
  exerciseName,
  sabitSekme,
}: Props & { sabitSekme?: 'birTekrar' }) {
```

ve

```tsx
  const [sekmeAnahtari, setSekmeAnahtari] = useState<SekmeAnahtari>(sabitSekme ?? 'agirlik');
```

Sekme satırını saran `<View className="flex-row border-b border-surface-3">…</View>` bloğunu `{!sabitSekme && ( … )}` içine al.

`mobile/src/components/BirTekrarKarti.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react-native';
import { useExercises, useVolumeByExercise } from '@grind/shared/api/queries';
import { varsayilanBirTekrarHareketi } from '@grind/shared/lib/haftalikIlerleme';
import CamKart from '../ui/CamKart';
import HareketSecici from '../ui/HareketSecici';
import { useIkonRenk } from '../ui/renkler';
import { HareketGrafigi } from './HareketGecmisi';

/** Varsayilan hareketin bakildigi pencere (spec Karar 5). */
const VARSAYILAN_PENCERE_GUN = 90;

/** "YYYY-MM-DD", TR gunu; bugun - n gun. */
function gunlerOnce(gun: number): string {
  const tarih = new Date(Date.now() - gun * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(tarih);
}

/**
 * #184: secilen hareketin tahmini 1RM trendi (spec Karar 5). Acilista son 90 gunde en cok set atilan kilolu
 * hareket; basliga dokununca yalnizca kilolu hareketleri listeleyen secici acilir. Grafik hareket kartindaki
 * 1RM grafiginin kendisidir (`HareketGrafigi`, antrenman basina nokta).
 */
export default function BirTekrarKarti() {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const [pencereBasi] = useState(() => gunlerOnce(VARSAYILAN_PENCERE_GUN));
  const { data: egzersizler } = useExercises();
  const { data: hacimler } = useVolumeByExercise(pencereBasi);
  const [secilenId, setSecilenId] = useState<number | null>(null);
  const [seciyor, setSeciyor] = useState(false);

  const kilolular = (egzersizler ?? []).filter((e) => (e.measurement ?? 'WeightReps') === 'WeightReps');
  const varsayilan = egzersizler && hacimler ? varsayilanBirTekrarHareketi(hacimler, egzersizler) : null;
  const hareketId = secilenId ?? varsayilan;
  const hareket = kilolular.find((e) => e.id === hareketId);
  const yuklendi = egzersizler !== undefined && hacimler !== undefined;

  return (
    <CamKart className="flex-col gap-3 p-4">
      <Text className="text-label text-muted uppercase">{t('ilerleme.birTekrarBaslik')}</Text>
      {!yuklendi ? (
        <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>
      ) : !hareket ? (
        <Text className="text-body text-muted">{t('ilerleme.kiloluHareketYok')}</Text>
      ) : (
        <>
          {seciyor ? (
            <HareketSecici
              id="bir-tekrar-hareketi"
              egzersizler={kilolular}
              secilenId={hareket.id}
              secilenAd={hareket.name}
              otomatikOdak
              onSec={(id) => {
                setSecilenId(id);
                setSeciyor(false);
              }}
              onKapat={() => setSeciyor(false)}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('ilerleme.hareketDegistir')}: ${hareket.name}`}
              onPress={() => setSeciyor(true)}
              className="min-h-11 flex-row items-center justify-between gap-2"
            >
              <Text numberOfLines={1} className="flex-1 text-heading text-fg">
                {hareket.name}
              </Text>
              <ChevronDown color={ikonRenk.muted} size={18} />
            </Pressable>
          )}
          <View>
            <HareketGrafigi exerciseId={hareket.id} exerciseName={hareket.name} sabitSekme="birTekrar" />
          </View>
        </>
      )}
    </CamKart>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest src/components/BirTekrarKarti.test.tsx src/components/HareketKartiGovdesi.test.tsx && npm run typecheck --workspace mobile`
Expected: yeni 2 test geçer; hareket kartı testleri (sekmeli grafik) değişmeden geçer; tip kontrolü temiz.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/HareketGecmisi.tsx mobile/src/components/BirTekrarKarti.tsx mobile/src/components/BirTekrarKarti.test.tsx
git commit -F <mesaj: "feat: ilerleme sekmesinde tahmini 1RM karti (#184)">
```

---

### Task 6: Mobil — İlerleme ekranı ve profil sekmesi

**Files:**
- Create: `mobile/app/(tabs)/profile/progress.tsx`
- Modify: `mobile/app/(tabs)/profile/_layout.tsx` (`SEKMELER`)
- Modify: `mobile/src/components/ProfilSekmeleri.tsx` (`etiketAnahtari` birleşimi)
- Modify: `CLAUDE.md` (kapsam listesi)
- Test: `mobile/__tests__/e2e/ilerleme.test.tsx`

**Interfaces:**
- Consumes: Task 3 `useWeeklyStats`; Task 4 `HaftalikHacimKarti`, `KasGrubuKarti`; Task 5 `BirTekrarKarti`; mevcut `HataKutusu`, `BosDurum`, `useAltMenuPayi`, `usePageTitle`.
- Produces: rota `/profile/progress`.

- [ ] **Step 1: Write the failing test** — `mobile/__tests__/e2e/ilerleme.test.tsx`:

```tsx
import { screen, fireEvent } from '@testing-library/react-native';
import { request } from '@grind/shared/api/client';
import { session } from '../../src/session';
import { sahteBackendOlustur } from '../../src/testUtils/sahteBackend';
import { renderRouterAsync } from '../../src/testUtils/renderRouterAsync';

jest.mock('@grind/shared/api/client', () => {
  const actual = jest.requireActual('@grind/shared/api/client');
  return { ...actual, request: jest.fn() };
});

const requestMock = request as jest.Mock;

const PROFIL = {
  username: 'efeypgn', displayName: 'Efe Yapağan', birthDate: null, age: null,
  hasAvatar: false, avatarVersion: null, privacyLevel: 'Kisitli',
};

function kur(haftalar: unknown[]) {
  const { sahteRequest } = sahteBackendOlustur();
  requestMock.mockImplementation(async (path: string, init: RequestInit = {}) => {
    if (path === '/profile') return PROFIL;
    if (path === '/users/efeypgn/profile') {
      return {
        username: 'efeypgn', displayName: 'Efe Yapağan', age: null, hasAvatar: false, avatarVersion: null,
        friendCount: 0, followerCount: 0, followingCount: 0, relation: 'Self', privacyLevel: 'Kisitli',
      };
    }
    if (path === '/stats/weekly') return { weeks: haftalar };
    if (path.startsWith('/stats/volume/by-exercise')) return { from: null, to: null, totalVolume: 0, items: [] };
    return sahteRequest(path, init as never);
  });
}

beforeEach(async () => {
  await session.write('tok', new Date(Date.now() + 60_000).toISOString(), 'efeypgn');
});

test('profildeki Ilerleme sekmesi uc karti acar', async () => {
  kur([
    { weekStart: '2026-03-02', volume: 5000, pushSets: 6, pullSets: 4, legsSets: 3, otherSets: 1 },
    { weekStart: '2026-03-09', volume: 50, pushSets: 8, pullSets: 4, legsSets: 1, otherSets: 0 },
  ]);
  await renderRouterAsync('./app', { initialUrl: '/profile' });

  await fireEvent.press(await screen.findByLabelText('İlerleme'));

  expect(await screen.findByText('Haftalık hacim')).toBeTruthy();
  expect(screen.getByText('Kas grubuna göre setler')).toBeTruthy();
  expect(screen.getByText('Tahmini 1RM')).toBeTruthy();
}, 20_000);

test('hic set yoksa kartlar yerine bos durum', async () => {
  kur([]);
  await renderRouterAsync('./app', { initialUrl: '/profile/progress' });

  expect(await screen.findByText('Antrenman kaydettikçe ilerlemen burada görünür.')).toBeTruthy();
  expect(screen.queryByText('Haftalık hacim')).toBeNull();
}, 20_000);
```

(Sekme düğmesinin erişilebilir adı etiketin kendisidir: `SekmeDugmesi` ikonlu sekmede `accessibilityLabel`'ı metinden verir.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest __tests__/e2e/ilerleme.test.tsx`
Expected: FAIL — "İlerleme" sekmesi / `/profile/progress` rotası yok.

- [ ] **Step 3: Write minimal implementation**

`ProfilSekmeleri.tsx`: `etiketAnahtari` birleşimine `| 'kabuk.sekmeIlerleme'` ekle.

`profile/_layout.tsx`: import'a `TrendingUp` ekle ve `SEKMELER`'e Ölçüler'den sonra:

```tsx
  // #184: yalnizca kendi profilinde; arkadas profilinin sekmeleri ayri (`u/[username]/_layout`).
  { to: '/profile/progress', etiketAnahtari: 'kabuk.sekmeIlerleme', ikon: TrendingUp },
```

`mobile/app/(tabs)/profile/progress.tsx`:

```tsx
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react-native';
import { useWeeklyStats } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import HataKutusu from '../../../src/ui/HataKutusu';
import BosDurum from '../../../src/ui/BosDurum';
import { useAltMenuPayi } from '../../../src/ui/KabukTabBar';
import HaftalikHacimKarti from '../../../src/components/HaftalikHacimKarti';
import KasGrubuKarti from '../../../src/components/KasGrubuKarti';
import BirTekrarKarti from '../../../src/components/BirTekrarKarti';

/**
 * #184: asamali yuklenme analizi -- haftalik hacim, kas grubuna gore setler, tahmini 1RM. Veri tek istekte
 * (`/stats/weekly`); hic seti olmayan kullaniciya kartlar yerine tek bir bos durum.
 */
export default function ProgressScreen() {
  const { t } = useTranslation();
  const altMenuPayi = useAltMenuPayi();
  usePageTitle(t('kabuk.sekmeIlerleme'));
  const { data: haftalar, isLoading, isError } = useWeeklyStats();

  if (isLoading) {
    return <Text className="px-4 text-body text-muted">{t('ortak.yukleniyor')}</Text>;
  }
  if (isError || !haftalar) {
    return (
      <View className="px-4">
        <HataKutusu baslik={t('ilerleme.hataBaslik')} mesaj={t('ilerleme.hataMesaj')} />
      </View>
    );
  }
  if (haftalar.length === 0) {
    return <BosDurum ikon={TrendingUp} baslik={t('ilerleme.bos')} />;
  }

  return (
    // Rekorlar sekmesiyle ayni kaydirma kabi (`records.tsx`).
    <ScrollView contentContainerClassName="gap-5 px-4 pt-2" contentContainerStyle={{ paddingBottom: altMenuPayi }}>
      <HaftalikHacimKarti haftalar={haftalar} />
      <KasGrubuKarti haftalar={haftalar} />
      <BirTekrarKarti />
    </ScrollView>
  );
}
```

`CLAUDE.md` "Kapsam ve Sıra" listesine, son madde olarak:

```md
- **İlerleme sekmesi (2026-10-01, #184)** — yalnızca mobil, kendi profilinde: haftalık hacim (yalnızca
  tamamlanmış haftalar, boş hafta 0), kas grubuna göre haftalık setler (varsayılan bu hafta, geçen haftaya
  fark) ve seçilen kilolu hareketin tahmini 1RM'i (varsayılan son 90 günde en çok set atılan). Veri
  `GET /api/stats/weekly` (hafta başına bir satır, `WeeklyStatsCalculator`) ve mevcut `.../progress`. Ayrıntı:
  [docs/superpowers/specs/2026-09-30-asamali-yuklenme-design.md](docs/superpowers/specs/2026-09-30-asamali-yuklenme-design.md).
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run typecheck --workspace mobile && npm run test --workspace mobile`
Expected: tip kontrolü temiz; yeni e2e 2 test ve `cevrilmemisMetin.test.ts` dahil tüm suite geçer.

- [ ] **Step 5: Commit**

```bash
git add "mobile/app/(tabs)/profile" mobile/src/components/ProfilSekmeleri.tsx mobile/__tests__/e2e/ilerleme.test.tsx CLAUDE.md
git commit -F <mesaj: "feat: profilde Ilerleme sekmesi (#184)">
```

---

### Task 7: Tüm doğrulama ve PR akışı

- [ ] **Step 1:** Backend: `dotnet build -c Release`, drift kontrolü, `dotnet test` (tümü). Shared ve mobil: tip kontrolü + testler (tümü).
- [ ] **Step 2:** `git-flow/SKILL.md` adım 4–6: `dev` PR'ı (`Refs #184`, test planında komutla sayılmış sonuçlar), CI yeşilse merge; aynı branch'ten master PR'ı (`Closes #184`); geri-merge ve `merge-base --is-ancestor` → `OK`.
