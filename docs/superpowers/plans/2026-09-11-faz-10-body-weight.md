# Faz 10 — Vücut Ağırlığı Takibi Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcı tartı kaydedip listeleyebilsin, düzeltip silebilsin; kilosunu antrenman hacmiyle
aynı zaman ekseninde görebilsin — yeni tablo açmadan (Faz 1'deki `BodyWeightLog` tablosu kullanılır).

**Architecture:** Önce iki ortak parça yerine oturur: Faz 8'in iki-ondalık ağırlık kuralı
`SetEntryService`'in özel metodundan `Common/Validation/WeightScale`'e taşınır, Faz 9'un tarih aralıklı
sayfalama parametreleri ve taşma korumalı `skip` hesabı `PagedRangeQuery` tabanına çekilir. Sonra
`BodyWeightLog` için repository + servis + controller yazılır. Karşılaştırma ucu `StatsService`'e eklenir
ve hacim serisini Faz 9'un günlük gruplamasından **aynı yoldan** alır — böylece iki uç aynı günü asla
farklı raporlamaz.

**Tech Stack:** .NET 10, ASP.NET Core Web API, EF Core 10 (Npgsql), PostgreSQL 17 (Docker, host port
5433), xUnit.

**Spec:** `docs/superpowers/specs/2026-09-11-body-weight-design.md` (onaylandı 2026-09-11)

## Global Constraints

Her görevin gereksinimleri bu bölümü örtük olarak içerir.

- **Katman kuralı:** `DbContext`'e yalnızca `Repositories/` ve `Data/` dokunur. Controller iş
  mantığı içermez, `if`/`try` taşımaz — hata çevirisi `GlobalExceptionHandler`'da.
- **IDOR:** `BodyWeightLog` sahipliği doğrudan `b.UserId == userId`. Her sorgu bu yüklemi taşır.
  Başkasının kaydı → **404**, nötr mesajla (id söylenmez). `IRepository<T>.GetByIdAsync` sahiplik
  kontrolü YAPMAZ; kullanmak IDOR'dur.
- **Tek commit:** Bir yazma işlemi tek `SaveChangesAsync` altında toplanır. Okuma servisleri
  (`StatsService`) `SaveChangesAsync` çağırmaz.
- **Zaman:** `DateTime.UtcNow` doğrudan çağrılmaz — enjekte edilen `TimeProvider` kullanılır.
- **Gün sınırı:** Bir tartının günü `RecordedAt`'in TR günüdür; çevirme yalnızca `TurkeyDay` /
  `LocalDayRange` üzerinden. SQL'de `AT TIME ZONE` YAZILMAZ.
- **Tarih parametreleri:** `from`/`to` TR yerel günü (`DateOnly`), iki ucu da dahil, opsiyonel;
  `from > to` → 400.
- **Sayfalama:** `PagedRangeQuery` (`page` varsayılan 1 min 1, `pageSize` varsayılan 20, 1-100);
  yanıt zarfı `PagedResponse<T>`.
- **Ağırlık (spec Karar 6):** 0,01-999,99 arası, en fazla iki ondalık (`WeightScale`).
- **`recordedAt` (spec Karar 2):** `DateTimeOffset?`; verilmezse saatin anı; UTC'ye çevrilerek saklanır;
  şimdiden **5 dakikadan** fazla ileride → 400.
- **Günlük kilo (spec Karar 1):** o TR gününün tartılarının ortalaması, 2 ondalığa
  `MidpointRounding.AwayFromZero` ile yuvarlanır.
- **Karşılaştırma (spec Karar 3):** iki ayrı seri, null alan yok; hacim serisi `GET /api/stats/volume/daily`
  ile **aynı hesap yolundan** gelir.
- **İzleme (spec Karar 8):** bu fazın yeni liste/aralık sorguları `AsNoTracking`; düzeltilecek kaydı
  getiren sorgu izlemeli. Faz 5-9'un mevcut sorgularına DOKUNULMAZ.
- **Fiil:** düzeltme yalnızca `PATCH`, en az bir alan zorunlu. `PUT` YOK.
- **Migration YOK:** `dotnet ef migrations add` ÇAĞRILMAZ.
- **Test:** Veritabanı isteyen testler `[Trait("Category", "Database")]` taşır ve transaction +
  rollback deseniyle yazılır. Test adları Türkçe. Test projesinde global using olarak yalnızca `Xunit`
  var — diğer her namespace dosya başına açıkça yazılır.
- **Commit mesajları** Türkçe, `feat(...)`/`test(...)`/`fix(...)`/`refactor(...)` önekiyle, ASCII.

---

## Dosya Haritası

**Yeni:**
- `src/Grind.Api/Common/Validation/WeightScale.cs`
- `src/Grind.Api/Models/Dtos/Common/PagedRangeQuery.cs`
- `src/Grind.Api/Models/Dtos/BodyWeight/CreateBodyWeightRequest.cs`
- `src/Grind.Api/Models/Dtos/BodyWeight/PatchBodyWeightRequest.cs`
- `src/Grind.Api/Models/Dtos/BodyWeight/BodyWeightLogResponse.cs`
- `src/Grind.Api/Models/Dtos/Stats/DailyBodyWeightResponse.cs`
- `src/Grind.Api/Models/Dtos/Stats/BodyWeightTrendResponse.cs`
- `src/Grind.Api/Repositories/IBodyWeightLogRepository.cs` / `BodyWeightLogRepository.cs`
- `src/Grind.Api/Services/IBodyWeightLogService.cs` / `BodyWeightLogService.cs`
- `src/Grind.Api/Controllers/BodyWeightsController.cs`
- `tests/Grind.Tests/Common/WeightScaleTests.cs`
- `tests/Grind.Tests/Common/PagedRangeQueryTests.cs`
- `tests/Grind.Tests/Repositories/BodyWeightLogRepositoryTests.cs`
- `tests/Grind.Tests/Services/BodyWeightLogServiceTests.cs`
- `tests/Grind.Tests/Integration/BodyWeightEndpointsTests.cs`

**Değişen:**
- `src/Grind.Api/Services/SetEntryService.cs` (özel `EnsureWeightScale` → `WeightScale`)
- `src/Grind.Api/Models/Dtos/History/HistoryQuery.cs` (artık `PagedRangeQuery`'den türer)
- `src/Grind.Api/Services/WorkoutHistoryService.cs` (`query.Skip()`)
- `src/Grind.Api/Data/DependencyInjection.cs` (+1 repository kaydı)
- `src/Grind.Api/Services/IStatsService.cs` / `StatsService.cs` (+ `GetBodyWeightTrendAsync`)
- `src/Grind.Api/Controllers/StatsController.cs` (+1 uç)
- `src/Grind.Api/Services/DependencyInjection.cs` (+1 servis kaydı)
- `tests/Grind.Tests/Services/StatsServiceTests.cs` (+ testler, `CreateAsync` kurucusu)
- `PLAN.md` (Faz 10 kutuları + devreden notlar)

**Beklenen test sayısı:** 457 → **507** (+50). Görev bazında: 7, 9, 12, 7, 15.
xUnit her `[InlineData]`'yı ayrı test sayar — Görev 5'teki 401 `[Theory]`'si 6 InlineData taşıyor.
(Sayılar planın içindeki test işaretleri sayılarak doğrulanır, elle hesaplanmaz.)

---

## Görev 1: Ortak parçalar — `WeightScale` ve `PagedRangeQuery`

**Files:**
- Create: `src/Grind.Api/Common/Validation/WeightScale.cs`
- Modify: `src/Grind.Api/Services/SetEntryService.cs`
- Create: `src/Grind.Api/Models/Dtos/Common/PagedRangeQuery.cs`
- Modify: `src/Grind.Api/Models/Dtos/History/HistoryQuery.cs`
- Modify: `src/Grind.Api/Services/WorkoutHistoryService.cs`
- Test: `tests/Grind.Tests/Common/WeightScaleTests.cs`
- Test: `tests/Grind.Tests/Common/PagedRangeQueryTests.cs`

**Interfaces:**
- Produces:
  - `WeightScale.EnsureAtMostTwoDecimals(decimal weight)` (namespace `Grind.Api.Common.Validation`) —
    fazla ondalıkta `ValidationException`
  - `class PagedRangeQuery { DateOnly? From; DateOnly? To; int Page = 1; int PageSize = 20; int Skip(); }`
    (namespace `Grind.Api.Models.Dtos.Common`)
  - `class HistoryQuery : PagedRangeQuery { long? ExerciseId; }` (davranışı değişmez)

Bu görev **davranış korur**: iki mevcut kural yer değiştirir, hiçbir yanıt değişmez. Faz 8'in
`SetEntryServiceTests.Ikiden_fazla_ondalikli_agirlik_reddedilir` ve Faz 9'un
`WorkoutHistoryServiceTests.Cok_buyuk_sayfa_numarasi_bos_sayfa_doner` testleri regresyon ağıdır ve
DEĞİŞTİRİLMEZ.

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Common/WeightScaleTests.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Validation;

namespace Grind.Tests.Common;

/// <summary>
/// Ağırlık sütunları numeric(6,2). Fazla ondalık PostgreSQL'de SESSİZCE yuvarlanır; kural bu
/// yüzden reddeder. Set ağırlığı (Faz 8) ve tartı (Faz 10) aynı kuralı paylaşır.
/// </summary>
public class WeightScaleTests
{
    [Fact]
    public void Iki_ondalik_kabul_edilir()
    {
        Assert.Null(Record.Exception(() => WeightScale.EnsureAtMostTwoDecimals(82.45m)));
    }

    [Fact]
    public void Tam_sayi_ve_sifir_kabul_edilir()
    {
        // 0 set ağırlığında geçerlidir (barfiks/dips); ölçek kuralı onu reddetmemeli.
        Assert.Null(Record.Exception(() => WeightScale.EnsureAtMostTwoDecimals(0m)));
        Assert.Null(Record.Exception(() => WeightScale.EnsureAtMostTwoDecimals(100m)));
    }

    [Fact]
    public void Uc_ondalik_reddedilir()
    {
        Assert.Throws<ValidationException>(() => WeightScale.EnsureAtMostTwoDecimals(82.455m));
    }

    /// <summary>
    /// Kural DEĞERE bakar, yazım ölçeğine değil: 100.100m ile 100.10m aynı değerdir ve saklanınca
    /// hiçbir şey kaybolmaz. Ölçeğe bakan bir uygulama (ör. basamak sayma) bunu yanlışlıkla
    /// reddederdi.
    /// </summary>
    [Fact]
    public void Sondaki_sifir_fazla_ondalik_sayilmaz()
    {
        Assert.Null(Record.Exception(() => WeightScale.EnsureAtMostTwoDecimals(100.100m)));
    }
}
```

`tests/Grind.Tests/Common/PagedRangeQueryTests.cs`:

```csharp
using Grind.Api.Models.Dtos.Common;

namespace Grind.Tests.Common;

/// <summary>
/// Sayfalı liste uçlarının ortak parametreleri. <c>Skip()</c> taşma korumalıdır — Faz 9 final
/// incelemesinde bulunan hata (<c>page=2147483647</c> → negatif OFFSET → 500) burada tek yerde
/// düzeltilmiş olarak yaşar.
/// </summary>
public class PagedRangeQueryTests
{
    [Fact]
    public void Varsayilanlar_ilk_sayfadir_ve_hic_satir_atlamaz()
    {
        var query = new PagedRangeQuery();

        Assert.Equal(1, query.Page);
        Assert.Equal(20, query.PageSize);
        Assert.Equal(0, query.Skip());
    }

    [Fact]
    public void Ucuncu_sayfa_iki_sayfa_boyu_atlar()
    {
        Assert.Equal(40, new PagedRangeQuery { Page = 3, PageSize = 20 }.Skip());
    }

    /// <summary>
    /// (int.MaxValue - 1) × 100 bir int'e sığmaz; denetimsiz çarpım negatife sarar. Sonuç
    /// negatif olmamalı — int.MaxValue'da sınırlanmalı.
    /// </summary>
    [Fact]
    public void Cok_buyuk_sayfa_numarasi_tasmaz()
    {
        Assert.Equal(int.MaxValue, new PagedRangeQuery { Page = int.MaxValue, PageSize = 100 }.Skip());
    }
}
```

- [ ] **Adım 2: Testlerin derlenmediğini gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~WeightScaleTests|FullyQualifiedName~PagedRangeQueryTests"`
Beklenen: derleme hatası — `WeightScale` ve `PagedRangeQuery` yok.

- [ ] **Adım 3: `WeightScale`'i yaz ve `SetEntryService`'i ona bağla**

`src/Grind.Api/Common/Validation/WeightScale.cs`:

```csharp
using Grind.Api.Common.Exceptions;

namespace Grind.Api.Common.Validation;

/// <summary>
/// Ağırlık sütunları (<c>SetEntry.Weight</c>, <c>BodyWeightLog.Weight</c>) numeric(6,2): daha fazla
/// ondalık PostgreSQL tarafından SESSİZCE yuvarlanır ve kullanıcının girdiği değer ile saklanan değer
/// ayrışır (set ağırlığında ayrıca rekor kararı yuvarlanmamış değer üzerinden verilir ve ağırlık
/// kovası kayar). Bu yüzden yuvarlamak yerine reddediyoruz. Kural tek yerde yaşıyor ki iki servis
/// onu iki kez yazmasın.
/// </summary>
public static class WeightScale
{
    public static void EnsureAtMostTwoDecimals(decimal weight)
    {
        if (decimal.Round(weight, 2) != weight)
        {
            throw new ValidationException("Ağırlık en fazla iki ondalık basamak taşıyabilir.");
        }
    }
}
```

`src/Grind.Api/Services/SetEntryService.cs`:
- Özel `EnsureWeightScale` metodunu ve üstündeki XML doc'u SİL (gerekçesi artık `WeightScale`'de).
- İki çağrı yerini (`CreateAsync` ve `PatchAsync` içindeki `EnsureWeightScale(weight);`)
  `WeightScale.EnsureAtMostTwoDecimals(weight);` ile değiştir.
- `using Grind.Api.Common.Validation;` ekle.
- Başka hiçbir şeye dokunma. Hata mesajı aynı kaldığı için Faz 8 testleri değişmez.

- [ ] **Adım 4: `PagedRangeQuery`'yi yaz, `HistoryQuery` ve `WorkoutHistoryService`'i ona bağla**

`src/Grind.Api/Models/Dtos/Common/PagedRangeQuery.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Common;

/// <summary>
/// Tarih aralıklı, sayfalı liste uçlarının ortak parametreleri (geçmiş, tartı listesi).
/// <c>From</c>/<c>To</c> TR yerel GÜNÜDÜR (<c>2026-03-01</c>) ve İKİ UCU DA DAHİLDİR. <c>DateOnly</c>
/// bilinçli: <c>DateTime</c> olsaydı istemcinin gönderdiği <c>2026-03-01T00:00:00Z</c> sessizce TR
/// 03:00'e denk gelir ve gecenin ilk üç saatindeki kayıtlar aralığın dışında kalırdı.
/// </summary>
public class PagedRangeQuery
{
    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Sayfa numarası 1'den küçük olamaz.")]
    public int Page { get; set; } = 1;

    [Range(1, 100, ErrorMessage = "Sayfa boyutu 1 ile 100 arasında olmalı.")]
    public int PageSize { get; set; } = 20;

    /// <summary>
    /// Atlanacak satır sayısı. <c>(Page - 1) * PageSize</c> denetimsiz (unchecked) bir int çarpımı
    /// olsaydı — proje <c>CheckForOverflowUnderflow</c> açmıyor, taşma exception fırlatmak yerine
    /// sessizce sarar — <c>[Range(1, int.MaxValue)]</c>'ın izin verdiği büyük bir sayfa numarası
    /// negatif bir değer üretir; <c>.Skip()</c> bunu PostgreSQL'e negatif bir OFFSET olarak iletir ve
    /// "OFFSET must not be negative" ile 500'e çıkar (Faz 9 final inceleme bulgusu). <c>long</c>'a
    /// genişletip <c>int.MaxValue</c>'da sınırlamak bunu önler; sonuç zaten mevcut satır sayısını
    /// fazlasıyla aştığı için "sayfanın sonunu geçmiş" boş sonuçla aynı davranışı verir.
    /// Özellik değil METOT: model binder yalnızca ayarlanabilir özellikleri bağlar ve API
    /// belgelemesi bir get-only özelliği sahte bir sorgu parametresi olarak gösterebilirdi.
    /// </summary>
    public int Skip() => (int)Math.Min((long)(Page - 1) * PageSize, int.MaxValue);
}
```

`src/Grind.Api/Models/Dtos/History/HistoryQuery.cs` — dosyanın tamamını şununla DEĞİŞTİR:

```csharp
using Grind.Api.Models.Dtos.Common;

namespace Grind.Api.Models.Dtos.History;

/// <summary>
/// Geçmiş sorgusu: ortak tarih aralığı + sayfalama (<see cref="PagedRangeQuery"/>) ve opsiyonel
/// egzersiz filtresi.
/// </summary>
public class HistoryQuery : PagedRangeQuery
{
    public long? ExerciseId { get; set; }
}
```

`src/Grind.Api/Services/WorkoutHistoryService.cs` — `GetHistoryPageAsync` çağrısındaki `skip:`
argümanını ve üstündeki uzun yorum bloğunu (taşma gerekçesi — artık `PagedRangeQuery.Skip()`'in
dokümanında) şununla DEĞİŞTİR:

```csharp
            skip: query.Skip(),   // taşma korumalı — bkz. PagedRangeQuery.Skip
```

Başka hiçbir satıra dokunma.

- [ ] **Adım 5: Testleri ve regresyon ağını çalıştır**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~WeightScaleTests|FullyQualifiedName~PagedRangeQueryTests|FullyQualifiedName~SetEntryServiceTests|FullyQualifiedName~WorkoutHistoryServiceTests|FullyQualifiedName~QueryEndpointsTests"`
Beklenen: 7 yeni test + mevcut testlerin TAMAMI PASS. Mevcut bir test kırmızıya dönerse davranış
değişmiş demektir — düzelt, testi gevşetme.

- [ ] **Adım 6: Commit**

```bash
git add src/Grind.Api/Common/Validation/WeightScale.cs src/Grind.Api/Services/SetEntryService.cs src/Grind.Api/Models/Dtos/Common/PagedRangeQuery.cs src/Grind.Api/Models/Dtos/History/HistoryQuery.cs src/Grind.Api/Services/WorkoutHistoryService.cs tests/Grind.Tests/Common/WeightScaleTests.cs tests/Grind.Tests/Common/PagedRangeQueryTests.cs
git commit -m "refactor: agirlik olcegi kurali ve sayfali aralik sorgusu ortak yere tasindi"
```

---

## Görev 2: `IBodyWeightLogRepository`

**Files:**
- Create: `src/Grind.Api/Repositories/IBodyWeightLogRepository.cs`
- Create: `src/Grind.Api/Repositories/BodyWeightLogRepository.cs`
- Modify: `src/Grind.Api/Data/DependencyInjection.cs`
- Test: `tests/Grind.Tests/Repositories/BodyWeightLogRepositoryTests.cs`

**Interfaces:**
- Consumes: `Repository<T>` tabanı (`Set`, `Add`, `Remove`)
- Produces:
  - `Task<BodyWeightLog?> GetOwnedByIdAsync(long id, long userId, CancellationToken ct = default)` — İZLEMELİ
  - `Task<(IReadOnlyList<BodyWeightLog> Items, int TotalCount)> GetPageAsync(long userId, DateTime? fromUtcInclusive, DateTime? toUtcExclusive, int skip, int take, CancellationToken ct = default)` — izlemesiz
  - `Task<IReadOnlyList<BodyWeightLog>> GetInRangeAsync(long userId, DateTime? fromUtcInclusive, DateTime? toUtcExclusive, CancellationToken ct = default)` — izlemesiz, kronolojik

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Repositories/BodyWeightLogRepositoryTests.cs`:

```csharp
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class BodyWeightLogRepositoryTests
{
    private static readonly DateTime An = new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    private static BodyWeightLog NewLog(User user, decimal weight, DateTime recordedAtUtc) =>
        new() { User = user, Weight = weight, RecordedAt = recordedAtUtc };

    [Fact]
    public async Task Baskasinin_kaydi_GetOwnedByIdAsync_ile_alinamaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var log = NewLog(sahip, 82.4m, An);
        context.AddRange(sahip, davetsiz, log);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);

        Assert.Null(await repository.GetOwnedByIdAsync(log.Id, davetsiz.Id));
    }

    /// <summary>
    /// Düzeltme ve silme bu sorgunun döndürdüğü nesneyi değiştirir; izlemesiz dönseydi
    /// SaveChanges hiçbir şey yazmazdı (spec Karar 8: yalnızca liste/aralık izlemesiz).
    /// </summary>
    [Fact]
    public async Task Kendi_kaydi_izlenerek_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var log = NewLog(user, 82.4m, An);
        context.AddRange(user, log);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);
        var bulunan = await repository.GetOwnedByIdAsync(log.Id, user.Id);

        Assert.NotNull(bulunan);
        Assert.Equal(EntityState.Unchanged, context.Entry(bulunan).State);
    }

    [Fact]
    public async Task Sayfa_toplam_sayiyla_birlikte_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.AddRange(user,
            NewLog(user, 82.4m, An), NewLog(user, 82.1m, An.AddDays(1)), NewLog(user, 81.9m, An.AddDays(2)));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);
        var (items, toplam) = await repository.GetPageAsync(user.Id, null, null, skip: 0, take: 2);

        Assert.Equal(2, items.Count);
        Assert.Equal(3, toplam);
    }

    /// <summary>Yeniden eskiye; aynı `RecordedAt`'te Id azalan (belirli sıra — Faz 8'in dersi).</summary>
    [Fact]
    public async Task Liste_yeniden_eskiye_ve_belirli_sirada_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var eski = NewLog(user, 83.0m, An.AddDays(-1));
        var ayniAnBirinci = NewLog(user, 82.4m, An);
        var ayniAnIkinci = NewLog(user, 82.5m, An);
        context.AddRange(user, eski, ayniAnBirinci, ayniAnIkinci);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);
        var (items, _) = await repository.GetPageAsync(user.Id, null, null, 0, 20);

        Assert.Equal([ayniAnIkinci.Id, ayniAnBirinci.Id, eski.Id], items.Select(i => i.Id));
    }

    [Fact]
    public async Task Sayfa_tarih_araligina_gore_filtrelenir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var araliktaki = NewLog(user, 82.4m, An);
        context.AddRange(user, NewLog(user, 83.0m, An.AddDays(-5)), araliktaki);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);
        var (items, toplam) = await repository.GetPageAsync(user.Id, An.AddDays(-1), An.AddDays(1), 0, 20);

        Assert.Equal(araliktaki.Id, Assert.Single(items).Id);
        Assert.Equal(1, toplam);
    }

    [Fact]
    public async Task Sayfa_baskasinin_kayitlarini_getirmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        context.AddRange(sahip, davetsiz, NewLog(sahip, 82.4m, An));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);
        var (items, toplam) = await repository.GetPageAsync(davetsiz.Id, null, null, 0, 20);

        Assert.Empty(items);
        Assert.Equal(0, toplam);
    }

    /// <summary>Spec Karar 8: liste sonuçları izlenmez — okuma yolu change tracker'ı doldurmamalı.</summary>
    [Fact]
    public async Task Sayfa_sonuclari_izlenmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.AddRange(user, NewLog(user, 82.4m, An));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);
        await repository.GetPageAsync(user.Id, null, null, 0, 20);

        Assert.Empty(context.ChangeTracker.Entries<BodyWeightLog>());
    }

    [Fact]
    public async Task Aralik_sorgusu_kronolojik_ve_sahiplidir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var diger = TestDatabase.NewUser();
        var yeni = NewLog(user, 82.1m, An.AddDays(1));
        var eski = NewLog(user, 82.4m, An);
        context.AddRange(user, diger, yeni, eski, NewLog(diger, 90m, An), NewLog(user, 83m, An.AddDays(-9)));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);
        var loglar = await repository.GetInRangeAsync(user.Id, An.AddDays(-1), An.AddDays(2));

        // Başkasınınki ve aralık dışındaki elenir; kalanlar eskiden yeniye.
        Assert.Equal([eski.Id, yeni.Id], loglar.Select(l => l.Id));
    }

    [Fact]
    public async Task Aralik_sorgusu_sonuclari_izlenmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.AddRange(user, NewLog(user, 82.4m, An));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new BodyWeightLogRepository(context);
        await repository.GetInRangeAsync(user.Id, null, null);

        Assert.Empty(context.ChangeTracker.Entries<BodyWeightLog>());
    }
}
```

- [ ] **Adım 2: Testlerin derlenmediğini gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~BodyWeightLogRepositoryTests"`
Beklenen: derleme hatası — `BodyWeightLogRepository` yok.

- [ ] **Adım 3: Repository'yi yaz ve kaydet**

`src/Grind.Api/Repositories/IBodyWeightLogRepository.cs`:

```csharp
using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

public interface IBodyWeightLogRepository : IRepository<BodyWeightLog>
{
    /// <summary>
    /// Başkasının kaydında null (IDOR koruması — sahiplik doğrudan <c>UserId</c> üzerinde).
    /// İZLEMELİ döner: düzeltme ve silme bu nesneyi değiştirir.
    /// </summary>
    Task<BodyWeightLog?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sayfa ve toplam sayı BİRLİKTE, aynı filtreden (ayrı metotlar filtreyi iki yerde tekrarlar ve
    /// biri değişince diğeri sessizce ayrışır). Sıralama BELİRLİDİR: <c>RecordedAt</c> azalan,
    /// eşitlikte <c>Id</c> azalan. İzlemesiz (salt okuma). Null tarih uçları sınırsızdır.
    /// </summary>
    Task<(IReadOnlyList<BodyWeightLog> Items, int TotalCount)> GetPageAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        int skip,
        int take,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Aralıktaki tüm tartılar, eskiden yeniye, izlemesiz. Karşılaştırma ucu bunları TR gününe göre
    /// bellekte gruplar — satır sayısı tartı sayısıyla sınırlı (günde birkaç).
    /// </summary>
    Task<IReadOnlyList<BodyWeightLog>> GetInRangeAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default);
}
```

`src/Grind.Api/Repositories/BodyWeightLogRepository.cs`:

```csharp
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class BodyWeightLogRepository(AppDbContext context)
    : Repository<BodyWeightLog>(context), IBodyWeightLogRepository
{
    public Task<BodyWeightLog?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId, cancellationToken);

    public async Task<(IReadOnlyList<BodyWeightLog> Items, int TotalCount)> GetPageAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var query = FilterByRange(userId, fromUtcInclusive, toUtcExclusive);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .AsNoTracking()
            .OrderByDescending(b => b.RecordedAt)
            .ThenByDescending(b => b.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<IReadOnlyList<BodyWeightLog>> GetInRangeAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default)
        => await FilterByRange(userId, fromUtcInclusive, toUtcExclusive)
            .AsNoTracking()
            .OrderBy(b => b.RecordedAt)
            .ThenBy(b => b.Id)
            .ToListAsync(cancellationToken);

    private IQueryable<BodyWeightLog> FilterByRange(
        long userId, DateTime? fromUtcInclusive, DateTime? toUtcExclusive)
    {
        var query = Set.Where(b => b.UserId == userId);

        if (fromUtcInclusive is { } from)
        {
            query = query.Where(b => b.RecordedAt >= from);
        }

        if (toUtcExclusive is { } to)
        {
            query = query.Where(b => b.RecordedAt < to);
        }

        return query;
    }
}
```

`src/Grind.Api/Data/DependencyInjection.cs` — mevcut repository kayıtlarının arasına (IUnitOfWork'ten
önce) ekle:

```csharp
        services.AddScoped<IBodyWeightLogRepository, BodyWeightLogRepository>();
```

- [ ] **Adım 4: Testleri çalıştır**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~BodyWeightLogRepositoryTests"`
Beklenen: 9 test PASS.

- [ ] **Adım 5: Commit**

```bash
git add src/Grind.Api/Repositories/IBodyWeightLogRepository.cs src/Grind.Api/Repositories/BodyWeightLogRepository.cs src/Grind.Api/Data/DependencyInjection.cs tests/Grind.Tests/Repositories/BodyWeightLogRepositoryTests.cs
git commit -m "feat(data): tarti kayitlari icin sahipli, sayfali ve aralikli sorgular"
```

---

## Görev 3: `BodyWeightLogService` + tartı DTO'ları

**Files:**
- Create: `src/Grind.Api/Models/Dtos/BodyWeight/CreateBodyWeightRequest.cs`
- Create: `src/Grind.Api/Models/Dtos/BodyWeight/PatchBodyWeightRequest.cs`
- Create: `src/Grind.Api/Models/Dtos/BodyWeight/BodyWeightLogResponse.cs`
- Create: `src/Grind.Api/Services/IBodyWeightLogService.cs`
- Create: `src/Grind.Api/Services/BodyWeightLogService.cs`
- Test: `tests/Grind.Tests/Services/BodyWeightLogServiceTests.cs`

**Interfaces:**
- Consumes: `IBodyWeightLogRepository` (Görev 2), `WeightScale` + `PagedRangeQuery` (Görev 1),
  `LocalDayRange`, `IUnitOfWork`, `ICurrentUserService`, `TimeProvider`
- Produces:
  - `CreateBodyWeightRequest { decimal? Weight; DateTimeOffset? RecordedAt; }`
  - `PatchBodyWeightRequest { decimal? Weight; DateTimeOffset? RecordedAt; }`
  - `record BodyWeightLogResponse(long Id, decimal Weight, DateTime RecordedAt)`
  - `IBodyWeightLogService`: `CreateAsync`, `GetPageAsync(PagedRangeQuery)`, `GetByIdAsync`,
    `PatchAsync`, `DeleteAsync`

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Services/BodyWeightLogServiceTests.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.BodyWeight;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class BodyWeightLogServiceTests
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

    /// <summary>TR 20:00 (UTC 17:00), 10 Mart — gün sınırından güvenli uzaklıkta.</summary>
    private static readonly DateTime An = new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    private static async Task<(AppDbContext Context, User User, BodyWeightLogService Service,
        IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.Add(user);
        await context.SaveChangesAsync();

        var service = new BodyWeightLogService(
            new BodyWeightLogRepository(context), new UnitOfWork(context),
            new StubCurrentUser(user.Id), new SahteSaat(An));

        return (context, user, service, transaction);
    }

    private static CreateBodyWeightRequest Yeni(decimal weight, DateTimeOffset? recordedAt = null) =>
        new() { Weight = weight, RecordedAt = recordedAt };

    // ---- Ekleme ----

    [Fact]
    public async Task Zaman_verilmezse_saatin_ani_kaydedilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eklenen = await service.CreateAsync(Yeni(82.4m));

            Assert.Equal(An, eklenen.RecordedAt);
            Assert.Equal(82.4m, eklenen.Weight);
        }
    }

    /// <summary>
    /// Offset'li zaman (spec Karar 2) UTC'ye çevrilerek saklanır: TR 08:00 = UTC 05:00. DB'den
    /// okunarak doğrulanıyor — change tracker'daki nesneye bakmak yanlış bir yazımı gizlerdi.
    /// </summary>
    [Fact]
    public async Task Offsetli_zaman_UTCye_cevrilerek_saklanir()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eklenen = await service.CreateAsync(
                Yeni(82.4m, new DateTimeOffset(2026, 3, 10, 8, 0, 0, TimeSpan.FromHours(3))));

            context.ChangeTracker.Clear();
            var satir = await context.Set<BodyWeightLog>().SingleAsync(b => b.Id == eklenen.Id);

            Assert.Equal(new DateTime(2026, 3, 10, 5, 0, 0, DateTimeKind.Utc), satir.RecordedAt);
        }
    }

    [Fact]
    public async Task Gelecek_zaman_reddedilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(
                () => service.CreateAsync(Yeni(82.4m, new DateTimeOffset(An.AddHours(1)))));
        }
    }

    /// <summary>
    /// Saat kayması toleransı (spec Karar 2): istemci saati birkaç dakika ileride diye "şimdi"yi
    /// gönderen bir tartı 400 almamalı.
    /// </summary>
    [Fact]
    public async Task Tolerans_icindeki_ileri_zaman_kabul_edilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eklenen = await service.CreateAsync(Yeni(82.4m, new DateTimeOffset(An.AddMinutes(2))));

            Assert.Equal(An.AddMinutes(2), eklenen.RecordedAt);
        }
    }

    [Fact]
    public async Task Uc_ondalikli_kilo_reddedilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(() => service.CreateAsync(Yeni(82.455m)));
        }
    }

    // ---- Listeleme ----

    [Fact]
    public async Task Liste_yeniden_eskiye_sayfalanir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await service.CreateAsync(Yeni(83.0m, new DateTimeOffset(An.AddDays(-2))));
            await service.CreateAsync(Yeni(82.5m, new DateTimeOffset(An.AddDays(-1))));
            var enYeni = await service.CreateAsync(Yeni(82.1m));

            var sayfa = await service.GetPageAsync(new PagedRangeQuery { PageSize = 2 });

            Assert.Equal(2, sayfa.Items.Count);
            Assert.Equal(enYeni.Id, sayfa.Items[0].Id);
            Assert.Equal(3, sayfa.TotalCount);
            Assert.Equal(2, sayfa.TotalPages);
        }
    }

    /// <summary>
    /// AYIRT EDİCİ: UTC 9 Mart 21:30, TR'de 10 Mart 00:30'dur. "9 Mart" filtresi bu tartıyı
    /// YAKALAMAMALI, "10 Mart" yakalamalı. UTC gününe göre filtrelenseydi tersi olurdu.
    /// (Zaman bilerek sahte saatin — 10 Mart 17:00 UTC — GERİSİNDE seçildi: ileri bir zaman
    /// "gelecek" kuralına takılır ve test gün sınırını sınamadan 400 ile patlardı.)
    /// </summary>
    [Fact]
    public async Task Liste_TR_gunune_gore_filtrelenir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await service.CreateAsync(Yeni(82.4m,
                new DateTimeOffset(new DateTime(2026, 3, 9, 21, 30, 0, DateTimeKind.Utc))));

            var dokuzuncu = await service.GetPageAsync(new PagedRangeQuery
            {
                From = new DateOnly(2026, 3, 9), To = new DateOnly(2026, 3, 9)
            });
            var onuncu = await service.GetPageAsync(new PagedRangeQuery
            {
                From = new DateOnly(2026, 3, 10), To = new DateOnly(2026, 3, 10)
            });

            Assert.Empty(dokuzuncu.Items);
            Assert.Single(onuncu.Items);
        }
    }

    // ---- Düzeltme ----

    /// <summary>PATCH kısmi güncellemedir: gönderilmeyen alan KORUNUR (DB'den okunarak).</summary>
    [Fact]
    public async Task Tek_alan_duzeltilince_digeri_korunur()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var zaman = An.AddHours(-1);
            var eklenen = await service.CreateAsync(Yeni(82.4m, new DateTimeOffset(zaman)));

            await service.PatchAsync(eklenen.Id, new PatchBodyWeightRequest { Weight = 81.9m });

            context.ChangeTracker.Clear();
            var satir = await context.Set<BodyWeightLog>().SingleAsync(b => b.Id == eklenen.Id);

            Assert.Equal(81.9m, satir.Weight);
            Assert.Equal(zaman, satir.RecordedAt);
        }
    }

    [Fact]
    public async Task Bos_patch_reddedilir()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eklenen = await service.CreateAsync(Yeni(82.4m));

            await Assert.ThrowsAsync<ValidationException>(
                () => service.PatchAsync(eklenen.Id, new PatchBodyWeightRequest()));
        }
    }

    // ---- Silme ----

    [Fact]
    public async Task Silinen_kayit_artik_bulunamaz()
    {
        var (_, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eklenen = await service.CreateAsync(Yeni(82.4m));

            await service.DeleteAsync(eklenen.Id);

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(eklenen.Id));
        }
    }

    // ---- Sahiplik ----

    /// <summary>IDOR: başkasının kaydı HER FİİLDE 404 — varlığı doğrulanmaz.</summary>
    [Fact]
    public async Task Baskasinin_kaydi_okunamaz_duzeltilemez_silinemez()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerKayit = new BodyWeightLog { User = digerKullanici, Weight = 90m, RecordedAt = An };
            context.AddRange(digerKullanici, digerKayit);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(digerKayit.Id));
            await Assert.ThrowsAsync<NotFoundException>(
                () => service.PatchAsync(digerKayit.Id, new PatchBodyWeightRequest { Weight = 1m }));
            await Assert.ThrowsAsync<NotFoundException>(() => service.DeleteAsync(digerKayit.Id));
        }
    }

    [Fact]
    public async Task Baskasinin_kayitlari_listede_gorunmez()
    {
        var (context, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            context.AddRange(digerKullanici,
                new BodyWeightLog { User = digerKullanici, Weight = 90m, RecordedAt = An });
            await context.SaveChangesAsync();

            var sayfa = await service.GetPageAsync(new PagedRangeQuery());

            Assert.Empty(sayfa.Items);
            Assert.Equal(0, sayfa.TotalCount);
        }
    }
}
```

- [ ] **Adım 2: Testlerin derlenmediğini gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~BodyWeightLogServiceTests"`
Beklenen: derleme hatası — `BodyWeightLogService` ve DTO'lar yok.

- [ ] **Adım 3: DTO'ları yaz**

`src/Grind.Api/Models/Dtos/BodyWeight/CreateBodyWeightRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.BodyWeight;

/// <summary>
/// Tartı kaydı. <c>Weight</c> nullable + <c>[Required]</c>: non-nullable olsaydı gövdede hiç
/// gönderilmediğinde sessizce 0'a bağlanırdı (Faz 8'in <c>CreateSetRequest</c> dersi).
/// Alt sınır veritabanındaki <c>"Weight" &gt; 0</c> kısıtıyla hizalı — kısıt ihlali 400 yerine 500
/// üretirdi.
/// </summary>
public class CreateBodyWeightRequest
{
    [Required(ErrorMessage = "Kilo zorunlu.")]
    [Range(0.01, 999.99, ErrorMessage = "Kilo 0,01 ile 999,99 arasında olmalı.")]
    public decimal? Weight { get; set; }

    /// <summary>
    /// Opsiyonel; verilmezse şimdi. OFFSET İLE gönderilmeli (<c>2026-03-10T08:00:00+03:00</c> veya
    /// <c>...Z</c>) — offset'siz bir değer serileştirici tarafından sunucunun yerel saat dilimiyle
    /// yorumlanır. Tip <c>DateTimeOffset</c>, <c>DateTime</c> değil: offset'siz bir <c>DateTime</c>
    /// <c>Kind=Unspecified</c> bağlanır ve Npgsql onu <c>timestamptz</c>'ye yazmayı reddeder (500).
    /// Şimdiden 5 dakikadan fazla ileride bir zaman reddedilir (spec Karar 2).
    /// </summary>
    public DateTimeOffset? RecordedAt { get; set; }
}
```

`src/Grind.Api/Models/Dtos/BodyWeight/PatchBodyWeightRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.BodyWeight;

/// <summary>
/// Kısmi güncelleme. <c>null</c> = "bu alana dokunma"; en az bir alan gönderilmeli. <c>PUT</c>
/// yok — Faz 8'in <c>SetEntry</c> deseniyle aynı (spec Karar 5). <c>RecordedAt</c> için
/// <see cref="CreateBodyWeightRequest.RecordedAt"/>'teki offset kuralı geçerli.
/// </summary>
public class PatchBodyWeightRequest
{
    [Range(0.01, 999.99, ErrorMessage = "Kilo 0,01 ile 999,99 arasında olmalı.")]
    public decimal? Weight { get; set; }

    public DateTimeOffset? RecordedAt { get; set; }
}
```

`src/Grind.Api/Models/Dtos/BodyWeight/BodyWeightLogResponse.cs`:

```csharp
namespace Grind.Api.Models.Dtos.BodyWeight;

/// <summary><c>RecordedAt</c> UTC'dir; TR gününe çevirmek görüntüleme katmanının işi (CLAUDE.md).</summary>
public record BodyWeightLogResponse(long Id, decimal Weight, DateTime RecordedAt);
```

- [ ] **Adım 4: Servisi yaz**

`src/Grind.Api/Services/IBodyWeightLogService.cs`:

```csharp
using Grind.Api.Models.Dtos.BodyWeight;
using Grind.Api.Models.Dtos.Common;

namespace Grind.Api.Services;

public interface IBodyWeightLogService
{
    /// <summary>
    /// Kaydeder. Fazla ondalık veya şimdiden 5 dakikadan fazla ileride bir zaman
    /// ValidationException (400).
    /// </summary>
    Task<BodyWeightLogResponse> CreateAsync(
        CreateBodyWeightRequest request, CancellationToken cancellationToken = default);

    /// <summary>Yeniden eskiye, sayfalı. Sonuç yoksa BOŞ sayfa (404 değil).</summary>
    Task<PagedResponse<BodyWeightLogResponse>> GetPageAsync(
        PagedRangeQuery query, CancellationToken cancellationToken = default);

    /// <summary>Başkasının kaydında NotFoundException (404).</summary>
    Task<BodyWeightLogResponse> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    /// <summary>Boş gövdede ValidationException; başkasının kaydında NotFoundException.</summary>
    Task<BodyWeightLogResponse> PatchAsync(
        long id, PatchBodyWeightRequest request, CancellationToken cancellationToken = default);

    /// <summary>Başkasının kaydında NotFoundException.</summary>
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
```

`src/Grind.Api/Services/BodyWeightLogService.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Common.Validation;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.BodyWeight;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class BodyWeightLogService(
    IBodyWeightLogRepository repository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IBodyWeightLogService
{
    /// <summary>Id İÇERMEZ — hangi id'nin var olduğunu söylemek tarama imkânı verirdi.</summary>
    private const string LogNotFound = "Tartı kaydı bulunamadı.";

    /// <summary>
    /// İstemci saati birkaç saniye/dakika ileride olabilir; "şimdi"yi gönderen bir tartı 400
    /// almamalı (spec Karar 2).
    /// </summary>
    private static readonly TimeSpan FutureTolerance = TimeSpan.FromMinutes(5);

    public async Task<BodyWeightLogResponse> CreateAsync(
        CreateBodyWeightRequest request, CancellationToken cancellationToken = default)
    {
        // [Required] MVC katmanında çalıştı; servis doğrudan çağrıldığında da aynı sözleşme.
        var weight = request.Weight!.Value;
        WeightScale.EnsureAtMostTwoDecimals(weight);

        var log = new BodyWeightLog
        {
            UserId = currentUser.UserId,
            Weight = weight,
            RecordedAt = request.RecordedAt is { } recordedAt ? ToUtcNotInFuture(recordedAt) : Now()
        };

        repository.Add(log);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(log);
    }

    public async Task<PagedResponse<BodyWeightLogResponse>> GetPageAsync(
        PagedRangeQuery query, CancellationToken cancellationToken = default)
    {
        var (fromUtc, toUtc) = LocalDayRange.Resolve(query.From, query.To);

        var (items, totalCount) = await repository.GetPageAsync(
            currentUser.UserId, fromUtc, toUtc, query.Skip(), query.PageSize, cancellationToken);

        return new PagedResponse<BodyWeightLogResponse>(
            items.Select(ToResponse).ToList(), query.Page, query.PageSize, totalCount);
    }

    public async Task<BodyWeightLogResponse> GetByIdAsync(
        long id, CancellationToken cancellationToken = default)
        => ToResponse(await OwnedOrThrowAsync(id, cancellationToken));

    public async Task<BodyWeightLogResponse> PatchAsync(
        long id, PatchBodyWeightRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Weight is null && request.RecordedAt is null)
        {
            // Boş gövde DTO doğrulamasını geçer (tüm alanlar nullable). Sessizce 200 dönmek
            // çağıranın isteğinin uygulandığını sanmasına yol açardı.
            throw new ValidationException("En az bir alan gönderilmeli.");
        }

        var log = await OwnedOrThrowAsync(id, cancellationToken);

        if (request.Weight is { } weight)
        {
            WeightScale.EnsureAtMostTwoDecimals(weight);
            log.Weight = weight;
        }

        if (request.RecordedAt is { } recordedAt)
        {
            log.RecordedAt = ToUtcNotInFuture(recordedAt);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToResponse(log);
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var log = await OwnedOrThrowAsync(id, cancellationToken);

        repository.Remove(log);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private DateTime Now() => timeProvider.GetUtcNow().UtcDateTime;

    /// <summary>
    /// Offset'li zamanı UTC'ye çevirir (<c>UtcDateTime</c> Kind=Utc döner — Npgsql bunu ister) ve
    /// toleranstan fazla ileride olanı reddeder.
    /// </summary>
    private DateTime ToUtcNotInFuture(DateTimeOffset recordedAt)
    {
        var utc = recordedAt.UtcDateTime;

        if (utc > Now() + FutureTolerance)
        {
            throw new ValidationException("Tartı zamanı gelecekte olamaz.");
        }

        return utc;
    }

    private async Task<BodyWeightLog> OwnedOrThrowAsync(long id, CancellationToken cancellationToken)
        => await repository.GetOwnedByIdAsync(id, currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException(LogNotFound);

    private static BodyWeightLogResponse ToResponse(BodyWeightLog log) =>
        new(log.Id, log.Weight, log.RecordedAt);
}
```

- [ ] **Adım 5: Testleri çalıştır**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~BodyWeightLogServiceTests"`
Beklenen: 12 test PASS.

- [ ] **Adım 6: Commit**

```bash
git add src/Grind.Api/Models/Dtos/BodyWeight src/Grind.Api/Services/IBodyWeightLogService.cs src/Grind.Api/Services/BodyWeightLogService.cs tests/Grind.Tests/Services/BodyWeightLogServiceTests.cs
git commit -m "feat(body-weight): tarti ekleme, listeleme, duzeltme ve silme"
```

---

## Görev 4: Kilo/hacim karşılaştırması — `StatsService.GetBodyWeightTrendAsync`

**Files:**
- Create: `src/Grind.Api/Models/Dtos/Stats/DailyBodyWeightResponse.cs`
- Create: `src/Grind.Api/Models/Dtos/Stats/BodyWeightTrendResponse.cs`
- Modify: `src/Grind.Api/Services/IStatsService.cs`
- Modify: `src/Grind.Api/Services/StatsService.cs`
- Test: `tests/Grind.Tests/Services/StatsServiceTests.cs` (mevcut dosyaya ekle + `CreateAsync` kurucusu)

**Interfaces:**
- Consumes: `IBodyWeightLogRepository.GetInRangeAsync` (Görev 2); `StatsService`'in mevcut özel
  `DailyBucketsAsync`'i (Faz 9); `TurkeyDay.LocalDateOf`, `LocalDayRange.Resolve`
- Produces:
  - `record DailyBodyWeightResponse(DateOnly Date, decimal Weight, int ReadingCount)`
  - `record BodyWeightTrendResponse(DateOnly? From, DateOnly? To, IReadOnlyList<DailyBodyWeightResponse> BodyWeight, IReadOnlyList<DailyVolumeResponse> Volume)`
  - `IStatsService.GetBodyWeightTrendAsync(StatsRangeQuery query, CancellationToken ct = default)`
  - `StatsService` kurucusu: `(IWorkoutSessionRepository, ISetEntryRepository, IBodyWeightLogRepository, ICurrentUserService, TimeProvider)`

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Services/StatsServiceTests.cs`:

1. `CreateAsync` yardımcısındaki `new StatsService(...)` çağrısını yeni kurucuya göre güncelle —
   üçüncü argüman olarak `new BodyWeightLogRepository(context)` ekle:

```csharp
        var service = new StatsService(
            new WorkoutSessionRepository(context), new SetEntryRepository(context),
            new BodyWeightLogRepository(context), new StubCurrentUser(user.Id), saat);
```

2. Sınıfın SONUNA ekle (mevcut testlere dokunma; `Seed`, `Bugun`, `CreateAsync` zaten var):

```csharp
    // ---- Faz 10: kilo / hacim karşılaştırması ----

    private static void SeedWeight(AppDbContext context, User user, DateTime recordedAtUtc, decimal weight) =>
        context.Add(new BodyWeightLog { User = user, Weight = weight, RecordedAt = recordedAtUtc });

    /// <summary>Aynı günün iki tartısı tek noktaya ortalanır (spec Karar 1).</summary>
    [Fact]
    public async Task Kilo_serisi_gunluk_ortalamadir()
    {
        var (context, user, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedWeight(context, user, Bugun.AddHours(-10), 82.4m);   // TR sabah
            SeedWeight(context, user, Bugun, 82.9m);                  // TR akşam
            await context.SaveChangesAsync();

            var trend = await service.GetBodyWeightTrendAsync(new StatsRangeQuery());

            var nokta = Assert.Single(trend.BodyWeight);
            Assert.Equal(82.65m, nokta.Weight);
            Assert.Equal(2, nokta.ReadingCount);
        }
    }

    /// <summary>
    /// AYIRT EDİCİ: 82.40 ve 82.41'in ortalaması 82.405. Varsayılan banker's rounding bunu çift
    /// basamağa (82.40) indirir; spec "yarım yukarı" (AwayFromZero) diyor: 82.41.
    /// </summary>
    [Fact]
    public async Task Gunluk_ortalama_yarim_yukari_yuvarlanir()
    {
        var (context, user, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedWeight(context, user, Bugun.AddHours(-2), 82.40m);
            SeedWeight(context, user, Bugun, 82.41m);
            await context.SaveChangesAsync();

            var trend = await service.GetBodyWeightTrendAsync(new StatsRangeQuery());

            Assert.Equal(82.41m, Assert.Single(trend.BodyWeight).Weight);
        }
    }

    /// <summary>UTC 21:30 = TR ertesi gün 00:30 — tartı ertesi TR gününe yazılmalı.</summary>
    [Fact]
    public async Task Tartinin_gunu_TR_gunudur()
    {
        var (context, user, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedWeight(context, user, new DateTime(2026, 3, 10, 21, 30, 0, DateTimeKind.Utc), 82.4m);
            await context.SaveChangesAsync();

            var trend = await service.GetBodyWeightTrendAsync(new StatsRangeQuery());

            Assert.Equal(new DateOnly(2026, 3, 11), Assert.Single(trend.BodyWeight).Date);
        }
    }

    /// <summary>
    /// LOAD-BEARING (spec Karar 3): karşılaştırma ucundaki hacim serisi, GET /api/stats/volume/daily
    /// ile BİREBİR aynı olmalı. İki uç aynı günü farklı raporlarsa kullanıcı iki ekranda iki farklı
    /// sayı görür — Faz 7 ve Faz 8'deki hatalar tam bu sınıftandı.
    /// </summary>
    [Fact]
    public async Task Hacim_serisi_gunluk_hacim_ucuyla_birebir_aynidir()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Bugun, (100m, 8), (60m, 10));
            Seed(context, user, exercise, Bugun.AddDays(-1), (80m, 5));
            SeedWeight(context, user, Bugun, 82.4m);
            await context.SaveChangesAsync();

            var aralik = new StatsRangeQuery { From = new DateOnly(2026, 3, 11), To = new DateOnly(2026, 3, 12) };
            var trend = await service.GetBodyWeightTrendAsync(aralik);
            var gunluk = await service.GetDailyVolumeAsync(aralik);

            Assert.Equal(gunluk.Items, trend.Volume);
            Assert.Equal(2, trend.Volume.Count);
        }
    }

    [Fact]
    public async Task Aralik_iki_seriye_de_uygulanir()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Bugun, (100m, 8));
            Seed(context, user, exercise, Bugun.AddDays(-10), (100m, 8));
            SeedWeight(context, user, Bugun, 82.4m);
            SeedWeight(context, user, Bugun.AddDays(-10), 84.0m);
            await context.SaveChangesAsync();

            var trend = await service.GetBodyWeightTrendAsync(new StatsRangeQuery
            {
                From = new DateOnly(2026, 3, 12), To = new DateOnly(2026, 3, 12)
            });

            Assert.Equal(82.4m, Assert.Single(trend.BodyWeight).Weight);
            Assert.Single(trend.Volume);
        }
    }

    [Fact]
    public async Task Baskasinin_tartilari_seride_gorunmez()
    {
        var (context, _, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            context.Add(digerKullanici);
            SeedWeight(context, digerKullanici, Bugun, 90m);
            await context.SaveChangesAsync();

            var trend = await service.GetBodyWeightTrendAsync(new StatsRangeQuery());

            Assert.Empty(trend.BodyWeight);
        }
    }

    /// <summary>Veri yoksa iki seri de boş liste — null değil, 404 değil.</summary>
    [Fact]
    public async Task Veri_yoksa_iki_seri_de_bostur()
    {
        var (_, _, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var trend = await service.GetBodyWeightTrendAsync(new StatsRangeQuery());

            Assert.Empty(trend.BodyWeight);
            Assert.Empty(trend.Volume);
        }
    }
```

- [ ] **Adım 2: Testlerin derlenmediğini gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~StatsServiceTests"`
Beklenen: derleme hatası — `GetBodyWeightTrendAsync`, yeni DTO'lar ve yeni kurucu yok.

- [ ] **Adım 3: DTO'ları yaz**

`src/Grind.Api/Models/Dtos/Stats/DailyBodyWeightResponse.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Bir TR gününün kilosu: o günün tartılarının ORTALAMASI, 2 ondalığa "yarım yukarı"
/// (<c>MidpointRounding.AwayFromZero</c>) yuvarlanmış (spec Karar 1). <see cref="ReadingCount"/>
/// ortalamanın kaç tartıdan geldiğini söyler — tek tartı ile üç tartının ortalaması kullanıcı için
/// farklı güvenilirlikte bilgidir.
/// </summary>
public record DailyBodyWeightResponse(DateOnly Date, decimal Weight, int ReadingCount);
```

`src/Grind.Api/Models/Dtos/Stats/BodyWeightTrendResponse.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Kilo ve antrenman hacmi, aynı zaman ekseninde çizilmek üzere İKİ AYRI SERİ (spec Karar 3). Her
/// seri yalnızca kendi verisi olan günleri taşır — gün gün birleşik satır, tartı olmayan günde
/// kiloyu, antrenman olmayan günde hacmi sürekli null bırakırdı (Faz 9 Karar 4'te reddedilen desen).
/// <see cref="Volume"/> satırları <c>GET /api/stats/volume/daily</c> ile AYNI tip ve AYNI hesap
/// yolundan gelir; iki uç aynı günü asla farklı raporlamaz.
/// </summary>
public record BodyWeightTrendResponse(
    DateOnly? From,
    DateOnly? To,
    IReadOnlyList<DailyBodyWeightResponse> BodyWeight,
    IReadOnlyList<DailyVolumeResponse> Volume);
```

- [ ] **Adım 4: Servisi genişlet**

`src/Grind.Api/Services/IStatsService.cs` — mevcut metotların ALTINA ekle:

```csharp
    /// <summary>
    /// Kilo (günlük ortalama) ve hacim, iki ayrı seri. Hacim serisi <see cref="GetDailyVolumeAsync"/>
    /// ile aynı hesap yolundan gelir.
    /// </summary>
    Task<BodyWeightTrendResponse> GetBodyWeightTrendAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default);
```

`src/Grind.Api/Services/StatsService.cs`:

1. Kurucuya `IBodyWeightLogRepository bodyWeightRepository`'yi `ISetEntryRepository`'den HEMEN
   SONRA ekle:

```csharp
public class StatsService(
    IWorkoutSessionRepository sessionRepository,
    ISetEntryRepository setEntryRepository,
    IBodyWeightLogRepository bodyWeightRepository,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IStatsService
```

2. `GetDailyVolumeAsync` içindeki `.Select(d => new DailyVolumeResponse(d.Date, d.Volume, d.SetCount, d.SessionCount))`
   ifadesini `.Select(ToDailyVolume)` ile değiştir ve sınıfın sonuna (`DayBucket` record'unun
   üstüne) şu yardımcıyı ekle — iki metot aynı eşlemeyi kullansın diye (DRY):

```csharp
    private static DailyVolumeResponse ToDailyVolume(DayBucket day) =>
        new(day.Date, day.Volume, day.SetCount, day.SessionCount);
```

3. `GetCalendarAsync`'in ALTINA yeni metodu ekle:

```csharp
    public async Task<BodyWeightTrendResponse> GetBodyWeightTrendAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default)
    {
        // Hacim serisi GetDailyVolumeAsync ile AYNI yoldan (DailyBucketsAsync + ToDailyVolume):
        // iki uç aynı günü asla farklı raporlamaz (spec Karar 3).
        var volume = (await DailyBucketsAsync(query, cancellationToken))
            .Select(ToDailyVolume)
            .ToList();

        var (fromUtc, toUtc) = LocalDayRange.Resolve(query.From, query.To);
        var logs = await bodyWeightRepository.GetInRangeAsync(
            currentUser.UserId, fromUtc, toUtc, cancellationToken);

        // Gruplama bellekte, TurkeyDay üzerinden — gün sınırı kuralının SQL'de ikinci bir kopyası
        // yok (Faz 9 Karar 6). Satır sayısı tartı sayısıyla sınırlı.
        var bodyWeight = logs
            .GroupBy(l => TurkeyDay.LocalDateOf(l.RecordedAt))
            .Select(g => new DailyBodyWeightResponse(
                g.Key,
                // "Yarım yukarı": .NET'in varsayılanı banker's rounding'dir ve 82.405'i 82.40'a
                // indirir — kilo gösteriminde kullanıcıya tutarsız görünür (spec Karar 1).
                decimal.Round(g.Average(l => l.Weight), 2, MidpointRounding.AwayFromZero),
                g.Count()))
            .OrderBy(d => d.Date)
            .ToList();

        return new BodyWeightTrendResponse(query.From, query.To, bodyWeight, volume);
    }
```

- [ ] **Adım 5: Testleri çalıştır**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~StatsServiceTests"`
Beklenen: mevcut Faz 9 testlerinin TAMAMI + 7 yeni test PASS. Faz 9 testlerinden biri kırmızıya
dönerse `ToDailyVolume` eşlemesi davranışı değiştirmiş demektir — düzelt, testi gevşetme.

- [ ] **Adım 6: Commit**

```bash
git add src/Grind.Api/Models/Dtos/Stats/DailyBodyWeightResponse.cs src/Grind.Api/Models/Dtos/Stats/BodyWeightTrendResponse.cs src/Grind.Api/Services/IStatsService.cs src/Grind.Api/Services/StatsService.cs tests/Grind.Tests/Services/StatsServiceTests.cs
git commit -m "feat(stats): kilo ve hacim ayni zaman ekseninde iki seri"
```

---

## Görev 5: Controller'lar, DI ve uçtan uca testler

**Files:**
- Create: `src/Grind.Api/Controllers/BodyWeightsController.cs`
- Modify: `src/Grind.Api/Controllers/StatsController.cs`
- Modify: `src/Grind.Api/Services/DependencyInjection.cs`
- Test: `tests/Grind.Tests/Integration/BodyWeightEndpointsTests.cs`
- Modify: `PLAN.md`

**Interfaces:**
- Consumes: `IBodyWeightLogService` (Görev 3), `IStatsService.GetBodyWeightTrendAsync` (Görev 4)

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/Grind.Tests/Integration/BodyWeightEndpointsTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.BodyWeight;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca: gerçek uygulama, gerçek JWT, gerçek saat. Gün sınırı ve ortalama derinliği
/// servis testlerinde sahte saatle sınanıyor; burada HTTP sözleşmesi (durum kodları, zarf,
/// Location, model doğrulaması) sabitleniyor.
/// </summary>
[Trait("Category", "Database")]
public class BodyWeightEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = $"bw_{Guid.NewGuid():N}"[..20],
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    private static async Task<BodyWeightLogResponse> PostWeightAsync(HttpClient client, decimal weight)
    {
        var response = await client.PostAsJsonAsync("/api/body-weights",
            new CreateBodyWeightRequest { Weight = weight }, Json);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<BodyWeightLogResponse>(Json))!;
    }

    [Theory]
    [InlineData("POST", "/api/body-weights")]
    [InlineData("GET", "/api/body-weights")]
    [InlineData("GET", "/api/body-weights/1")]
    [InlineData("PATCH", "/api/body-weights/1")]
    [InlineData("DELETE", "/api/body-weights/1")]
    [InlineData("GET", "/api/stats/body-weight-trend")]
    public async Task Tokensiz_istekler_401_verir(string method, string path)
    {
        var response = await factory.CreateClient()
            .SendAsync(new HttpRequestMessage(new HttpMethod(method), path));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Tarti_201_ve_Location_doner()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/body-weights",
            new CreateBodyWeightRequest { Weight = 82.4m }, Json);
        var eklenen = await response.Content.ReadFromJsonAsync<BodyWeightLogResponse>(Json);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(82.4m, eklenen!.Weight);
        Assert.EndsWith($"/api/body-weights/{eklenen.Id}", response.Headers.Location!.ToString());
    }

    [Fact]
    public async Task Liste_zarfi_yeniden_eskiye_doner()
    {
        var client = await AuthenticatedClientAsync();
        await PostWeightAsync(client, 82.4m);
        var ikinci = await PostWeightAsync(client, 82.1m);

        var sayfa = await client.GetFromJsonAsync<PagedResponse<BodyWeightLogResponse>>(
            "/api/body-weights", Json);

        Assert.Equal(2, sayfa!.TotalCount);
        Assert.Equal(ikinci.Id, sayfa.Items[0].Id);
        Assert.Equal(1, sayfa.TotalPages);
    }

    /// <summary>
    /// "Gönderilmeyen alan korunur" iki kez VERİTABANINDAN okunarak karşılaştırılıyor: POST
    /// yanıtındaki zaman .NET'in 100 ns hassasiyetinde, PostgreSQL ise mikrosaniyeye keser —
    /// POST yanıtıyla GET yanıtını karşılaştırmak rastgele kırmızıya dönerdi.
    /// </summary>
    [Fact]
    public async Task Patch_kiloyu_duzeltir_ve_zamani_korur()
    {
        var client = await AuthenticatedClientAsync();
        var eklenen = await PostWeightAsync(client, 82.4m);
        var once = await client.GetFromJsonAsync<BodyWeightLogResponse>(
            $"/api/body-weights/{eklenen.Id}", Json);

        var response = await client.PatchAsJsonAsync(
            $"/api/body-weights/{eklenen.Id}", new PatchBodyWeightRequest { Weight = 81.9m }, Json);
        var sonra = await client.GetFromJsonAsync<BodyWeightLogResponse>(
            $"/api/body-weights/{eklenen.Id}", Json);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(81.9m, sonra!.Weight);
        Assert.Equal(once!.RecordedAt, sonra.RecordedAt);
    }

    [Fact]
    public async Task Silinen_kayit_404_verir()
    {
        var client = await AuthenticatedClientAsync();
        var eklenen = await PostWeightAsync(client, 82.4m);

        var silme = await client.DeleteAsync($"/api/body-weights/{eklenen.Id}");
        var okuma = await client.GetAsync($"/api/body-weights/{eklenen.Id}");

        Assert.Equal(HttpStatusCode.NoContent, silme.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, okuma.StatusCode);
    }

    /// <summary>IDOR, HTTP katmanında her fiilde: başkasının kaydı 404 — varlığı doğrulanmaz.</summary>
    [Fact]
    public async Task Baskasinin_kaydi_her_fiilde_404_verir()
    {
        var sahip = await AuthenticatedClientAsync();
        var eklenen = await PostWeightAsync(sahip, 82.4m);

        var davetsiz = await AuthenticatedClientAsync();

        Assert.Equal(HttpStatusCode.NotFound,
            (await davetsiz.GetAsync($"/api/body-weights/{eklenen.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await davetsiz.PatchAsJsonAsync($"/api/body-weights/{eklenen.Id}",
                new PatchBodyWeightRequest { Weight = 1m }, Json)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await davetsiz.DeleteAsync($"/api/body-weights/{eklenen.Id}")).StatusCode);
    }

    /// <summary>0 kg modelde reddedilir — veritabanı kısıtına (500) hiç ulaşmaz.</summary>
    [Fact]
    public async Task Sifir_kilo_400_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/body-weights",
            new CreateBodyWeightRequest { Weight = 0m }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Uc_ondalikli_kilo_400_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/body-weights",
            new CreateBodyWeightRequest { Weight = 82.455m }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Gelecek_zaman_400_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/body-weights", new CreateBodyWeightRequest
        {
            Weight = 82.4m,
            RecordedAt = DateTimeOffset.UtcNow.AddDays(1)
        }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Karsilastirma_kilo_ve_hacmi_iki_seride_doner()
    {
        var client = await AuthenticatedClientAsync();
        await PostWeightAsync(client, 82.4m);

        var egzersiz = await client.PostAsJsonAsync("/api/exercises", new CreateExerciseRequest
        {
            Name = $"Egzersiz {Guid.NewGuid():N}",
            Category = ExerciseCategory.Push
        }, Json);
        egzersiz.EnsureSuccessStatusCode();
        var exerciseId = (await egzersiz.Content.ReadFromJsonAsync<ExerciseResponse>(Json))!.Id;
        (await client.PostAsJsonAsync("/api/sets",
            new CreateSetRequest { ExerciseId = exerciseId, Weight = 100m, Reps = 8 }, Json))
            .EnsureSuccessStatusCode();

        var trend = await client.GetFromJsonAsync<BodyWeightTrendResponse>(
            "/api/stats/body-weight-trend", Json);

        Assert.Equal(82.4m, Assert.Single(trend!.BodyWeight).Weight);
        Assert.Equal(800m, Assert.Single(trend.Volume).Volume);
    }
}
```

- [ ] **Adım 2: Testlerin başarısız olduğunu gör**

Çalıştır: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~BodyWeightEndpointsTests"`
Beklenen: davranış testleri FAIL (uçlar yok). Not: 401 satırlarının bir kısmı rota yokken de 401
dönebilir (Faz 9'da görüldü) — bu beklenen; davranış testleri gerçekten kırmızı olmalı.

- [ ] **Adım 3: Controller'ları ve DI kaydını yaz**

`src/Grind.Api/Controllers/BodyWeightsController.cs`:

```csharp
using Grind.Api.Models.Dtos.BodyWeight;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// İnce kalır: ağırlık kuralları, zaman doğrulaması ve sahiplik servis katmanında, hata çevirisi
/// GlobalExceptionHandler'da. Burada if/try yoktur.
/// </summary>
[ApiController]
[Authorize]
[Route("api/body-weights")]
public class BodyWeightsController(IBodyWeightLogService bodyWeightService) : ControllerBase
{
    /// <summary>
    /// Tartı kaydeder. <c>recordedAt</c> opsiyoneldir (verilmezse şimdi) ve OFFSET ile gönderilmeli
    /// (<c>+03:00</c> veya <c>Z</c>); şimdiden 5 dakikadan fazla ileride bir zaman 400 alır.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BodyWeightLogResponse>> Create(
        CreateBodyWeightRequest request, CancellationToken cancellationToken)
    {
        var olusan = await bodyWeightService.CreateAsync(request, cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = olusan.Id }, olusan);
    }

    /// <summary>Tartılar, yeniden eskiye, sayfalı. <c>from</c>/<c>to</c> TR yerel günü, iki ucu dahil.</summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<BodyWeightLogResponse>>> GetPage(
        [FromQuery] PagedRangeQuery query, CancellationToken cancellationToken)
        => Ok(await bodyWeightService.GetPageAsync(query, cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BodyWeightLogResponse>> GetById(
        long id, CancellationToken cancellationToken)
        => Ok(await bodyWeightService.GetByIdAsync(id, cancellationToken));

    /// <summary>Kısmi düzeltme; en az bir alan zorunlu. PUT yok (spec Karar 5).</summary>
    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BodyWeightLogResponse>> Patch(
        long id, PatchBodyWeightRequest request, CancellationToken cancellationToken)
        => Ok(await bodyWeightService.PatchAsync(id, request, cancellationToken));

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await bodyWeightService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
```

`src/Grind.Api/Controllers/StatsController.cs` — mevcut `GetCalendar` aksiyonunun ALTINA ekle:

```csharp
    /// <summary>
    /// Kilo (günlük ortalama) ve hacim, aynı zaman ekseninde iki ayrı seri. Hacim serisi
    /// <c>volume/daily</c> ile birebir aynıdır (spec Karar 3).
    /// </summary>
    [HttpGet("body-weight-trend")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BodyWeightTrendResponse>> GetBodyWeightTrend(
        [FromQuery] StatsRangeQuery query, CancellationToken cancellationToken)
        => Ok(await statsService.GetBodyWeightTrendAsync(query, cancellationToken));
```

`src/Grind.Api/Services/DependencyInjection.cs` — mevcut kayıtların ALTINA ekle:

```csharp
        services.AddScoped<IBodyWeightLogService, BodyWeightLogService>();
```

- [ ] **Adım 4: Tüm test paketini çalıştır**

Uygulama çalışıyorsa ÖNCE durdur (çalışan `Grind.Api.exe` build'i sessizce kilitler).

```bash
dotnet build -c Release --nologo
dotnet test tests/Grind.Tests
```

Beklenen: **507 test PASS**, 0 uyarı.

- [ ] **Adım 5: Commit**

```bash
git add src/Grind.Api/Controllers/BodyWeightsController.cs src/Grind.Api/Controllers/StatsController.cs src/Grind.Api/Services/DependencyInjection.cs tests/Grind.Tests/Integration/BodyWeightEndpointsTests.cs
git commit -m "feat(api): tarti ve kilo/hacim karsilastirma uclari"
```

- [ ] **Adım 6: `PLAN.md`'yi güncelle**

Faz 10'un iki kutusunu işaretle, her satıra ne yapıldığını yaz (Faz 9'daki biçimin aynısı). Test
sayılarını TAHMİN ETME: toplamı kendi son tam koşundan, dosya bazlı sayıları dosyalardaki `[Fact]` +
her `[InlineData]` satırını sayarak yaz; Faz 10'un katkısını dosya bazında belirt ve sayılar söylenen
artışa denk gelsin. Faz 10 öncesi baz: **457**.

Faz 9'dan devreden notların durumunu güncelle (1: `GET /api/sessions` hâlâ sayfalamasız — bu fazın
yeni liste ucu `PagedRangeQuery`/`PagedResponse` kullanıyor, hizalama için hazır bir desen var; 2 ve 3
değişmedi). Yeni devreden notlar bölümü ekle:

- Proje çapında `AsNoTracking` geçişi yapılmadı: bu fazın yeni okuma sorguları izlemesiz, ama Faz 5-9
  okuma yolları (ör. `GET /api/history`, `GET /api/records`) hâlâ izlemeli.
- Offset'siz gönderilen `recordedAt`, serileştirici tarafından sunucunun yerel saat dilimiyle
  yorumlanır (Docker'da genellikle UTC) — istemci offset göndermeli; ileride offset'siz değerler
  reddedilebilir veya TR saati kabul edilebilir.
- Haftalık/aylık kilo ortalaması yok (Faz 9'un haftalık hacim notuyla aynı gerekçe).

```bash
git add PLAN.md
git commit -m "docs: Faz 10 tamamlandi, devreden notlar guncellendi"
```

---

## Self-Review Notları (plan yazarından)

Spec kapsaması:
- Karar 1 (çoklu tartı, günlük ortalama, AwayFromZero) → Görev 4 (`GetBodyWeightTrendAsync` + ayırt edici yuvarlama testi)
- Karar 2 (`recordedAt` DateTimeOffset, UTC'ye çevirme, 5 dk tolerans) → Görev 3 (servis + üç test) + Görev 5 (400 uçtan uca)
- Karar 3 (iki seri, hacim aynı yoldan) → Görev 4 (`ToDailyVolume` paylaşımı + birebir eşitlik testi)
- Karar 4 (sayfalı liste) → Görev 2 (sayfa + sayım) + Görev 3 + Görev 5
- Karar 5 (yalnızca PATCH) → Görev 3 + Görev 5
- Karar 6 (ağırlık kuralları, `WeightScale` taşıması) → Görev 1 + Görev 3 + Görev 5 (0 kg ve 3 ondalık 400)
- Karar 7 (`PagedRangeQuery` tabanı) → Görev 1
- Karar 8 (yeni okuma sorguları izlemesiz) → Görev 2 (iki izleme testi + bir izlemeli-kalma testi)

**Bilinçli olarak KAPSAM DIŞI:** proje çapında `AsNoTracking`, hedef kilo/BMI, haftalık ortalama, export.
