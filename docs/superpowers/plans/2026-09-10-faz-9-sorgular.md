# Faz 9 — Sorgular Uygulama Planı (Geçmiş, Hacim, Takvim/Seri)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcı antrenman geçmişini tarih aralığı ve egzersize göre sayfalı sorgulayabilsin;
hacmini gün ve egzersiz bazında görebilsin; hangi günlerde antrenman yaptığını ve serisini (streak)
okuyabilsin — hepsi mevcut satırlardan, yeni tablo açılmadan.

**Architecture:** Gün sınırı politikası tek bir yerde (`TurkeyDay`) yaşamaya devam eder; SQL yalnızca
**toplama** yapar (oturum başına hacim/set sayısı, egzersiz başına hacim), TR gününe **gruplama**
serviste bellekte yapılır (spec Karar 6). Seri hesabı veritabanı bilmeyen saf bir sınıfa
(`StreakCalculator`) çıkarılır — `RecordTracker` ile aynı desen. İki yeni servis: `WorkoutHistoryService`
(geçmiş) ve `StatsService` (hacim + takvim). Hiçbiri yazma yapmaz: `IUnitOfWork` bağımlılığı yoktur.

**Tech Stack:** .NET 10, ASP.NET Core Web API, EF Core 10 (Npgsql), PostgreSQL 17 (Docker, host port
5433), xUnit.

**Spec:** `docs/superpowers/specs/2026-09-10-sorgular-design.md` (onaylandı 2026-09-10)

## Global Constraints

Her görevin gereksinimleri bu bölümü örtük olarak içerir.

- **Katman kuralı:** `DbContext`'e yalnızca `Repositories/` ve `Data/` dokunur. Controller iş
  mantığı içermez, `if`/`try` taşımaz — hata çevirisi `GlobalExceptionHandler`'da.
- **IDOR:** Her sorgu sahiplik yüklemini taşır — oturumda `s.UserId == userId`, sette
  `s.WorkoutSession.UserId == userId`. Başkasının kaydı → **404**, nötr mesajla (id söylenmez).
  `IRepository<T>.GetByIdAsync` sahiplik kontrolü YAPMAZ; kullanmak IDOR'dur.
- **Salt okuma:** Bu fazın hiçbir servisi `SaveChangesAsync` çağırmaz ve `IUnitOfWork` almaz.
- **Zaman:** `DateTime.UtcNow` doğrudan çağrılmaz — enjekte edilen `TimeProvider` kullanılır.
  "Bugün" TR yerel günüdür.
- **Gün sınırı (spec Karar 6 + 7):** TR gününe çevirme yalnızca `TurkeyDay` üzerinden yapılır; SQL'de
  `AT TIME ZONE` ile ikinci bir kopya YAZILMAZ. Bir setin günü, setin `CreatedAt`'i değil oturumun
  `StartedAt`'idir.
- **Antrenman günü (spec Karar 3):** en az bir seti olan oturumun günü. Seti olmayan oturum
  takvime, günlük hacme ve seriye GİRMEZ. Mevcut seri bugün antrenman yoksa KIRILMAZ (dünden geriye
  sayılır).
- **Tarih parametreleri:** `from`/`to` TR yerel günü (`DateOnly`), **iki ucu da dahil**, ikisi de
  opsiyonel. `from > to` → 400.
- **Sayfalama:** `page` (varsayılan 1, min 1), `pageSize` (varsayılan 20, 1-100). Yanıt zarfı
  `PagedResponse<T>`.
- **Filtre toplamları (spec Karar 8):** `exerciseId` verildiğinde oturumun `TotalVolume`/`SetCount`
  değerleri yalnızca o egzersizin setlerini kapsar ve dönen `Sets` ile birebir tutarlıdır.
- **Migration YOK:** Bu faz hiçbir şema değişikliği içermez. `dotnet ef migrations add` ÇAĞRILMAZ.
- **Test:** Veritabanı isteyen testler `[Trait("Category", "Database")]` taşır ve transaction +
  rollback deseniyle yazılır. Test adları Türkçe, mevcut dosyalardaki gibi.
- **Commit mesajları** Türkçe, `feat(...)`/`test(...)`/`fix(...)` önekiyle, ASCII (aksansız).

---

## Dosya Haritası

**Yeni:**
- `src/Grind.Api/Common/Time/StreakCalculator.cs`
- `src/Grind.Api/Common/Time/LocalDayRange.cs`
- `src/Grind.Api/Models/Projections/SessionAggregate.cs`
- `src/Grind.Api/Models/Projections/ExerciseVolume.cs`
- `src/Grind.Api/Models/Dtos/Common/PagedResponse.cs`
- `src/Grind.Api/Models/Dtos/History/HistoryQuery.cs`
- `src/Grind.Api/Models/Dtos/History/HistorySessionResponse.cs`
- `src/Grind.Api/Models/Dtos/Stats/StatsRangeQuery.cs`
- `src/Grind.Api/Models/Dtos/Stats/VolumeSummaryResponse.cs`
- `src/Grind.Api/Models/Dtos/Stats/DailyVolumeResponse.cs`
- `src/Grind.Api/Models/Dtos/Stats/ExerciseVolumeResponse.cs`
- `src/Grind.Api/Models/Dtos/Stats/CalendarResponse.cs`
- `src/Grind.Api/Models/Dtos/Stats/CalendarDayResponse.cs`
- `src/Grind.Api/Services/IWorkoutHistoryService.cs` / `WorkoutHistoryService.cs`
- `src/Grind.Api/Services/IStatsService.cs` / `StatsService.cs`
- `src/Grind.Api/Controllers/HistoryController.cs`
- `src/Grind.Api/Controllers/StatsController.cs`
- `tests/Grind.Tests/Common/StreakCalculatorTests.cs`
- `tests/Grind.Tests/Common/LocalDayRangeTests.cs`
- `tests/Grind.Tests/Services/WorkoutHistoryServiceTests.cs`
- `tests/Grind.Tests/Services/StatsServiceTests.cs`
- `tests/Grind.Tests/Integration/QueryEndpointsTests.cs`

**Değişen:**
- `src/Grind.Api/Common/Time/TurkeyDay.cs` (+2 metot)
- `src/Grind.Api/Repositories/IWorkoutSessionRepository.cs` / `WorkoutSessionRepository.cs` (+3 metot)
- `src/Grind.Api/Repositories/ISetEntryRepository.cs` / `SetEntryRepository.cs` (+2 metot)
- `src/Grind.Api/Services/DependencyInjection.cs` (+2 kayıt)
- `tests/Grind.Tests/Common/TurkeyDayTests.cs` (mevcut dosyaya ekle)
- `tests/Grind.Tests/Repositories/WorkoutSessionRepositoryTests.cs` (mevcut dosyaya ekle)
- `tests/Grind.Tests/Repositories/SetEntryRepositoryTests.cs` (mevcut dosyaya ekle)
- `PLAN.md` (Faz 9 kutuları + devreden notlar)

**Beklenen test sayısı:** 384 → **455** (+71). Görev bazında: 11, 9, 9, 7, 11, 11, 13.
xUnit her `[InlineData]`'yı ayrı test sayar — Görev 7'deki 401 `[Theory]`'si 4 InlineData
taşıyor (4 test) + 9 `[Fact]` = 13. (Sayılar planın içindeki test işaretleri sayılarak
doğrulandı, elle hesaplanmadı.)

---

## Görev 1: `TurkeyDay` eklemeleri + `LocalDayRange`

**Files:**
- Modify: `src/Grind.Api/Common/Time/TurkeyDay.cs`
- Create: `src/Grind.Api/Common/Time/LocalDayRange.cs`
- Test: `tests/Grind.Tests/Common/TurkeyDayTests.cs` (mevcut dosyaya ekle)
- Test: `tests/Grind.Tests/Common/LocalDayRangeTests.cs`

**Interfaces:**
- Produces:
  - `TurkeyDay.RangeForLocalDate(DateOnly localDate)` → `(DateTime FromUtcInclusive, DateTime ToUtcExclusive)`
  - `TurkeyDay.LocalDateOf(DateTime utcInstant)` → `DateOnly`
  - `LocalDayRange.Resolve(DateOnly? from, DateOnly? to)` → `(DateTime? FromUtcInclusive, DateTime? ToUtcExclusive)`

Bu görev veritabanına DOKUNMAZ. Fazın tamamı bu iki dönüşümün doğruluğuna yaslanıyor; testleri saf
birim testi (`[Trait]` yok).

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Common/TurkeyDayTests.cs` dosyasının SONUNA, sınıfın içine ekle. (Mevcut testlere
dokunma; `using Grind.Api.Common.Time;` dosyanın başında zaten var.)

```csharp
    // ---- Faz 9 eklemeleri ----

    /// <summary>
    /// TR gece yarısı UTC 21:00'dir. Bir TR gününün UTC aralığı bu yüzden önceki günün 21:00'inde
    /// başlar — aralığı yanlış kurmak, gece geç saatteki antrenmanı komşu güne düşürür.
    /// </summary>
    [Fact]
    public void RangeForLocalDate_gunun_UTC_araligini_verir()
    {
        var (from, to) = TurkeyDay.RangeForLocalDate(new DateOnly(2026, 3, 10));

        Assert.Equal(new DateTime(2026, 3, 9, 21, 0, 0, DateTimeKind.Utc), from);
        Assert.Equal(new DateTime(2026, 3, 10, 21, 0, 0, DateTimeKind.Utc), to);
    }

    [Fact]
    public void RangeForLocalDate_UTC_Kind_dondurur()
    {
        var (from, to) = TurkeyDay.RangeForLocalDate(new DateOnly(2026, 3, 10));

        // Kind yanlışsa karşılaştırmalar sessizce kayar: Npgsql UTC bekliyor.
        Assert.Equal(DateTimeKind.Utc, from.Kind);
        Assert.Equal(DateTimeKind.Utc, to.Kind);
    }

    [Fact]
    public void LocalDateOf_gun_sinirinin_altinda_ayni_gunu_verir()
    {
        // TR 23:59:59 = UTC 20:59:59 — hâlâ aynı TR günü.
        Assert.Equal(
            new DateOnly(2026, 3, 10),
            TurkeyDay.LocalDateOf(new DateTime(2026, 3, 10, 20, 59, 59, DateTimeKind.Utc)));
    }

    /// <summary>
    /// UTC 21:00 TR'de ertesi gün 00:00'dır. Bu testin kırmızıya dönmesi, takvimin ve günlük
    /// hacmin geç saatteki antrenmanları yanlış güne yazmaya başladığı anlamına gelir.
    /// </summary>
    [Fact]
    public void LocalDateOf_gun_sinirinda_ertesi_gune_gecer()
    {
        Assert.Equal(
            new DateOnly(2026, 3, 11),
            TurkeyDay.LocalDateOf(new DateTime(2026, 3, 10, 21, 0, 0, DateTimeKind.Utc)));
    }

    [Fact]
    public void LocalDateOf_yerel_Kind_reddeder()
    {
        var yerel = DateTime.SpecifyKind(new DateTime(2026, 3, 10, 20, 0, 0), DateTimeKind.Local);

        Assert.Throws<ArgumentException>(() => TurkeyDay.LocalDateOf(yerel));
    }

    /// <summary>
    /// İki metot birbirinin tersi olmalı: bir günün aralığının başlangıcı, yine o güne düşer.
    /// Biri değişip diğeri değişmezse takvim ile hacim farklı günler raporlamaya başlar.
    /// </summary>
    [Fact]
    public void RangeForLocalDate_ile_LocalDateOf_birbirini_tersler()
    {
        var gun = new DateOnly(2026, 7, 15);

        var (from, to) = TurkeyDay.RangeForLocalDate(gun);

        Assert.Equal(gun, TurkeyDay.LocalDateOf(from));
        Assert.Equal(gun, TurkeyDay.LocalDateOf(to.AddTicks(-1)));
        Assert.Equal(gun.AddDays(1), TurkeyDay.LocalDateOf(to));
    }
```

`tests/Grind.Tests/Common/LocalDayRangeTests.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Time;

namespace Grind.Tests.Common;

/// <summary>
/// Sorgu parametrelerinin (TR yerel günü, iki ucu dahil) UTC aralığına çevrilmesi.
/// Bitiş gününün DAHİL olması kritik: hariç olsaydı "1-31 Mart" sorgusu 31 Mart'ı kaçırırdı.
/// </summary>
public class LocalDayRangeTests
{
    [Fact]
    public void Bos_aralik_sinirsizdir()
    {
        var (from, to) = LocalDayRange.Resolve(null, null);

        Assert.Null(from);
        Assert.Null(to);
    }

    [Fact]
    public void Baslangic_gunun_basina_cevrilir()
    {
        var (from, _) = LocalDayRange.Resolve(new DateOnly(2026, 3, 10), null);

        Assert.Equal(new DateTime(2026, 3, 9, 21, 0, 0, DateTimeKind.Utc), from);
    }

    /// <summary>Bitiş günü DAHİL: sınır, o günün SONU (ertesi günün başı, hariç).</summary>
    [Fact]
    public void Bitis_gunu_araliga_dahildir()
    {
        var (_, to) = LocalDayRange.Resolve(null, new DateOnly(2026, 3, 10));

        Assert.Equal(new DateTime(2026, 3, 10, 21, 0, 0, DateTimeKind.Utc), to);
    }

    [Fact]
    public void Tek_gunluk_aralik_yirmi_dort_saattir()
    {
        var (from, to) = LocalDayRange.Resolve(new DateOnly(2026, 3, 10), new DateOnly(2026, 3, 10));

        Assert.Equal(TimeSpan.FromHours(24), to!.Value - from!.Value);
    }

    [Fact]
    public void Ters_aralik_reddedilir()
    {
        Assert.Throws<ValidationException>(
            () => LocalDayRange.Resolve(new DateOnly(2026, 3, 10), new DateOnly(2026, 3, 1)));
    }
}
```

- [ ] **Adım 2: Testlerin derlenmediğini gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~TurkeyDayTests|FullyQualifiedName~LocalDayRangeTests"`
Beklenen: derleme hatası — `RangeForLocalDate`, `LocalDateOf` ve `LocalDayRange` yok.

- [ ] **Adım 3: `TurkeyDay`'e iki metot ekle**

`src/Grind.Api/Common/Time/TurkeyDay.cs` — mevcut `RangeFor`'un ALTINA ekle (mevcut kodu değiştirme):

```csharp
    /// <summary>
    /// Verilen TR yerel gününün UTC aralığı: gün başlangıcı (dahil) ve ertesi gün başlangıcı
    /// (hariç). Sorgu parametreleri (<c>from</c>/<c>to</c>) bu metotla UTC'ye çevrilir.
    /// </summary>
    public static (DateTime FromUtcInclusive, DateTime ToUtcExclusive) RangeForLocalDate(
        DateOnly localDate)
    {
        var localDayStart = DateTime.SpecifyKind(
            localDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);

        return (
            TimeZoneInfo.ConvertTimeToUtc(localDayStart, Turkey),
            TimeZoneInfo.ConvertTimeToUtc(localDayStart.AddDays(1), Turkey));
    }

    /// <summary>
    /// <paramref name="utcInstant"/> anının düştüğü TR günü. Takvim ve günlük hacim gruplaması
    /// bunu kullanır — gruplamayı SQL'de <c>AT TIME ZONE</c> ile tekrar yazmak, gün sınırı
    /// kuralının ikinci bir kopyasını üretirdi (spec Karar 6).
    /// </summary>
    public static DateOnly LocalDateOf(DateTime utcInstant)
    {
        if (utcInstant.Kind == DateTimeKind.Local)
        {
            throw new ArgumentException(
                "TurkeyDay yalnızca UTC an kabul eder; yerel bir DateTime gün sınırını sessizce kaydırır.",
                nameof(utcInstant));
        }

        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(utcInstant, Turkey));
    }
```

- [ ] **Adım 4: `LocalDayRange`'i yaz**

`src/Grind.Api/Common/Time/LocalDayRange.cs`:

```csharp
using Grind.Api.Common.Exceptions;

namespace Grind.Api.Common.Time;

/// <summary>
/// Sorgu uçlarının ortak tarih aralığı çözümü. Geçmiş ve istatistik servisleri aynı kuralı
/// paylaşsın diye burada: aksi halde "bitiş günü dahil mi" sorusu her serviste yeniden
/// cevaplanır ve iki uç farklı aralıkları raporlar.
/// </summary>
public static class LocalDayRange
{
    /// <summary>
    /// TR yerel günlerinden UTC aralığı üretir: <paramref name="from"/> gününün başlangıcı (dahil)
    /// ile <paramref name="to"/> gününün SONU (ertesi günün başlangıcı, hariç). Null uçlar
    /// sınırsızdır.
    /// </summary>
    /// <exception cref="ValidationException"><paramref name="from"/> > <paramref name="to"/>.</exception>
    public static (DateTime? FromUtcInclusive, DateTime? ToUtcExclusive) Resolve(
        DateOnly? from, DateOnly? to)
    {
        if (from is { } start && to is { } end && start > end)
        {
            // Sessizce boş liste dönmek, kullanıcının parametreleri ters yazdığını gizlerdi.
            throw new ValidationException("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
        }

        return (
            from is { } fromDay ? TurkeyDay.RangeForLocalDate(fromDay).FromUtcInclusive : null,
            to is { } toDay ? TurkeyDay.RangeForLocalDate(toDay).ToUtcExclusive : null);
    }
}
```

- [ ] **Adım 5: Testlerin geçtiğini gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~TurkeyDayTests|FullyQualifiedName~LocalDayRangeTests"`
Beklenen: mevcut `TurkeyDay` testleri + 6 yeni + 5 yeni = hepsi PASS.

- [ ] **Adım 6: Commit**

```bash
git add src/Grind.Api/Common/Time/TurkeyDay.cs src/Grind.Api/Common/Time/LocalDayRange.cs tests/Grind.Tests/Common/TurkeyDayTests.cs tests/Grind.Tests/Common/LocalDayRangeTests.cs
git commit -m "feat(time): TR gunu donusumleri ve sorgu araligi cozumu"
```

---

## Görev 2: `StreakCalculator` — saf seri çekirdeği

**Files:**
- Create: `src/Grind.Api/Common/Time/StreakCalculator.cs`
- Test: `tests/Grind.Tests/Common/StreakCalculatorTests.cs`

**Interfaces:**
- Produces: `StreakCalculator.Calculate(IEnumerable<DateOnly> trainedDays, DateOnly today)` →
  `(int Current, int Longest)`

Veritabanına DOKUNMAZ. `RecordTracker` ile aynı desen: kuralın tek karar noktası, saf ve hızlı test.

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Common/StreakCalculatorTests.cs`:

```csharp
using Grind.Api.Common.Time;

namespace Grind.Tests.Common;

/// <summary>
/// Seri kuralı (spec Karar 3): gün = en az bir set girilmiş TR günü (bu filtre sorguda yapılır,
/// burada girdi olarak gelir). MEVCUT seri bugün antrenman yoksa KIRILMAZ — gün henüz bitmedi.
/// </summary>
public class StreakCalculatorTests
{
    private static readonly DateOnly Bugun = new(2026, 3, 12);

    [Fact]
    public void Hic_antrenman_yoksa_seriler_sifirdir()
    {
        Assert.Equal((0, 0), StreakCalculator.Calculate([], Bugun));
    }

    [Fact]
    public void Bugun_yapilan_antrenman_seriyi_bire_cikarir()
    {
        Assert.Equal((1, 1), StreakCalculator.Calculate([Bugun], Bugun));
    }

    [Fact]
    public void Ardisik_gunler_toplanir()
    {
        var gunler = new[] { Bugun, Bugun.AddDays(-1), Bugun.AddDays(-2) };

        Assert.Equal((3, 3), StreakCalculator.Calculate(gunler, Bugun));
    }

    /// <summary>
    /// MANŞET KURAL: bugün henüz antrenman yapılmamışken seri korunur. Bu test kırmızıya
    /// dönerse kullanıcı sabah uygulamayı açtığında serisini 0 görür.
    /// </summary>
    [Fact]
    public void Bugun_antrenman_yoksa_seri_dunden_geriye_sayilir()
    {
        var gunler = new[] { Bugun.AddDays(-1), Bugun.AddDays(-2), Bugun.AddDays(-3) };

        var (mevcut, _) = StreakCalculator.Calculate(gunler, Bugun);

        Assert.Equal(3, mevcut);
    }

    /// <summary>Ama dün de yoksa seri gerçekten kırılmıştır.</summary>
    [Fact]
    public void Dun_de_yoksa_mevcut_seri_sifirdir()
    {
        var gunler = new[] { Bugun.AddDays(-2), Bugun.AddDays(-3) };

        var (mevcut, enUzun) = StreakCalculator.Calculate(gunler, Bugun);

        Assert.Equal(0, mevcut);
        Assert.Equal(2, enUzun);   // geçmişteki seri kaybolmaz
    }

    [Fact]
    public void Bosluk_seriyi_kirar()
    {
        // Bugün, dün, [boşluk], 4 ve 5 gün önce.
        var gunler = new[] { Bugun, Bugun.AddDays(-1), Bugun.AddDays(-4), Bugun.AddDays(-5) };

        Assert.Equal((2, 2), StreakCalculator.Calculate(gunler, Bugun));
    }

    /// <summary>En uzun seri geçmişte kalmış olabilir; mevcut seriyle karıştırılmamalı.</summary>
    [Fact]
    public void En_uzun_seri_gecmiste_kalabilir()
    {
        var gunler = new[]
        {
            Bugun, Bugun.AddDays(-1),
            Bugun.AddDays(-10), Bugun.AddDays(-11), Bugun.AddDays(-12), Bugun.AddDays(-13)
        };

        Assert.Equal((2, 4), StreakCalculator.Calculate(gunler, Bugun));
    }

    /// <summary>
    /// Aynı gün birden fazla oturum olabilir (CLAUDE.md: sabah/akşam). Sorgu aynı günü iki kez
    /// verirse seri iki gün sayılmamalı.
    /// </summary>
    [Fact]
    public void Ayni_gun_tekrar_gelirse_bir_kez_sayilir()
    {
        var gunler = new[] { Bugun, Bugun, Bugun.AddDays(-1) };

        Assert.Equal((2, 2), StreakCalculator.Calculate(gunler, Bugun));
    }

    /// <summary>Girdi sırasız gelebilir (sorgu sıralama garantisi vermiyor).</summary>
    [Fact]
    public void Sirasiz_girdi_ayni_sonucu_verir()
    {
        var gunler = new[] { Bugun.AddDays(-2), Bugun, Bugun.AddDays(-1) };

        Assert.Equal((3, 3), StreakCalculator.Calculate(gunler, Bugun));
    }
}
```

- [ ] **Adım 2: Testlerin derlenmediğini gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~StreakCalculatorTests"`
Beklenen: derleme hatası — `StreakCalculator` tipi yok.

- [ ] **Adım 3: `StreakCalculator`'ı yaz**

`src/Grind.Api/Common/Time/StreakCalculator.cs`:

```csharp
namespace Grind.Api.Common.Time;

/// <summary>
/// Antrenman serisi (streak) hesabının TEK karar noktası. Veritabanı bilmez, saat bilmez —
/// yalnızca antrenman yapılmış TR günlerini ve "bugün"ü görür. <c>RecordTracker</c> ile aynı
/// desen: kural saf bir fonksiyonda yaşar, testleri DB istemez.
/// </summary>
public static class StreakCalculator
{
    /// <summary>
    /// <paramref name="trainedDays"/> sırasız ve yinelenen olabilir (aynı günde birden fazla
    /// oturum olabilir — CLAUDE.md). Dönen <c>Current</c>, bugün antrenman yapılmamışsa dünden
    /// geriye sayılır: gün henüz bitmediği için seri kırılmış sayılmaz (spec Karar 3).
    /// </summary>
    public static (int Current, int Longest) Calculate(
        IEnumerable<DateOnly> trainedDays, DateOnly today)
    {
        var days = trainedDays.ToHashSet();

        if (days.Count == 0)
        {
            return (0, 0);
        }

        return (CurrentStreak(days, today), LongestStreak(days));
    }

    private static int CurrentStreak(HashSet<DateOnly> days, DateOnly today)
    {
        // Bugün antrenman varsa bugünden, yoksa dünden geriye sayılır. Doğrudan bugünden
        // saymak, akşam antrenmanını henüz yapmamış kullanıcıya seriyi 0 gösterirdi.
        var cursor = days.Contains(today) ? today : today.AddDays(-1);
        var streak = 0;

        while (days.Contains(cursor))
        {
            streak++;
            cursor = cursor.AddDays(-1);
        }

        return streak;
    }

    private static int LongestStreak(HashSet<DateOnly> days)
    {
        var longest = 0;
        var run = 0;
        DateOnly? previous = null;

        foreach (var day in days.Order())
        {
            run = previous is { } yesterday && yesterday.AddDays(1) == day ? run + 1 : 1;
            longest = Math.Max(longest, run);
            previous = day;
        }

        return longest;
    }
}
```

- [ ] **Adım 4: Testlerin geçtiğini gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~StreakCalculatorTests"`
Beklenen: 9 test PASS.

- [ ] **Adım 5: Commit**

```bash
git add src/Grind.Api/Common/Time/StreakCalculator.cs tests/Grind.Tests/Common/StreakCalculatorTests.cs
git commit -m "feat(stats): antrenman serisi hesabinin saf cekirdegi"
```

---

## Görev 3: `IWorkoutSessionRepository` eklemeleri

**Files:**
- Create: `src/Grind.Api/Models/Projections/SessionAggregate.cs`
- Modify: `src/Grind.Api/Repositories/IWorkoutSessionRepository.cs`
- Modify: `src/Grind.Api/Repositories/WorkoutSessionRepository.cs`
- Test: `tests/Grind.Tests/Repositories/WorkoutSessionRepositoryTests.cs` (mevcut dosyaya ekle)

**Interfaces:**
- Produces:
  - `record SessionAggregate(long SessionId, DateTime StartedAt, int SetCount, decimal Volume)`
    (namespace `Grind.Api.Models.Projections`)
  - `Task<(IReadOnlyList<WorkoutSession> Sessions, int TotalCount)> GetHistoryPageAsync(long userId, DateTime? fromUtcInclusive, DateTime? toUtcExclusive, long? exerciseId, int skip, int take, CancellationToken ct = default)`
  - `Task<IReadOnlyList<SessionAggregate>> GetSessionAggregatesAsync(long userId, DateTime? fromUtcInclusive, DateTime? toUtcExclusive, CancellationToken ct = default)`
  - `Task<IReadOnlyList<DateTime>> GetTrainedSessionStartsAsync(long userId, CancellationToken ct = default)`

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Repositories/WorkoutSessionRepositoryTests.cs` dosyasının SONUNA, sınıfın içine
ekle. Dosyanın başında eksikse şu `using`'leri ekle: `using Grind.Api.Models.Enums;`,
`using Microsoft.EntityFrameworkCore;`.

```csharp
    // ---- Faz 9 eklemeleri ----

    /// <summary>Belirli bir UTC anında başlayan, verilen setleri taşıyan oturum kurar.</summary>
    private static WorkoutSession SeedSession(
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
    public async Task Gecmis_sayfasi_toplam_sayiyla_birlikte_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        SeedSession(context, user, exercise, an, (100m, 8));
        SeedSession(context, user, exercise, an.AddDays(1), (100m, 8));
        SeedSession(context, user, exercise, an.AddDays(2), (100m, 8));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);
        var (sessions, toplam) = await repository.GetHistoryPageAsync(
            user.Id, null, null, null, skip: 0, take: 2);

        // Sayfa 2 satır taşır ama toplam 3'tür — istemci "3 sonuçtan 1-2" diyebilsin.
        Assert.Equal(2, sessions.Count);
        Assert.Equal(3, toplam);
    }

    /// <summary>Yeniden eskiye; eşit `StartedAt`'te Id azalan (belirli sıra).</summary>
    [Fact]
    public async Task Gecmis_yeniden_eskiye_siralanir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        var eski = SeedSession(context, user, exercise, an, (100m, 8));
        var yeni = SeedSession(context, user, exercise, an.AddDays(1), (100m, 8));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);
        var (sessions, _) = await repository.GetHistoryPageAsync(user.Id, null, null, null, 0, 20);

        Assert.Equal([yeni.Id, eski.Id], sessions.Select(s => s.Id));
    }

    [Fact]
    public async Task Gecmis_tarih_araligina_gore_filtrelenir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        SeedSession(context, user, exercise, an.AddDays(-5), (100m, 8));
        var araliktaki = SeedSession(context, user, exercise, an, (100m, 8));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);
        var (sessions, toplam) = await repository.GetHistoryPageAsync(
            user.Id, an.AddDays(-1), an.AddDays(1), null, 0, 20);

        Assert.Equal(araliktaki.Id, Assert.Single(sessions).Id);
        Assert.Equal(1, toplam);
    }

    [Fact]
    public async Task Gecmis_egzersize_gore_filtrelenir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var aranan = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        var diger = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, aranan, diger);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        var arananOturum = SeedSession(context, user, aranan, an, (100m, 8));
        SeedSession(context, user, diger, an.AddDays(1), (100m, 8));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);
        var (sessions, toplam) = await repository.GetHistoryPageAsync(
            user.Id, null, null, aranan.Id, 0, 20);

        Assert.Equal(arananOturum.Id, Assert.Single(sessions).Id);
        // Toplam da filtreli olmalı: sayfa 1 satır gösterip "2 sonuç" demek tutarsız olurdu.
        Assert.Equal(1, toplam);
    }

    [Fact]
    public async Task Gecmis_baskasinin_oturumlarini_getirmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(sahip, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(sahip, davetsiz, exercise);
        await context.SaveChangesAsync();

        SeedSession(context, sahip, exercise, new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc), (100m, 8));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);
        var (sessions, toplam) = await repository.GetHistoryPageAsync(davetsiz.Id, null, null, null, 0, 20);

        Assert.Empty(sessions);
        Assert.Equal(0, toplam);
    }

    [Fact]
    public async Task Oturum_toplamlari_hacmi_ve_set_sayisini_verir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        var oturum = SeedSession(context, user, exercise, an, (100m, 8), (60m, 10));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);
        var toplamlar = await repository.GetSessionAggregatesAsync(user.Id, null, null);

        var satir = Assert.Single(toplamlar);
        Assert.Equal(oturum.Id, satir.SessionId);
        Assert.Equal(2, satir.SetCount);
        Assert.Equal(100m * 8 + 60m * 10, satir.Volume);   // 1400
    }

    /// <summary>
    /// Seti olmayan oturum antrenman sayılmaz (spec Karar 3) — takvimi ve seriyi şişirmemeli.
    /// </summary>
    [Fact]
    public async Task Seti_olmayan_oturum_toplamlara_girmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.Add(user);
        await context.SaveChangesAsync();

        var bos = TestDatabase.NewSession(user);
        bos.StartedAt = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        context.Add(bos);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);

        Assert.Empty(await repository.GetSessionAggregatesAsync(user.Id, null, null));
        Assert.Empty(await repository.GetTrainedSessionStartsAsync(user.Id));
    }

    [Fact]
    public async Task Antrenman_baslangiclari_tum_gecmisten_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        SeedSession(context, user, exercise, an, (100m, 8));
        SeedSession(context, user, exercise, an.AddDays(-40), (100m, 8));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);
        var baslangiclar = await repository.GetTrainedSessionStartsAsync(user.Id);

        // Seri tüm geçmişten hesaplanır; aralık filtresi YOKTUR (spec Karar 5).
        Assert.Equal(2, baslangiclar.Count);
    }

    [Fact]
    public async Task Antrenman_baslangiclari_baskasinin_oturumlarini_getirmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(sahip, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(sahip, davetsiz, exercise);
        await context.SaveChangesAsync();

        SeedSession(context, sahip, exercise, new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc), (100m, 8));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);

        Assert.Empty(await repository.GetTrainedSessionStartsAsync(davetsiz.Id));
    }
```

- [ ] **Adım 2: Testlerin derlenmediğini gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~WorkoutSessionRepositoryTests"`
Beklenen: derleme hatası — üç metot ve `SessionAggregate` yok.

- [ ] **Adım 3: Projeksiyonu ve metotları yaz**

`src/Grind.Api/Models/Projections/SessionAggregate.cs`:

```csharp
namespace Grind.Api.Models.Projections;

/// <summary>
/// Oturum başına toplamlar — repository'nin OKUMA MODELİ, DTO DEĞİL: dışarı verilmez, controller
/// görmez. Takvim ve günlük hacim bunu paylaşır; her ikisi de setleri değil oturum toplamlarını
/// okur, böylece belleğe gelen satır sayısı set sayısıyla değil oturum sayısıyla sınırlı kalır.
/// </summary>
public record SessionAggregate(long SessionId, DateTime StartedAt, int SetCount, decimal Volume);
```

`src/Grind.Api/Repositories/IWorkoutSessionRepository.cs` — mevcut metotları KORU, şunları ekle
(`using Grind.Api.Models.Projections;` eklemeyi unutma):

```csharp
    /// <summary>
    /// Geçmiş sayfası ve toplam sayı BİRLİKTE. İkisi tek metotta çünkü aynı filtreden türerler:
    /// ayrı metotlar filtre ifadesini iki yerde tekrarlar ve biri değişince diğeri sessizce
    /// ayrışır (sayfa 1 satır gösterirken "2 sonuç" demek gibi).
    /// Sıralama BELİRLİDİR: StartedAt azalan, eşitlikte Id azalan.
    /// Null tarih uçları o yönde sınırsız demektir.
    /// </summary>
    Task<(IReadOnlyList<WorkoutSession> Sessions, int TotalCount)> GetHistoryPageAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        long? exerciseId,
        int skip,
        int take,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Oturum başına set sayısı ve hacim (ağırlık × tekrar), toplama SQL'de. En az bir seti
    /// OLMAYAN oturumlar sorguda elenir — seti olmayan oturum antrenman sayılmaz (spec Karar 3).
    /// TR gününe gruplama çağıranın işidir (bkz. TurkeyDay.LocalDateOf).
    /// </summary>
    Task<IReadOnlyList<SessionAggregate>> GetSessionAggregatesAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// En az bir seti olan oturumların <c>StartedAt</c> değerleri, TÜM geçmişten — seri hesabı
    /// aralıktan bağımsızdır (spec Karar 5): "bu ay" filtresi 40 günlük seriyi kırmamalı.
    /// Yalnızca zaman damgası döner; hacim/set sayısı seri için gereksiz.
    /// </summary>
    Task<IReadOnlyList<DateTime>> GetTrainedSessionStartsAsync(
        long userId, CancellationToken cancellationToken = default);
```

`src/Grind.Api/Repositories/WorkoutSessionRepository.cs` — mevcut metotları KORU, şunları ekle
(`using Grind.Api.Models.Projections;` eklemeyi unutma):

```csharp
    public async Task<(IReadOnlyList<WorkoutSession> Sessions, int TotalCount)> GetHistoryPageAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        long? exerciseId,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var query = FilterHistory(userId, fromUtcInclusive, toUtcExclusive, exerciseId);

        var totalCount = await query.CountAsync(cancellationToken);

        var sessions = await query
            // Yalnızca şablon adı için tek LEFT JOIN — koleksiyon Include'u yok (kartezyen
            // patlama olmasın); setler ayrı bir sorguda toplu çekilir (N+1 yok).
            .Include(s => s.Template)
            .OrderByDescending(s => s.StartedAt)
            .ThenByDescending(s => s.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        return (sessions, totalCount);
    }

    public async Task<IReadOnlyList<SessionAggregate>> GetSessionAggregatesAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default)
    {
        // Önce anonim tipe projekte edip sonra record'a çevirmek bilinçli: aggregate'li bir
        // GroupBy/Select ifadesinde doğrudan record kurucusu kullanmak, EF'in sorguyu
        // çeviremediği durumda sessizce istemci tarafı değerlendirmeye kayma riski taşır.
        var rows = await FilterByRange(userId, fromUtcInclusive, toUtcExclusive)
            .Where(s => s.SetEntries.Any())
            .Select(s => new
            {
                s.Id,
                s.StartedAt,
                SetCount = s.SetEntries.Count(),
                Volume = s.SetEntries.Sum(e => e.Weight * e.Reps)
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(r => new SessionAggregate(r.Id, r.StartedAt, r.SetCount, r.Volume))
            .ToList();
    }

    public async Task<IReadOnlyList<DateTime>> GetTrainedSessionStartsAsync(
        long userId, CancellationToken cancellationToken = default)
        => await Set
            .Where(s => s.UserId == userId && s.SetEntries.Any())
            .Select(s => s.StartedAt)
            .ToListAsync(cancellationToken);

    private IQueryable<WorkoutSession> FilterHistory(
        long userId, DateTime? fromUtcInclusive, DateTime? toUtcExclusive, long? exerciseId)
    {
        var query = FilterByRange(userId, fromUtcInclusive, toUtcExclusive);

        if (exerciseId is { } id)
        {
            query = query.Where(s => s.SetEntries.Any(e => e.ExerciseId == id));
        }

        return query;
    }

    private IQueryable<WorkoutSession> FilterByRange(
        long userId, DateTime? fromUtcInclusive, DateTime? toUtcExclusive)
    {
        var query = Set.Where(s => s.UserId == userId);

        if (fromUtcInclusive is { } from)
        {
            query = query.Where(s => s.StartedAt >= from);
        }

        if (toUtcExclusive is { } to)
        {
            query = query.Where(s => s.StartedAt < to);
        }

        return query;
    }
```

- [ ] **Adım 4: Testleri çalıştır**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~WorkoutSessionRepositoryTests"`
Beklenen: mevcut testler + 9 yeni test PASS.

- [ ] **Adım 5: Commit**

```bash
git add src/Grind.Api/Models/Projections/SessionAggregate.cs src/Grind.Api/Repositories/IWorkoutSessionRepository.cs src/Grind.Api/Repositories/WorkoutSessionRepository.cs tests/Grind.Tests/Repositories/WorkoutSessionRepositoryTests.cs
git commit -m "feat(data): gecmis sayfasi, oturum toplamlari ve antrenman gunleri sorgulari"
```

---

## Görev 4: `ISetEntryRepository` eklemeleri

**Files:**
- Create: `src/Grind.Api/Models/Projections/ExerciseVolume.cs`
- Modify: `src/Grind.Api/Repositories/ISetEntryRepository.cs`
- Modify: `src/Grind.Api/Repositories/SetEntryRepository.cs`
- Test: `tests/Grind.Tests/Repositories/SetEntryRepositoryTests.cs` (mevcut dosyaya ekle)

**Interfaces:**
- Produces:
  - `record ExerciseVolume(long ExerciseId, string ExerciseName, decimal Volume, int SetCount)`
    (namespace `Grind.Api.Models.Projections`)
  - `Task<IReadOnlyList<ExerciseVolume>> GetVolumeByExerciseAsync(long userId, DateTime? fromUtcInclusive, DateTime? toUtcExclusive, CancellationToken ct = default)`
  - `Task<IReadOnlyList<SetEntry>> GetForSessionsAsync(IReadOnlyCollection<long> sessionIds, long userId, long? exerciseId, CancellationToken ct = default)`

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Repositories/SetEntryRepositoryTests.cs` dosyasının SONUNA, sınıfın içine ekle:

```csharp
    // ---- Faz 9 eklemeleri ----

    /// <summary>
    /// Hacim, egzersiz başına toplanır. Aralık filtresi setin CreatedAt'ine değil OTURUMUN
    /// StartedAt'ine bakar (spec Karar 7) — gece yarısını aşan antrenmanda ikisi farklı güne düşer.
    /// </summary>
    [Fact]
    public async Task Egzersiz_hacmi_gruplanarak_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var birinci = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        var ikinci = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        var session = TestDatabase.NewSession(user);
        session.StartedAt = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        context.AddRange(user, birinci, ikinci, session);
        await context.SaveChangesAsync();

        var an = session.StartedAt;
        context.Add(new SetEntry { WorkoutSession = session, Exercise = birinci, Weight = 100m, Reps = 8, RecordType = RecordType.None, CreatedAt = an });
        context.Add(new SetEntry { WorkoutSession = session, Exercise = birinci, Weight = 100m, Reps = 5, RecordType = RecordType.None, CreatedAt = an });
        context.Add(new SetEntry { WorkoutSession = session, Exercise = ikinci, Weight = 60m, Reps = 10, RecordType = RecordType.None, CreatedAt = an });
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);
        var hacimler = await repository.GetVolumeByExerciseAsync(user.Id, null, null);

        var birinciSatir = Assert.Single(hacimler, h => h.ExerciseId == birinci.Id);
        Assert.Equal(100m * 8 + 100m * 5, birinciSatir.Volume);   // 1300
        Assert.Equal(2, birinciSatir.SetCount);
        Assert.Equal(birinci.Name, birinciSatir.ExerciseName);

        var ikinciSatir = Assert.Single(hacimler, h => h.ExerciseId == ikinci.Id);
        Assert.Equal(600m, ikinciSatir.Volume);
    }

    [Fact]
    public async Task Egzersiz_hacmi_oturumun_baslangicina_gore_filtrelenir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        var eski = TestDatabase.NewSession(user);
        eski.StartedAt = new DateTime(2026, 3, 1, 17, 0, 0, DateTimeKind.Utc);
        var yeni = TestDatabase.NewSession(user);
        yeni.StartedAt = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        context.AddRange(user, exercise, eski, yeni);
        await context.SaveChangesAsync();

        context.Add(new SetEntry { WorkoutSession = eski, Exercise = exercise, Weight = 100m, Reps = 10, RecordType = RecordType.None, CreatedAt = eski.StartedAt });
        context.Add(new SetEntry { WorkoutSession = yeni, Exercise = exercise, Weight = 50m, Reps = 10, RecordType = RecordType.None, CreatedAt = yeni.StartedAt });
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);
        var hacimler = await repository.GetVolumeByExerciseAsync(
            user.Id, new DateTime(2026, 3, 5, 0, 0, 0, DateTimeKind.Utc), null);

        Assert.Equal(500m, Assert.Single(hacimler).Volume);   // yalnızca yeni oturum
    }

    [Fact]
    public async Task Egzersiz_hacmi_baskasinin_setlerini_saymaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(sahip, $"Egzersiz {Guid.NewGuid():N}");
        var session = TestDatabase.NewSession(sahip);
        context.AddRange(sahip, davetsiz, exercise, session);
        await context.SaveChangesAsync();

        context.Add(new SetEntry { WorkoutSession = session, Exercise = exercise, Weight = 100m, Reps = 8, RecordType = RecordType.None, CreatedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);

        Assert.Empty(await repository.GetVolumeByExerciseAsync(davetsiz.Id, null, null));
    }

    [Fact]
    public async Task Oturum_kumesinin_setleri_tek_sorguda_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        var birinci = TestDatabase.NewSession(user);
        var ikinci = TestDatabase.NewSession(user);
        context.AddRange(user, exercise, birinci, ikinci);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        context.Add(new SetEntry { WorkoutSession = birinci, Exercise = exercise, Weight = 100m, Reps = 8, RecordType = RecordType.None, CreatedAt = an });
        context.Add(new SetEntry { WorkoutSession = ikinci, Exercise = exercise, Weight = 100m, Reps = 9, RecordType = RecordType.None, CreatedAt = an.AddDays(1) });
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);
        var setler = await repository.GetForSessionsAsync([birinci.Id, ikinci.Id], user.Id, null);

        Assert.Equal(2, setler.Count);
        // Yanıt DTO'su egzersiz adını taşıyor; Include yoksa burada NullReferenceException olurdu.
        Assert.All(setler, s => Assert.NotNull(s.Exercise));
    }

    [Fact]
    public async Task Oturum_kumesinin_setleri_egzersize_gore_filtrelenebilir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var aranan = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        var diger = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        var session = TestDatabase.NewSession(user);
        context.AddRange(user, aranan, diger, session);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        context.Add(new SetEntry { WorkoutSession = session, Exercise = aranan, Weight = 100m, Reps = 8, RecordType = RecordType.None, CreatedAt = an });
        context.Add(new SetEntry { WorkoutSession = session, Exercise = diger, Weight = 60m, Reps = 10, RecordType = RecordType.None, CreatedAt = an });
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);
        var setler = await repository.GetForSessionsAsync([session.Id], user.Id, aranan.Id);

        Assert.Equal(aranan.Id, Assert.Single(setler).ExerciseId);
    }

    [Fact]
    public async Task Oturum_kumesinin_setleri_baskasina_acilmaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(sahip, $"Egzersiz {Guid.NewGuid():N}");
        var session = TestDatabase.NewSession(sahip);
        context.AddRange(sahip, davetsiz, exercise, session);
        await context.SaveChangesAsync();

        context.Add(new SetEntry { WorkoutSession = session, Exercise = exercise, Weight = 100m, Reps = 8, RecordType = RecordType.None, CreatedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);

        // Oturum id'si bilinse bile başkasının setleri gelmez (sahiplik yüklemi her sorguda).
        Assert.Empty(await repository.GetForSessionsAsync([session.Id], davetsiz.Id, null));
    }

    /// <summary>
    /// Boş sayfa (sonuç yok) için sorgu hiç çalışmamalı: boş bir IN listesi anlamsız ve
    /// bazı sağlayıcılarda hataya yol açar.
    /// </summary>
    [Fact]
    public async Task Bos_oturum_kumesi_bos_liste_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var repository = new SetEntryRepository(context);

        Assert.Empty(await repository.GetForSessionsAsync([], userId: 1, exerciseId: null));
    }
```

- [ ] **Adım 2: Testlerin derlenmediğini gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~SetEntryRepositoryTests"`
Beklenen: derleme hatası — iki metot ve `ExerciseVolume` yok.

- [ ] **Adım 3: Projeksiyonu ve metotları yaz**

`src/Grind.Api/Models/Projections/ExerciseVolume.cs`:

```csharp
namespace Grind.Api.Models.Projections;

/// <summary>
/// Egzersiz başına hacim toplamı — repository'nin OKUMA MODELİ, DTO DEĞİL. Toplama tamamen
/// SQL'de yapılır; bu tip yalnızca sonucu taşır.
/// </summary>
public record ExerciseVolume(long ExerciseId, string ExerciseName, decimal Volume, int SetCount);
```

`src/Grind.Api/Repositories/ISetEntryRepository.cs` — mevcut metotları KORU, şunları ekle
(`using Grind.Api.Models.Projections;` eklemeyi unutma):

```csharp
    /// <summary>
    /// Egzersiz başına hacim (ağırlık × tekrar) ve set sayısı; gruplama ve toplama SQL'de.
    /// Aralık filtresi setin <c>CreatedAt</c>'ine değil OTURUMUN <c>StartedAt</c>'ine bakar
    /// (spec Karar 7): gece yarısını aşan bir antrenmanda ikisi farklı güne düşer ve takvimle
    /// hacim ayrışırdı.
    /// </summary>
    Task<IReadOnlyList<ExerciseVolume>> GetVolumeByExerciseAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Verilen oturumların setleri TEK sorguda, <c>Exercise</c> ile birlikte, kronolojik
    /// (CreatedAt, eşitlikte Id). Geçmiş sayfası bunu kullanır: oturum başına ayrı sorgu N+1 olurdu.
    /// <paramref name="exerciseId"/> verilirse yalnızca o egzersizin setleri döner.
    /// Sahiplik yüklemi burada da taşınır — oturumlar zaten doğrulanmış olsa bile (CLAUDE.md).
    /// </summary>
    Task<IReadOnlyList<SetEntry>> GetForSessionsAsync(
        IReadOnlyCollection<long> sessionIds,
        long userId,
        long? exerciseId,
        CancellationToken cancellationToken = default);
```

`src/Grind.Api/Repositories/SetEntryRepository.cs` — mevcut metotları KORU, şunları ekle
(`using Grind.Api.Models.Projections;` eklemeyi unutma):

```csharp
    public async Task<IReadOnlyList<ExerciseVolume>> GetVolumeByExerciseAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default)
    {
        var query = Set.Where(s => s.WorkoutSession.UserId == userId);

        if (fromUtcInclusive is { } from)
        {
            query = query.Where(s => s.WorkoutSession.StartedAt >= from);
        }

        if (toUtcExclusive is { } to)
        {
            query = query.Where(s => s.WorkoutSession.StartedAt < to);
        }

        // Anonim tipe projekte edip sonra record'a çevirmek bilinçli (bkz. GetSessionAggregatesAsync).
        var rows = await query
            .GroupBy(s => new { s.ExerciseId, s.Exercise.Name })
            .Select(g => new
            {
                g.Key.ExerciseId,
                g.Key.Name,
                Volume = g.Sum(s => s.Weight * s.Reps),
                SetCount = g.Count()
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(r => new ExerciseVolume(r.ExerciseId, r.Name, r.Volume, r.SetCount))
            .ToList();
    }

    public async Task<IReadOnlyList<SetEntry>> GetForSessionsAsync(
        IReadOnlyCollection<long> sessionIds,
        long userId,
        long? exerciseId,
        CancellationToken cancellationToken = default)
    {
        if (sessionIds.Count == 0)
        {
            // Boş sayfa: sorguyu hiç çalıştırma (boş IN listesi anlamsız).
            return [];
        }

        var query = Set
            .Include(s => s.Exercise)
            .Where(s => sessionIds.Contains(s.WorkoutSessionId) && s.WorkoutSession.UserId == userId);

        if (exerciseId is { } id)
        {
            query = query.Where(s => s.ExerciseId == id);
        }

        return await query
            .OrderBy(s => s.CreatedAt)
            .ThenBy(s => s.Id)
            .ToListAsync(cancellationToken);
    }
```

- [ ] **Adım 4: Testleri çalıştır**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~SetEntryRepositoryTests"`
Beklenen: mevcut testler + 7 yeni test PASS.

- [ ] **Adım 5: Commit**

```bash
git add src/Grind.Api/Models/Projections/ExerciseVolume.cs src/Grind.Api/Repositories/ISetEntryRepository.cs src/Grind.Api/Repositories/SetEntryRepository.cs tests/Grind.Tests/Repositories/SetEntryRepositoryTests.cs
git commit -m "feat(data): egzersiz hacmi ve oturum kumesi set sorgulari"
```

---

## Görev 5: `WorkoutHistoryService` + geçmiş DTO'ları

**Files:**
- Create: `src/Grind.Api/Models/Dtos/Common/PagedResponse.cs`
- Create: `src/Grind.Api/Models/Dtos/History/HistoryQuery.cs`
- Create: `src/Grind.Api/Models/Dtos/History/HistorySessionResponse.cs`
- Create: `src/Grind.Api/Services/IWorkoutHistoryService.cs`
- Create: `src/Grind.Api/Services/WorkoutHistoryService.cs`
- Test: `tests/Grind.Tests/Services/WorkoutHistoryServiceTests.cs`

**Interfaces:**
- Consumes: `LocalDayRange.Resolve` (Görev 1); `IWorkoutSessionRepository.GetHistoryPageAsync`
  (Görev 3); `ISetEntryRepository.GetForSessionsAsync` (Görev 4);
  `IExerciseRepository.GetVisibleByIdAsync`; `ICurrentUserService`
- Produces:
  - `record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)`
    (namespace `Grind.Api.Models.Dtos.Common`), türetilmiş `int TotalPages`
  - `class HistoryQuery { DateOnly? From; DateOnly? To; long? ExerciseId; int Page = 1; int PageSize = 20; }`
  - `record HistorySessionResponse(long SessionId, DateTime StartedAt, DateTime? EndedAt, string? TemplateName, string? Notes, decimal TotalVolume, int SetCount, IReadOnlyList<SetEntryResponse> Sets)`
  - `IWorkoutHistoryService.GetAsync(HistoryQuery query, CancellationToken ct = default)` →
    `Task<PagedResponse<HistorySessionResponse>>`

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Services/WorkoutHistoryServiceTests.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class WorkoutHistoryServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    private static async Task<(AppDbContext Context, User User, Exercise Exercise,
        WorkoutHistoryService Service, IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var service = new WorkoutHistoryService(
            new WorkoutSessionRepository(context), new SetEntryRepository(context),
            new ExerciseRepository(context), new StubCurrentUser(user.Id));

        return (context, user, exercise, service, transaction);
    }

    /// <summary>Verilen UTC anında başlayan, verilen setleri taşıyan bir oturum kurar.</summary>
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

    private static readonly DateTime An = new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task Gecmis_oturumu_setleriyle_dondurur()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, An, (100m, 8), (60m, 10));
            await context.SaveChangesAsync();

            var sayfa = await service.GetAsync(new HistoryQuery());

            var oturum = Assert.Single(sayfa.Items);
            Assert.Equal(2, oturum.Sets.Count);
            Assert.Equal(exercise.Name, oturum.Sets[0].ExerciseName);
        }
    }

    [Fact]
    public async Task Oturum_toplam_hacmi_setlerden_hesaplanir()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, An, (100m, 8), (60m, 10));
            await context.SaveChangesAsync();

            var oturum = Assert.Single((await service.GetAsync(new HistoryQuery())).Items);

            Assert.Equal(100m * 8 + 60m * 10, oturum.TotalVolume);   // 1400
            Assert.Equal(2, oturum.SetCount);
        }
    }

    [Fact]
    public async Task Sayfa_zarfi_toplam_sayfa_sayisini_turetir()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            for (var gun = 0; gun < 3; gun++)
            {
                Seed(context, user, exercise, An.AddDays(gun), (100m, 8));
            }
            await context.SaveChangesAsync();

            var sayfa = await service.GetAsync(new HistoryQuery { PageSize = 2 });

            Assert.Equal(2, sayfa.Items.Count);
            Assert.Equal(3, sayfa.TotalCount);
            Assert.Equal(2, sayfa.TotalPages);   // 3 satır / 2 = 2 sayfa (yukarı yuvarlama)
            Assert.Equal(1, sayfa.Page);
        }
    }

    [Fact]
    public async Task Ikinci_sayfa_kalan_satirlari_dondurur()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            for (var gun = 0; gun < 3; gun++)
            {
                Seed(context, user, exercise, An.AddDays(gun), (100m, 8));
            }
            await context.SaveChangesAsync();

            var sayfa = await service.GetAsync(new HistoryQuery { Page = 2, PageSize = 2 });

            Assert.Single(sayfa.Items);
            Assert.Equal(3, sayfa.TotalCount);
        }
    }

    /// <summary>
    /// Tarihler TR yerel GÜNÜ. TR 10 Mart 23:00 = UTC 10 Mart 20:00; "10 Mart" filtresi bu
    /// antrenmanı YAKALAMALI. UTC gününe göre filtrelenseydi de yakalardı — asıl ayrım bir
    /// sonraki testte.
    /// </summary>
    [Fact]
    public async Task Tarih_filtresi_TR_gunune_gore_calisir()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, new DateTime(2026, 3, 10, 20, 0, 0, DateTimeKind.Utc), (100m, 8));
            await context.SaveChangesAsync();

            var sayfa = await service.GetAsync(new HistoryQuery
            {
                From = new DateOnly(2026, 3, 10), To = new DateOnly(2026, 3, 10)
            });

            Assert.Single(sayfa.Items);
        }
    }

    /// <summary>
    /// AYIRT EDİCİ TEST: TR 10 Mart 23:30 = UTC 10 Mart 20:30 değil, TR 11 Mart 00:30 = UTC
    /// 10 Mart 21:30'dur. UTC gününe göre filtrelenirse bu antrenman "10 Mart"a düşer ve
    /// kullanıcı onu yanlış günde görür.
    /// </summary>
    [Fact]
    public async Task Gece_yarisini_asan_antrenman_dogru_TR_gunune_duser()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            // UTC 10 Mart 21:30 = TR 11 Mart 00:30
            Seed(context, user, exercise, new DateTime(2026, 3, 10, 21, 30, 0, DateTimeKind.Utc), (100m, 8));
            await context.SaveChangesAsync();

            var onuncu = await service.GetAsync(new HistoryQuery
            {
                From = new DateOnly(2026, 3, 10), To = new DateOnly(2026, 3, 10)
            });
            var onbirinci = await service.GetAsync(new HistoryQuery
            {
                From = new DateOnly(2026, 3, 11), To = new DateOnly(2026, 3, 11)
            });

            Assert.Empty(onuncu.Items);
            Assert.Single(onbirinci.Items);
        }
    }

    /// <summary>
    /// LOAD-BEARING (spec Karar 8): egzersiz filtresi verildiğinde toplamlar da filtreye tabi.
    /// Aksi halde ekranda "3 set / 2200 kg" yazarken listede tek set görünürdü.
    /// </summary>
    [Fact]
    public async Task Egzersiz_filtresinde_toplamlar_da_filtreye_tabidir()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerEgzersiz = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            context.Add(digerEgzersiz);
            await context.SaveChangesAsync();

            var session = Seed(context, user, exercise, An, (100m, 8));
            context.Add(new SetEntry
            {
                WorkoutSession = session, Exercise = digerEgzersiz,
                Weight = 50m, Reps = 20, RecordType = RecordType.None, CreatedAt = An
            });
            await context.SaveChangesAsync();

            var sayfa = await service.GetAsync(new HistoryQuery { ExerciseId = exercise.Id });

            var oturum = Assert.Single(sayfa.Items);
            Assert.Equal(1, oturum.SetCount);
            Assert.Equal(800m, oturum.TotalVolume);            // 100 × 8, diğer egzersiz HARİÇ
            Assert.Equal(exercise.Id, Assert.Single(oturum.Sets).ExerciseId);
        }
    }

    [Fact]
    public async Task Baskasinin_egzersiziyle_filtrelenemez()
    {
        var (context, _, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, $"Egzersiz {Guid.NewGuid():N}");
            context.AddRange(digerKullanici, digerEgzersiz);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.GetAsync(new HistoryQuery { ExerciseId = digerEgzersiz.Id }));
        }
    }

    [Fact]
    public async Task Baskasinin_oturumlari_gecmiste_gorunmez()
    {
        var (context, _, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            context.Add(digerKullanici);
            await context.SaveChangesAsync();

            Seed(context, digerKullanici, exercise, An, (100m, 8));
            await context.SaveChangesAsync();

            var sayfa = await service.GetAsync(new HistoryQuery());

            Assert.Empty(sayfa.Items);
            Assert.Equal(0, sayfa.TotalCount);
        }
    }

    [Fact]
    public async Task Ters_tarih_araligi_reddedilir()
    {
        var (_, _, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(
                () => service.GetAsync(new HistoryQuery
                {
                    From = new DateOnly(2026, 3, 10), To = new DateOnly(2026, 3, 1)
                }));
        }
    }

    /// <summary>Sonuç yoksa 404 değil, boş sayfa: sorgu geçerli, sonuç boş.</summary>
    [Fact]
    public async Task Sonuc_yoksa_bos_sayfa_doner()
    {
        var (_, _, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sayfa = await service.GetAsync(new HistoryQuery());

            Assert.Empty(sayfa.Items);
            Assert.Equal(0, sayfa.TotalCount);
            Assert.Equal(0, sayfa.TotalPages);
        }
    }
}
```

- [ ] **Adım 2: Testlerin derlenmediğini gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~WorkoutHistoryServiceTests"`
Beklenen: derleme hatası — `WorkoutHistoryService` ve DTO'lar yok.

- [ ] **Adım 3: DTO'ları yaz**

`src/Grind.Api/Models/Dtos/Common/PagedResponse.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Common;

/// <summary>
/// Sayfalama zarfı. Projedeki ilk sayfalama deseni — sonraki fazlar (export) da bunu kullanır.
/// <c>TotalPages</c> türetilmiştir: istemcinin bölme + yukarı yuvarlama yazmasına gerek kalmasın
/// (kolay yanlış yapılan bir hesap). <c>PageSize</c> her zaman ≥ 1'dir; sorgu DTO'su 1-100
/// aralığını zorunlu kılıyor, bu yüzden burada sıfıra bölme olamaz.
/// </summary>
public record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}
```

`src/Grind.Api/Models/Dtos/History/HistoryQuery.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.History;

/// <summary>
/// Geçmiş sorgusu. <c>From</c>/<c>To</c> TR yerel GÜNÜDÜR (<c>2026-03-01</c>) ve İKİ UCU DA
/// DAHİLDİR. <c>DateOnly</c> bilinçli: <c>DateTime</c> olsaydı istemcinin gönderdiği
/// <c>2026-03-01T00:00:00Z</c> sessizce TR 03:00'e denk gelir ve gecenin ilk üç saatindeki
/// antrenmanlar aralığın dışında kalırdı.
/// </summary>
public class HistoryQuery
{
    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }

    public long? ExerciseId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Sayfa numarası 1'den küçük olamaz.")]
    public int Page { get; set; } = 1;

    [Range(1, 100, ErrorMessage = "Sayfa boyutu 1 ile 100 arasında olmalı.")]
    public int PageSize { get; set; } = 20;
}
```

`src/Grind.Api/Models/Dtos/History/HistorySessionResponse.cs`:

```csharp
using Grind.Api.Models.Dtos.Set;

namespace Grind.Api.Models.Dtos.History;

/// <summary>
/// Geçmişteki bir oturum ve setleri. Setler için Faz 8'in <see cref="SetEntryResponse"/>'u
/// yeniden kullanılıyor — ikinci bir set DTO'su aynı veriyi iki biçimde sunmanın bakım
/// maliyetini getirirdi (DRY).
///
/// DİKKAT: <c>exerciseId</c> filtresi verildiğinde <see cref="TotalVolume"/> ve
/// <see cref="SetCount"/> YALNIZCA o egzersizin setlerini kapsar ve <see cref="Sets"/> ile
/// birebir tutarlıdır (spec Karar 8) — ekranda "14 set" yazıp listede 4 set göstermemek için.
/// </summary>
public record HistorySessionResponse(
    long SessionId,
    DateTime StartedAt,
    DateTime? EndedAt,
    string? TemplateName,
    string? Notes,
    decimal TotalVolume,
    int SetCount,
    IReadOnlyList<SetEntryResponse> Sets);
```

- [ ] **Adım 4: Servisi yaz**

`src/Grind.Api/Services/IWorkoutHistoryService.cs`:

```csharp
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.History;

namespace Grind.Api.Services;

/// <summary>
/// Antrenman geçmişi sorgusu. SALT OKUMA: <c>SaveChangesAsync</c> çağırmaz, <c>IUnitOfWork</c>
/// almaz.
/// </summary>
public interface IWorkoutHistoryService
{
    /// <summary>
    /// Filtreye uyan oturumlar, yeniden eskiye, setleriyle birlikte. Erişilemeyen bir
    /// <c>ExerciseId</c> için NotFoundException (404); sonuç yoksa BOŞ SAYFA (404 değil).
    /// </summary>
    Task<PagedResponse<HistorySessionResponse>> GetAsync(
        HistoryQuery query, CancellationToken cancellationToken = default);
}
```

`src/Grind.Api/Services/WorkoutHistoryService.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class WorkoutHistoryService(
    IWorkoutSessionRepository sessionRepository,
    ISetEntryRepository setEntryRepository,
    IExerciseRepository exerciseRepository,
    ICurrentUserService currentUser) : IWorkoutHistoryService
{
    /// <summary>Id İÇERMEZ — hangi id'nin var olduğunu söylemek tarama imkânı verirdi.</summary>
    private const string ExerciseNotFound = "Egzersiz bulunamadı.";

    public async Task<PagedResponse<HistorySessionResponse>> GetAsync(
        HistoryQuery query, CancellationToken cancellationToken = default)
    {
        var (fromUtc, toUtc) = LocalDayRange.Resolve(query.From, query.To);

        if (query.ExerciseId is { } exerciseId)
        {
            // Sahiplik ÖNCE doğrulanır: aksi halde başkasının egzersiz id'siyle filtrelemek
            // boş liste döndürür ve "bu id var ama sende yok" bilgisini sızdırırdı.
            _ = await exerciseRepository.GetVisibleByIdAsync(
                    exerciseId, currentUser.UserId, cancellationToken: cancellationToken)
                ?? throw new NotFoundException(ExerciseNotFound);
        }

        var (sessions, totalCount) = await sessionRepository.GetHistoryPageAsync(
            currentUser.UserId,
            fromUtc,
            toUtc,
            query.ExerciseId,
            skip: (query.Page - 1) * query.PageSize,
            take: query.PageSize,
            cancellationToken);

        // Setler oturum başına değil, sayfanın tamamı için TEK sorguda çekilir (N+1 yok).
        var sets = await setEntryRepository.GetForSessionsAsync(
            sessions.Select(s => s.Id).ToList(), currentUser.UserId, query.ExerciseId, cancellationToken);

        var setsBySession = sets
            .GroupBy(s => s.WorkoutSessionId)
            .ToDictionary(g => g.Key, IReadOnlyList<SetEntry> (g) => g.ToList());

        var items = sessions
            .Select(s => ToResponse(s, setsBySession.GetValueOrDefault(s.Id, [])))
            .ToList();

        return new PagedResponse<HistorySessionResponse>(
            items, query.Page, query.PageSize, totalCount);
    }

    private static HistorySessionResponse ToResponse(
        WorkoutSession session, IReadOnlyList<SetEntry> sets) => new(
        session.Id,
        session.StartedAt,
        session.EndedAt,
        session.Template?.Name,
        session.Notes,
        // Toplamlar DÖNEN setlerden hesaplanıyor: egzersiz filtresi varsa toplam da filtreli
        // olur ve listeyle tutarlı kalır (spec Karar 8).
        sets.Sum(s => s.Weight * s.Reps),
        sets.Count,
        sets.Select(ToSetResponse).ToList());

    private static SetEntryResponse ToSetResponse(SetEntry set) => new(
        set.Id,
        set.WorkoutSessionId,
        set.ExerciseId,
        set.Exercise.Name,
        set.Weight,
        set.Reps,
        set.RecordType,
        set.Rir,
        set.CreatedAt);
}
```

- [ ] **Adım 5: Testleri çalıştır**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~WorkoutHistoryServiceTests"`
Beklenen: 11 test PASS.

- [ ] **Adım 6: Commit**

```bash
git add src/Grind.Api/Models/Dtos/Common src/Grind.Api/Models/Dtos/History src/Grind.Api/Services/IWorkoutHistoryService.cs src/Grind.Api/Services/WorkoutHistoryService.cs tests/Grind.Tests/Services/WorkoutHistoryServiceTests.cs
git commit -m "feat(history): tarih ve egzersiz filtreli sayfali antrenman gecmisi"
```

---

## Görev 6: `StatsService` + istatistik DTO'ları

**Files:**
- Create: `src/Grind.Api/Models/Dtos/Stats/StatsRangeQuery.cs`
- Create: `src/Grind.Api/Models/Dtos/Stats/VolumeSummaryResponse.cs`
- Create: `src/Grind.Api/Models/Dtos/Stats/DailyVolumeResponse.cs`
- Create: `src/Grind.Api/Models/Dtos/Stats/ExerciseVolumeResponse.cs`
- Create: `src/Grind.Api/Models/Dtos/Stats/CalendarResponse.cs`
- Create: `src/Grind.Api/Models/Dtos/Stats/CalendarDayResponse.cs`
- Create: `src/Grind.Api/Services/IStatsService.cs`
- Create: `src/Grind.Api/Services/StatsService.cs`
- Test: `tests/Grind.Tests/Services/StatsServiceTests.cs`

**Interfaces:**
- Consumes: `LocalDayRange.Resolve`, `TurkeyDay.LocalDateOf`, `StreakCalculator.Calculate`
  (Görev 1-2); `IWorkoutSessionRepository.GetSessionAggregatesAsync`/`GetTrainedSessionStartsAsync`
  (Görev 3); `ISetEntryRepository.GetVolumeByExerciseAsync` (Görev 4); `ICurrentUserService`;
  `TimeProvider`
- Produces:
  - `record VolumeSummaryResponse<T>(DateOnly? From, DateOnly? To, decimal TotalVolume, IReadOnlyList<T> Items)`
  - `record DailyVolumeResponse(DateOnly Date, decimal Volume, int SetCount, int SessionCount)`
  - `record ExerciseVolumeResponse(long ExerciseId, string ExerciseName, decimal Volume, int SetCount)`
  - `record CalendarResponse(DateOnly? From, DateOnly? To, IReadOnlyList<CalendarDayResponse> Days, int TrainedDayCount, int CurrentStreak, int LongestStreak)`
  - `record CalendarDayResponse(DateOnly Date, int SessionCount, int SetCount, decimal Volume)`
  - `IStatsService`: `GetDailyVolumeAsync`, `GetVolumeByExerciseAsync`, `GetCalendarAsync`
    (hepsi `StatsRangeQuery` alır)

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Services/StatsServiceTests.cs`:

```csharp
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
public class StatsServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    private sealed class SahteSaat(DateTime utcNow) : TimeProvider
    {
        public DateTime UtcNow { get; set; } = utcNow;
        public override DateTimeOffset GetUtcNow() => new(UtcNow, TimeSpan.Zero);
    }

    /// <summary>TR 12 Mart 20:00 (UTC 17:00) — "bugün" 12 Mart.</summary>
    private static DateTime Bugun => new(2026, 3, 12, 17, 0, 0, DateTimeKind.Utc);

    private static async Task<(AppDbContext Context, User User, Exercise Exercise,
        StatsService Service, SahteSaat Saat, IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var saat = new SahteSaat(Bugun);
        var service = new StatsService(
            new WorkoutSessionRepository(context), new SetEntryRepository(context),
            new StubCurrentUser(user.Id), saat);

        return (context, user, exercise, service, saat, transaction);
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

    // ---- Günlük hacim ----

    [Fact]
    public async Task Gunluk_hacim_gun_bazinda_toplanir()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Bugun, (100m, 8));
            Seed(context, user, exercise, Bugun.AddDays(-1), (60m, 10));
            await context.SaveChangesAsync();

            var ozet = await service.GetDailyVolumeAsync(new StatsRangeQuery());

            Assert.Equal(2, ozet.Items.Count);
            Assert.Equal(800m + 600m, ozet.TotalVolume);
            // Günler eskiden yeniye sıralı — grafik ekseni böyle çizilir.
            Assert.Equal(ozet.Items.Select(i => i.Date).Order(), ozet.Items.Select(i => i.Date));
        }
    }

    /// <summary>
    /// Aynı günde iki oturum (CLAUDE.md: sabah/akşam) tek güne toplanır ama SessionCount 2'dir.
    /// </summary>
    [Fact]
    public async Task Ayni_gunun_iki_oturumu_tek_gunde_toplanir()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Bugun, (100m, 8));
            Seed(context, user, exercise, Bugun.AddHours(2), (100m, 8));
            await context.SaveChangesAsync();

            var gun = Assert.Single((await service.GetDailyVolumeAsync(new StatsRangeQuery())).Items);

            Assert.Equal(2, gun.SessionCount);
            Assert.Equal(2, gun.SetCount);
            Assert.Equal(1600m, gun.Volume);
        }
    }

    /// <summary>
    /// AYIRT EDİCİ: UTC 21:30, TR'de ertesi gün 00:30'dur. Gün UTC'ye göre hesaplansaydı
    /// antrenman bir gün geriye yazılırdı.
    /// </summary>
    [Fact]
    public async Task Gece_yarisini_asan_antrenman_ertesi_TR_gunune_yazilir()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, new DateTime(2026, 3, 10, 21, 30, 0, DateTimeKind.Utc), (100m, 8));
            await context.SaveChangesAsync();

            var gun = Assert.Single((await service.GetDailyVolumeAsync(new StatsRangeQuery())).Items);

            Assert.Equal(new DateOnly(2026, 3, 11), gun.Date);
        }
    }

    [Fact]
    public async Task Gunluk_hacim_araliga_gore_filtrelenir()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Bugun, (100m, 8));
            Seed(context, user, exercise, Bugun.AddDays(-10), (60m, 10));
            await context.SaveChangesAsync();

            var ozet = await service.GetDailyVolumeAsync(new StatsRangeQuery
            {
                From = new DateOnly(2026, 3, 12), To = new DateOnly(2026, 3, 12)
            });

            Assert.Equal(800m, ozet.TotalVolume);
            Assert.Single(ozet.Items);
        }
    }

    [Fact]
    public async Task Ters_aralik_istatistikte_de_reddedilir()
    {
        var (_, _, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(
                () => service.GetDailyVolumeAsync(new StatsRangeQuery
                {
                    From = new DateOnly(2026, 3, 12), To = new DateOnly(2026, 3, 1)
                }));
        }
    }

    // ---- Egzersiz bazlı hacim ----

    [Fact]
    public async Task Egzersiz_hacmi_buyukten_kucuge_siralanir()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var hafif = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            context.Add(hafif);
            await context.SaveChangesAsync();

            var session = Seed(context, user, exercise, Bugun, (100m, 10));   // 1000
            context.Add(new SetEntry
            {
                WorkoutSession = session, Exercise = hafif,
                Weight = 20m, Reps = 10, RecordType = RecordType.None, CreatedAt = Bugun
            });                                                               // 200
            await context.SaveChangesAsync();

            var ozet = await service.GetVolumeByExerciseAsync(new StatsRangeQuery());

            Assert.Equal([1000m, 200m], ozet.Items.Select(i => i.Volume));
            Assert.Equal(1200m, ozet.TotalVolume);
            Assert.Equal(exercise.Name, ozet.Items[0].ExerciseName);
        }
    }

    [Fact]
    public async Task Egzersiz_hacmi_baskasinin_setlerini_saymaz()
    {
        var (context, _, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            context.Add(digerKullanici);
            await context.SaveChangesAsync();

            Seed(context, digerKullanici, exercise, Bugun, (100m, 8));
            await context.SaveChangesAsync();

            var ozet = await service.GetVolumeByExerciseAsync(new StatsRangeQuery());

            Assert.Empty(ozet.Items);
            Assert.Equal(0m, ozet.TotalVolume);
        }
    }

    // ---- Takvim ----

    [Fact]
    public async Task Takvim_antrenman_gunlerini_ve_seriyi_dondurur()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Bugun, (100m, 8));
            Seed(context, user, exercise, Bugun.AddDays(-1), (100m, 8));
            await context.SaveChangesAsync();

            var takvim = await service.GetCalendarAsync(new StatsRangeQuery());

            Assert.Equal(2, takvim.Days.Count);
            Assert.Equal(2, takvim.TrainedDayCount);
            Assert.Equal(2, takvim.CurrentStreak);
            Assert.Equal(2, takvim.LongestStreak);
        }
    }

    /// <summary>Seti olmayan oturum antrenman günü değildir (spec Karar 3).</summary>
    [Fact]
    public async Task Seti_olmayan_oturum_takvime_girmez()
    {
        var (context, user, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var bos = TestDatabase.NewSession(user);
            bos.StartedAt = Bugun;
            context.Add(bos);
            await context.SaveChangesAsync();

            var takvim = await service.GetCalendarAsync(new StatsRangeQuery());

            Assert.Empty(takvim.Days);
            Assert.Equal(0, takvim.CurrentStreak);
        }
    }

    /// <summary>
    /// LOAD-BEARING (spec Karar 5): seri ARALIKTAN BAĞIMSIZ, tüm geçmişten hesaplanır.
    /// Dar bir aralık sorulduğunda seri kırılmış görünmemeli — kullanıcı "bu ay" filtresinde
    /// 40 günlük serisini 1 olarak görmesin.
    /// </summary>
    [Fact]
    public async Task Dar_aralik_seriyi_kirmaz()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Bugun, (100m, 8));
            Seed(context, user, exercise, Bugun.AddDays(-1), (100m, 8));
            Seed(context, user, exercise, Bugun.AddDays(-2), (100m, 8));
            await context.SaveChangesAsync();

            var takvim = await service.GetCalendarAsync(new StatsRangeQuery
            {
                From = new DateOnly(2026, 3, 12), To = new DateOnly(2026, 3, 12)
            });

            Assert.Single(takvim.Days);          // aralık yalnızca bugünü kapsıyor
            Assert.Equal(1, takvim.TrainedDayCount);
            Assert.Equal(3, takvim.CurrentStreak);   // ama seri tüm geçmişten
        }
    }

    /// <summary>
    /// Bugün henüz antrenman yokken seri korunur (spec Karar 3) — saat bu yüzden enjekte
    /// ediliyor: gerçek saatle bu test yazılamazdı.
    /// </summary>
    [Fact]
    public async Task Bugun_antrenman_yokken_seri_korunur()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Bugun.AddDays(-1), (100m, 8));
            Seed(context, user, exercise, Bugun.AddDays(-2), (100m, 8));
            await context.SaveChangesAsync();

            var takvim = await service.GetCalendarAsync(new StatsRangeQuery());

            Assert.Equal(2, takvim.CurrentStreak);
        }
    }
}
```

- [ ] **Adım 2: Testlerin derlenmediğini gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~StatsServiceTests"`
Beklenen: derleme hatası — `StatsService` ve DTO'lar yok.

- [ ] **Adım 3: DTO'ları yaz**

`src/Grind.Api/Models/Dtos/Stats/StatsRangeQuery.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Üç istatistik ucunun ortak parametreleri. TR yerel günü, iki ucu da dahil, ikisi de
/// opsiyonel (verilmezse o yönde sınır yok). Tek bir tip: üç uçta üç ayrı sorgu sınıfı
/// tanımlamak aynı kuralı üç kez yazmak olurdu.
/// </summary>
public class StatsRangeQuery
{
    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }
}
```

`src/Grind.Api/Models/Dtos/Stats/VolumeSummaryResponse.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Hacim özeti zarfı. Generic: gün bazlı ve egzersiz bazlı uçlar aynı zarfı paylaşır ama
/// satır tipleri ayrıdır — tek bir satır tipinde hem <c>date</c> hem <c>exerciseId</c> taşıyıp
/// yarısını null bırakmak, istemcinin "hangi alan dolu" diye tahmin etmesi demek olurdu
/// (spec Karar 4).
/// <c>From</c>/<c>To</c> isteğin kendisidir; null ise o yönde sınır yoktu.
/// </summary>
public record VolumeSummaryResponse<T>(
    DateOnly? From,
    DateOnly? To,
    decimal TotalVolume,
    IReadOnlyList<T> Items);
```

`src/Grind.Api/Models/Dtos/Stats/DailyVolumeResponse.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Bir TR gününün toplamları. <see cref="SessionCount"/> ayrı bir alan çünkü bir günde birden
/// fazla antrenman olabilir (CLAUDE.md: sabah/akşam) ve "3 set / 1 oturum" ile "3 set / 2 oturum"
/// kullanıcı için farklı bilgilerdir.
/// </summary>
public record DailyVolumeResponse(DateOnly Date, decimal Volume, int SetCount, int SessionCount);
```

`src/Grind.Api/Models/Dtos/Stats/ExerciseVolumeResponse.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Stats;

/// <summary>Bir egzersizin aralıktaki toplam hacmi. Liste hacme göre büyükten küçüğe sıralıdır.</summary>
public record ExerciseVolumeResponse(
    long ExerciseId, string ExerciseName, decimal Volume, int SetCount);
```

`src/Grind.Api/Models/Dtos/Stats/CalendarDayResponse.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Antrenman yapılmış bir TR günü. Antrenman YAPILMAYAN günler listede HİÇ yer almaz —
/// boş günleri sıfırlarla doldurmak yanıtı gereksiz büyütürdü; takvim ızgarasındaki boşlukları
/// istemci zaten biliyor.
/// </summary>
public record CalendarDayResponse(DateOnly Date, int SessionCount, int SetCount, decimal Volume);
```

`src/Grind.Api/Models/Dtos/Stats/CalendarResponse.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Takvim/katılım özeti. <see cref="TrainedDayCount"/> ARALIĞA aittir, ama
/// <see cref="CurrentStreak"/> ve <see cref="LongestStreak"/> TÜM GEÇMİŞTEN hesaplanır
/// (spec Karar 5): aksi halde "bu ay" filtresi 40 günlük bir seriyi yapay olarak kırardı.
/// </summary>
public record CalendarResponse(
    DateOnly? From,
    DateOnly? To,
    IReadOnlyList<CalendarDayResponse> Days,
    int TrainedDayCount,
    int CurrentStreak,
    int LongestStreak);
```

- [ ] **Adım 4: Servisi yaz**

`src/Grind.Api/Services/IStatsService.cs`:

```csharp
using Grind.Api.Models.Dtos.Stats;

namespace Grind.Api.Services;

/// <summary>
/// Hacim ve katılım istatistikleri. SALT OKUMA: <c>SaveChangesAsync</c> çağırmaz.
/// Yeni tablo YOKTUR — hepsi mevcut oturum/set satırlarından sorgulanır (CLAUDE.md).
/// </summary>
public interface IStatsService
{
    /// <summary>TR günü bazında hacim, eskiden yeniye.</summary>
    Task<VolumeSummaryResponse<DailyVolumeResponse>> GetDailyVolumeAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default);

    /// <summary>Egzersiz bazında hacim, büyükten küçüğe.</summary>
    Task<VolumeSummaryResponse<ExerciseVolumeResponse>> GetVolumeByExerciseAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default);

    /// <summary>
    /// Aralıktaki antrenman günleri + seriler. Seriler aralıktan BAĞIMSIZ (spec Karar 5).
    /// </summary>
    Task<CalendarResponse> GetCalendarAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default);
}
```

`src/Grind.Api/Services/StatsService.cs`:

```csharp
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class StatsService(
    IWorkoutSessionRepository sessionRepository,
    ISetEntryRepository setEntryRepository,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IStatsService
{
    public async Task<VolumeSummaryResponse<DailyVolumeResponse>> GetDailyVolumeAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default)
    {
        var days = await DailyBucketsAsync(query, cancellationToken);

        var items = days
            .Select(d => new DailyVolumeResponse(d.Date, d.Volume, d.SetCount, d.SessionCount))
            .ToList();

        return new VolumeSummaryResponse<DailyVolumeResponse>(
            query.From, query.To, items.Sum(i => i.Volume), items);
    }

    public async Task<VolumeSummaryResponse<ExerciseVolumeResponse>> GetVolumeByExerciseAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default)
    {
        var (fromUtc, toUtc) = LocalDayRange.Resolve(query.From, query.To);

        var volumes = await setEntryRepository.GetVolumeByExerciseAsync(
            currentUser.UserId, fromUtc, toUtc, cancellationToken);

        var items = volumes
            .OrderByDescending(v => v.Volume)
            .ThenBy(v => v.ExerciseName)
            .Select(v => new ExerciseVolumeResponse(v.ExerciseId, v.ExerciseName, v.Volume, v.SetCount))
            .ToList();

        return new VolumeSummaryResponse<ExerciseVolumeResponse>(
            query.From, query.To, items.Sum(i => i.Volume), items);
    }

    public async Task<CalendarResponse> GetCalendarAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default)
    {
        var days = await DailyBucketsAsync(query, cancellationToken);

        // Seriler ARALIKTAN BAĞIMSIZ: tüm geçmişteki antrenman günleri okunur (spec Karar 5).
        var starts = await sessionRepository.GetTrainedSessionStartsAsync(
            currentUser.UserId, cancellationToken);

        var today = TurkeyDay.LocalDateOf(timeProvider.GetUtcNow().UtcDateTime);
        var (current, longest) = StreakCalculator.Calculate(
            starts.Select(TurkeyDay.LocalDateOf), today);

        return new CalendarResponse(
            query.From,
            query.To,
            days.Select(d => new CalendarDayResponse(d.Date, d.SessionCount, d.SetCount, d.Volume)).ToList(),
            days.Count,
            current,
            longest);
    }

    /// <summary>
    /// Oturum toplamlarını TR günlerine yerleştirir. Gruplama BELLEKTE: gün sınırı politikası
    /// <see cref="TurkeyDay"/>'de yaşıyor ve SQL'de <c>AT TIME ZONE</c> ile ikinci bir kopyası
    /// yazılmıyor (spec Karar 6). Belleğe gelen satır sayısı OTURUM sayısıyla sınırlı — setler
    /// hiç taşınmıyor, toplamları SQL yapıyor.
    /// </summary>
    private async Task<IReadOnlyList<DayBucket>> DailyBucketsAsync(
        StatsRangeQuery query, CancellationToken cancellationToken)
    {
        var (fromUtc, toUtc) = LocalDayRange.Resolve(query.From, query.To);

        var aggregates = await sessionRepository.GetSessionAggregatesAsync(
            currentUser.UserId, fromUtc, toUtc, cancellationToken);

        return aggregates
            .GroupBy(a => TurkeyDay.LocalDateOf(a.StartedAt))
            .Select(g => new DayBucket(
                g.Key, g.Sum(a => a.Volume), g.Sum(a => a.SetCount), g.Count()))
            .OrderBy(d => d.Date)
            .ToList();
    }

    private record DayBucket(DateOnly Date, decimal Volume, int SetCount, int SessionCount);
}
```

- [ ] **Adım 5: Testleri çalıştır**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~StatsServiceTests"`
Beklenen: 11 test PASS.

- [ ] **Adım 6: Commit**

```bash
git add src/Grind.Api/Models/Dtos/Stats src/Grind.Api/Services/IStatsService.cs src/Grind.Api/Services/StatsService.cs tests/Grind.Tests/Services/StatsServiceTests.cs
git commit -m "feat(stats): gunluk ve egzersiz bazli hacim, takvim ve seri"
```

---

## Görev 7: Controller'lar, DI ve uçtan uca testler

**Files:**
- Create: `src/Grind.Api/Controllers/HistoryController.cs`
- Create: `src/Grind.Api/Controllers/StatsController.cs`
- Modify: `src/Grind.Api/Services/DependencyInjection.cs`
- Test: `tests/Grind.Tests/Integration/QueryEndpointsTests.cs`
- Modify: `PLAN.md`

**Interfaces:**
- Consumes: `IWorkoutHistoryService` (Görev 5), `IStatsService` (Görev 6)

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Integration/QueryEndpointsTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca: uygulama gerçekten ayağa kalkar, JWT üretilir, veriler POST /api/sets ile girilir.
/// Geçmişe dönük veri girişi API'de YOK (Faz 8 kararı), bu yüzden buradaki senaryolar BUGÜNE
/// aittir; gün sınırı ve seri derinliği servis/birim testlerinde sahte saatle sınanır.
/// </summary>
[Trait("Category", "Database")]
public class QueryEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = $"qe_{Guid.NewGuid():N}"[..20],
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    private static async Task<long> CreateExerciseAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/exercises", new CreateExerciseRequest
        {
            Name = $"Egzersiz {Guid.NewGuid():N}",
            Category = ExerciseCategory.Push
        }, Json);
        response.EnsureSuccessStatusCode();
        var olusan = await response.Content.ReadFromJsonAsync<ExerciseResponse>(Json);
        return olusan!.Id;
    }

    private static async Task PostSetAsync(HttpClient client, long exerciseId, decimal weight, int reps)
    {
        var response = await client.PostAsJsonAsync("/api/sets",
            new CreateSetRequest { ExerciseId = exerciseId, Weight = weight, Reps = reps }, Json);
        response.EnsureSuccessStatusCode();
    }

    [Theory]
    [InlineData("/api/history")]
    [InlineData("/api/stats/volume/daily")]
    [InlineData("/api/stats/volume/by-exercise")]
    [InlineData("/api/stats/calendar")]
    public async Task Tokensiz_istekler_401_verir(string path)
    {
        var response = await factory.CreateClient().GetAsync(path);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Gecmis_oturumu_setleriyle_ve_toplamiyla_dondurur()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        await PostSetAsync(client, exerciseId, 100m, 8);
        await PostSetAsync(client, exerciseId, 60m, 10);

        var sayfa = await client.GetFromJsonAsync<PagedResponse<HistorySessionResponse>>(
            "/api/history", Json);

        var oturum = Assert.Single(sayfa!.Items);
        Assert.Equal(2, oturum.SetCount);
        Assert.Equal(100m * 8 + 60m * 10, oturum.TotalVolume);
        Assert.Equal(2, oturum.Sets.Count);
        Assert.Equal(1, sayfa.Page);
        Assert.Equal(1, sayfa.TotalCount);
        Assert.Equal(1, sayfa.TotalPages);
    }

    [Fact]
    public async Task Gecmis_baskasinin_oturumlarini_gostermez()
    {
        var sahip = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(sahip);
        await PostSetAsync(sahip, exerciseId, 100m, 8);

        var digerKullanici = await AuthenticatedClientAsync();
        var sayfa = await digerKullanici.GetFromJsonAsync<PagedResponse<HistorySessionResponse>>(
            "/api/history", Json);

        Assert.Empty(sayfa!.Items);
    }

    [Fact]
    public async Task Gecmis_baskasinin_egzersiziyle_filtrelenirse_404_verir()
    {
        var sahip = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(sahip);

        var davetsiz = await AuthenticatedClientAsync();
        var response = await davetsiz.GetAsync($"/api/history?exerciseId={exerciseId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Ters_tarih_araligi_400_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.GetAsync("/api/history?from=2026-03-10&to=2026-03-01");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>Sayfa boyutu sınırı DTO'da: 0 gönderilirse model doğrulaması 400 verir.</summary>
    [Fact]
    public async Task Gecersiz_sayfa_boyutu_400_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.GetAsync("/api/history?pageSize=0");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Gunluk_hacim_bugunun_toplamini_verir()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        await PostSetAsync(client, exerciseId, 100m, 8);

        var ozet = await client.GetFromJsonAsync<VolumeSummaryResponse<DailyVolumeResponse>>(
            "/api/stats/volume/daily", Json);

        var gun = Assert.Single(ozet!.Items);
        Assert.Equal(800m, gun.Volume);
        Assert.Equal(1, gun.SessionCount);
        Assert.Equal(800m, ozet.TotalVolume);
    }

    [Fact]
    public async Task Egzersiz_bazli_hacim_egzersiz_adiyla_doner()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        await PostSetAsync(client, exerciseId, 100m, 8);

        var ozet = await client.GetFromJsonAsync<VolumeSummaryResponse<ExerciseVolumeResponse>>(
            "/api/stats/volume/by-exercise", Json);

        var satir = Assert.Single(ozet!.Items, i => i.ExerciseId == exerciseId);
        Assert.Equal(800m, satir.Volume);
        Assert.Equal(1, satir.SetCount);
        Assert.False(string.IsNullOrWhiteSpace(satir.ExerciseName));
    }

    [Fact]
    public async Task Takvim_bugunu_ve_seriyi_dondurur()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        await PostSetAsync(client, exerciseId, 100m, 8);

        var takvim = await client.GetFromJsonAsync<CalendarResponse>("/api/stats/calendar", Json);

        Assert.Equal(1, takvim!.TrainedDayCount);
        Assert.Equal(1, takvim.CurrentStreak);
        Assert.Equal(1, takvim.LongestStreak);
        Assert.Single(takvim.Days);
    }

    /// <summary>Hiç antrenmanı olmayan kullanıcı boş özet alır — 404 değil.</summary>
    [Fact]
    public async Task Verisi_olmayan_kullanici_bos_ozet_alir()
    {
        var client = await AuthenticatedClientAsync();

        var takvim = await client.GetFromJsonAsync<CalendarResponse>("/api/stats/calendar", Json);
        var sayfa = await client.GetFromJsonAsync<PagedResponse<HistorySessionResponse>>(
            "/api/history", Json);

        Assert.Empty(takvim!.Days);
        Assert.Equal(0, takvim.CurrentStreak);
        Assert.Empty(sayfa!.Items);
        Assert.Equal(0, sayfa.TotalPages);
    }
}
```

- [ ] **Adım 2: Testlerin başarısız olduğunu gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~QueryEndpointsTests"`
Beklenen: 401 testleri 404 ile FAIL (uçlar yok), geri kalanlar FAIL.

- [ ] **Adım 3: Controller'ları ve DI kaydını yaz**

`src/Grind.Api/Controllers/HistoryController.cs`:

```csharp
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// İnce kalır: tarih aralığı çözümü, sahiplik ve toplamlar servis katmanında,
/// hata çevirisi GlobalExceptionHandler'da. Burada if/try yoktur.
/// </summary>
[ApiController]
[Authorize]
[Route("api/history")]
public class HistoryController(IWorkoutHistoryService historyService) : ControllerBase
{
    /// <summary>
    /// Antrenman geçmişi, yeniden eskiye, setleriyle. <c>from</c>/<c>to</c> TR yerel günüdür ve
    /// iki ucu da dahildir. <c>exerciseId</c> verilirse yalnızca o egzersizi içeren oturumlar
    /// döner ve oturum toplamları da o egzersize göre hesaplanır.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResponse<HistorySessionResponse>>> Get(
        [FromQuery] HistoryQuery query, CancellationToken cancellationToken)
        => Ok(await historyService.GetAsync(query, cancellationToken));
}
```

`src/Grind.Api/Controllers/StatsController.cs`:

```csharp
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/stats")]
public class StatsController(IStatsService statsService) : ControllerBase
{
    /// <summary>TR günü bazında hacim (ağırlık × tekrar), eskiden yeniye.</summary>
    [HttpGet("volume/daily")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<VolumeSummaryResponse<DailyVolumeResponse>>> GetDailyVolume(
        [FromQuery] StatsRangeQuery query, CancellationToken cancellationToken)
        => Ok(await statsService.GetDailyVolumeAsync(query, cancellationToken));

    /// <summary>
    /// Egzersiz bazında hacim, büyükten küçüğe. Gün bazlı uçtan AYRI: tek bir uçta
    /// <c>groupBy</c> parametresi, satırların yarısı boş bir DTO gerektirirdi (spec Karar 4).
    /// </summary>
    [HttpGet("volume/by-exercise")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<VolumeSummaryResponse<ExerciseVolumeResponse>>> GetVolumeByExercise(
        [FromQuery] StatsRangeQuery query, CancellationToken cancellationToken)
        => Ok(await statsService.GetVolumeByExerciseAsync(query, cancellationToken));

    /// <summary>
    /// Antrenman yapılmış günler ve seriler. Seriler aralıktan BAĞIMSIZ, tüm geçmişten
    /// hesaplanır (spec Karar 5).
    /// </summary>
    [HttpGet("calendar")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CalendarResponse>> GetCalendar(
        [FromQuery] StatsRangeQuery query, CancellationToken cancellationToken)
        => Ok(await statsService.GetCalendarAsync(query, cancellationToken));
}
```

`src/Grind.Api/Services/DependencyInjection.cs` — mevcut kayıtların ALTINA ekle:

```csharp
        services.AddScoped<IWorkoutHistoryService, WorkoutHistoryService>();
        services.AddScoped<IStatsService, StatsService>();
```

- [ ] **Adım 4: Tüm test paketini çalıştır**

Uygulama çalışıyorsa ÖNCE durdur (çalışan `Grind.Api.exe` build'i sessizce kilitler).

```bash
dotnet build -c Release --nologo
dotnet test tests/Grind.Tests
```

Beklenen: **455 test PASS**, 0 uyarı.

- [ ] **Adım 5: Commit**

```bash
git add src/Grind.Api/Controllers/HistoryController.cs src/Grind.Api/Controllers/StatsController.cs src/Grind.Api/Services/DependencyInjection.cs tests/Grind.Tests/Integration/QueryEndpointsTests.cs
git commit -m "feat(api): gecmis ve istatistik uclari"
```

- [ ] **Adım 6: `PLAN.md`'yi güncelle**

Faz 9'un dört kutusunu işaretle, her satıra ne yapıldığını yaz (Faz 8'deki biçimin aynısı; test
sayılarını gerçek koşudan ve dosyaları sayarak yaz, tahmin etme). Faz 8'den devreden notların
durumunu güncelle (1 ve 2 açık kalır — `Rir` temizleme ve geçmişe dönük giriş bu fazın kapsamında
değildi; 3'ün "bellekte gruplama" uyarısı artık geçmiş/istatistik uçları için de geçerli).
Faz 7'den devreden tzdata notunu (dağıtım ortamında saat dilimi veritabanı bulunmalı) bu fazın
`TurkeyDay` kullanımını artırdığını belirterek Faz 10'a devret.

Yeni devreden notlar bölümü ekle:

- `GET /api/sessions` (Faz 7) hâlâ sayfalamasız — oturum sayısı büyürse `PagedResponse` ile
  hizalanmalı.
- Takvim/günlük hacim gruplaması bellekte; aralık binlerce oturuma çıkarsa SQL'e taşınmalı.
- Haftalık/aylık hacim gruplaması yok (üçüncü bir uç gerektirir); gerçek ihtiyaç çıkarsa eklenir.

```bash
git add PLAN.md
git commit -m "docs: Faz 9 tamamlandi, devreden notlar guncellendi"
```

---

## Self-Review Notları (plan yazarından)

Spec kapsaması kontrol edildi; her spec kararının karşılığı var:
- Karar 1 (oturum listesi + gömülü setler) → Görev 5 (`HistorySessionResponse`, servis) + Görev 7 (uç)
- Karar 2 (page/pageSize + toplam) → Görev 5 (`PagedResponse`, `HistoryQuery`) + Görev 3 (sayfa + sayım tek metotta)
- Karar 3 (en az bir set; bugün seriyi kırmaz) → Görev 2 (`StreakCalculator`) + Görev 3 (`Any()` filtresi)
- Karar 4 (hacim: oturum toplamı + iki ayrı uç) → Görev 5 (oturum toplamı) + Görev 6 + Görev 7
- Karar 5 (takvim: aralık + günler + seriler; seriler aralıktan bağımsız) → Görev 6 (`GetCalendarAsync`) + Görev 3 (`GetTrainedSessionStartsAsync`)
- Karar 6 (gruplama bellekte, toplama SQL'de) → Görev 3 + Görev 6 (`DailyBucketsAsync`)
- Karar 7 (setin günü = oturumun `StartedAt`'i) → Görev 4 (hacim filtresi) + Görev 6 (gruplama)
- Karar 8 (filtre toplamları) → Görev 5 (`ToResponse` dönen setlerden hesaplar + testi)
- Hata tablosu → Görev 1 (`LocalDayRange`), Görev 5 (404), Görev 7 (400/401 uçtan uca)

**Bilinçli olarak KAPSAM DIŞI:**
- Haftalık/aylık gruplama, `GET /api/sessions`'a sayfalama — spec'te gerekçesi var.
- Vücut ağırlığı karşılaştırması (Faz 10), export (Faz 11).
- Geçmişe dönük set girişi — Faz 8'in kararı, değişmedi.
