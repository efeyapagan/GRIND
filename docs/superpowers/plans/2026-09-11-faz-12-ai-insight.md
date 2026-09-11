# Faz 12 — AiInsight Altyapısı Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcı seçtiği aralığın (verilmezse son 30 günün) antrenman verisini backend üzerinden bir
LLM'e yorumlatabilsin. Yorum; modeli, token sayısı ve tahmini maliyetiyle `AiInsight` olarak saklansın,
listelenip okunabilsin ve silinebilsin. Varsayılan sağlayıcı KAPALI (`NullAiInsightProvider` → 503);
gerçek Anthropic sağlayıcısı yazılı ama yalnızca yapılandırmayla açılır.

**Architecture:** Önce DB'siz ortak parçalar gelir: 503 exception'ı, `LocalDayRange.EnsureOrdered`,
`PagedQuery` tabanı ve saf aralık çözümü `AiInsightRange`. Sonra `AiInsight`'a `RangeFrom`/`RangeTo`
eklenir, migration üretilir ve repository yazılır. Ardından sağlayıcı katmanı kurulur:
- `IAiInsightProvider`,
- Null ve Anthropic sağlayıcıları,
- ayarlar ve fail-fast DI,
- saf maliyet hesabı.

`AiInsightService` şu sırayla çalışır: aralığı çözer, Faz 11 export'unu okur, sağlayıcıyı **transaction
dışında** çağırır, sonucu tek `SaveChangesAsync` ile kaydeder. En son ince bir controller ve uçtan uca
testler gelir.

**Tech Stack:** .NET 10, ASP.NET Core Web API, EF Core 10 (Npgsql), PostgreSQL 17 (Docker, host port
5433), xUnit, resmi Anthropic C# SDK (`Anthropic` 12.47.0).

**Spec:** `docs/superpowers/specs/2026-09-11-ai-insight-design.md` (onaylandı 2026-09-11)

## Global Constraints

Her görevin gereksinimleri bu bölümü örtük olarak içerir.

- **Katman kuralı:** `DbContext`'e yalnızca `Repositories/` ve `Data/` dokunur. Controller iş mantığı
  içermez, `if`/`try` taşımaz. Hata çevirisi `GlobalExceptionHandler`'da.
- **IDOR:** her sorgu `a.UserId == userId` yüklemini taşır. Başkasının kaydı nötr mesajlı 404 alır
  (`Yorum bulunamadı.`, id İÇERMEZ). Başkasının oturum/set id'siyle süzmek boş sayfa verir (spec Karar 13).
- **Transaction (spec Karar 6):** `BeginTransaction` YAZILMAZ. Sağlayıcı çağrısı sırasında bekleyen
  izlenmiş değişiklik OLMAZ; `repository.Add` sağlayıcı döndükten SONRA yapılır. Tek `SaveChangesAsync`.
- **Ücretli adım (spec Karar 7):** sağlayıcı çağrısı ve ardından gelen `SaveChangesAsync`
  `CancellationToken.None` alır. Önceki okumalar isteğin belirtecini alır.
- **Zaman:** `DateTime.UtcNow` doğrudan çağrılmaz, enjekte edilen `TimeProvider` kullanılır. TR günü
  `TurkeyDay.LocalDateOf`, aralık kuralları `LocalDayRange` / `AiInsightRange` üzerinden.
- **Sağlayıcı hata metni istemciye ASLA gitmez.** Loglanır; istemciye yalnızca bu koddaki sabit mesajlarla
  `ServiceUnavailableException` (503) gider.
- **Gizli bilgi:** `Ai:ApiKey` yalnızca user-secrets / ortam değişkeninde. `appsettings.json`'da boş kalır.
- **Varsayılanlar (spec Karar 9, birebir):** `Provider = None`, `Model = "claude-opus-5"`,
  `MaxTokens = 16000`, `TimeoutSeconds = 180`, `InputUsdPerMillionTokens = 5.0`,
  `OutputUsdPerMillionTokens = 25.0`. Fallback: `Betas = ["server-side-fallback-2026-07-01"]` +
  `Fallbacks = new Default()`.
- **Sabit mesajlar (birebir):**
  - `AI yorumlama şu an kapalı.`
  - `AI sağlayıcısına şu an ulaşılamıyor. Lütfen daha sonra tekrar deneyin.`
  - `Model bu isteğe yanıt vermedi.`
  - `Bu aralıkta yorumlanacak kayıt yok.`
  - `Aralık en fazla 366 gün olabilir.`
  - `Yorum bulunamadı.`
- **Migration yalnızca komutla üretilir:** `dotnet dotnet-ef migrations add AiInsightAralikAlanlari
  --project src/Grind.Api`. Üretilen dosya ELLE DÜZENLENMEZ. Yanlışsa `migrations remove` + model
  düzeltmesi + yeniden üretim.
- **Test:**
  - Veritabanı isteyen testler `[Trait("Category", "Database")]` taşır ve transaction + rollback
    deseniyle yazılır.
  - Veritabanı çalışıyor olmalı: repo kökünde `docker compose up -d`.
  - Test adları Türkçe.
  - Test projesinde global using olarak yalnızca `Xunit` var; diğer her namespace dosya başına açıkça
    yazılır.
  - Sağlayıcı testleri ağa ÇIKMAZ: sahte `HttpMessageHandler` kullanılır.
- **Commit mesajları** Türkçe, `feat(...)`/`test(...)`/`refactor(...)` önekiyle, ASCII karakterlerle.
  Her mesaj şu satırla biter:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

---

## Dosya Haritası

**Yeni:**
- `src/Grind.Api/Common/Exceptions/ServiceUnavailableException.cs`
- `src/Grind.Api/Models/Dtos/Common/PagedQuery.cs`
- `src/Grind.Api/Services/AiInsightRange.cs`
- `src/Grind.Api/Data/Migrations/<zaman>_AiInsightAralikAlanlari.cs` (+ `.Designer.cs`, üretilir)
- `src/Grind.Api/Repositories/IAiInsightRepository.cs` / `AiInsightRepository.cs`
- `src/Grind.Api/Services/Ai/AiProviderKind.cs`
- `src/Grind.Api/Services/Ai/AiSettings.cs`
- `src/Grind.Api/Services/Ai/IAiInsightProvider.cs` (+ `AiCompletion`)
- `src/Grind.Api/Services/Ai/NullAiInsightProvider.cs`
- `src/Grind.Api/Services/Ai/AnthropicAiInsightProvider.cs`
- `src/Grind.Api/Services/Ai/AiCostCalculator.cs`
- `src/Grind.Api/Services/Ai/AiInsightPrompt.cs`
- `src/Grind.Api/Services/Ai/DependencyInjection.cs`
- `src/Grind.Api/Models/Dtos/Insight/GenerateInsightRequest.cs`
- `src/Grind.Api/Models/Dtos/Insight/AiInsightQuery.cs`
- `src/Grind.Api/Models/Dtos/Insight/AiInsightResponse.cs`
- `src/Grind.Api/Services/IAiInsightService.cs` / `AiInsightService.cs`
- `src/Grind.Api/Controllers/InsightsController.cs`
- `tests/Grind.Tests/Services/AiInsightRangeTests.cs`
- `tests/Grind.Tests/Repositories/AiInsightRepositoryTests.cs`
- `tests/Grind.Tests/Services/Ai/AiCostCalculatorTests.cs`
- `tests/Grind.Tests/Services/Ai/AiProviderRegistrationTests.cs`
- `tests/Grind.Tests/Services/Ai/AnthropicAiInsightProviderTests.cs`
- `tests/Grind.Tests/Services/AiInsightServiceTests.cs`
- `tests/Grind.Tests/Integration/SahteAiApiFactory.cs`
- `tests/Grind.Tests/Integration/AiInsightEndpointsTests.cs`

**Değişen:**
- `src/Grind.Api/Common/ErrorHandling/GlobalExceptionHandler.cs` (+ 503)
- `src/Grind.Api/Common/Time/LocalDayRange.cs` (+ `EnsureOrdered`; `Resolve` onu kullanır)
- `src/Grind.Api/Models/Dtos/Common/PagedRangeQuery.cs` (`: PagedQuery`)
- `src/Grind.Api/Models/Entities/AiInsight.cs` (+ `RangeFrom`, `RangeTo`)
- `src/Grind.Api/Data/Migrations/AppDbContextModelSnapshot.cs` (üretilir)
- `src/Grind.Api/Data/DependencyInjection.cs` (+ `IAiInsightRepository`)
- `src/Grind.Api/Services/DependencyInjection.cs` (+ `IAiInsightService`)
- `src/Grind.Api/Grind.Api.csproj` (+ `Anthropic` 12.47.0)
- `src/Grind.Api/Program.cs` (+ `AddAiInsightProvider`, `TimeProvider` yorumu)
- `src/Grind.Api/appsettings.json` (+ `Ai` bölümü)
- `tests/Grind.Tests/Common/GlobalExceptionHandlerTests.cs` (+2)
- `tests/Grind.Tests/Data/ColumnMappingTests.cs` (+2)
- `tests/Grind.Tests/Data/PersistenceRegistrationTests.cs` (+1)

---

### Task 1: DB'siz ortak parçalar — 503, sıralama kuralı, `PagedQuery`, yorum aralığı

**Files:**
- Create: `src/Grind.Api/Common/Exceptions/ServiceUnavailableException.cs`
- Modify: `src/Grind.Api/Common/ErrorHandling/GlobalExceptionHandler.cs` (`Map` switch'i)
- Modify: `src/Grind.Api/Common/Time/LocalDayRange.cs`
- Create: `src/Grind.Api/Models/Dtos/Common/PagedQuery.cs`
- Modify: `src/Grind.Api/Models/Dtos/Common/PagedRangeQuery.cs`
- Create: `src/Grind.Api/Services/AiInsightRange.cs`
- Test: `tests/Grind.Tests/Common/GlobalExceptionHandlerTests.cs`
- Test: `tests/Grind.Tests/Services/AiInsightRangeTests.cs`

**Interfaces:**
- Consumes: yok.
- Produces:
  - `Grind.Api.Common.Exceptions.ServiceUnavailableException(string message)` → HTTP 503, başlık
    `Hizmet kullanılamıyor`.
  - `LocalDayRange.EnsureOrdered(DateOnly? from, DateOnly? to)`: `from > to` ise
    `ValidationException("Başlangıç tarihi bitiş tarihinden sonra olamaz.")`.
  - `Grind.Api.Models.Dtos.Common.PagedQuery`: `int Page` (varsayılan 1, `[Range(1, int.MaxValue)]`),
    `int PageSize` (varsayılan 20, `[Range(1, 100)]`), `int Skip()`. `PagedRangeQuery : PagedQuery`.
  - `Grind.Api.Services.AiInsightRange.Resolve(DateOnly? from, DateOnly? to, DateOnly today)` →
    `(DateOnly From, DateOnly To)`; sabitler `DefaultDays = 30`, `MaxDays = 366`.

- [ ] **Step 1: 503 için başarısız testleri yaz**

`tests/Grind.Tests/Common/GlobalExceptionHandlerTests.cs` içinde `Domain_exceptionlari_dogru_duruma_eslenir`
teorisinin `[InlineData(typeof(ConflictException), 409)]` satırının ALTINA ekle:

```csharp
    [InlineData(typeof(ServiceUnavailableException), 503)]
```

Aynı sınıfta `Domain_exception_mesaji_production_da_da_gorunur` testinin ALTINA ekle:

```csharp
    /// <summary>
    /// 503 bir 5xx'tir ama mesajı bizim yazdığımız sabit bir metindir (sağlayıcının metni asla değil):
    /// yalnızca tam 500'ün mesajı gizlenir, 503'ünki Production'da da görünmeli (Faz 12 spec Karar 12).
    /// </summary>
    [Fact]
    public async Task Hizmet_kullanilamiyor_mesaji_production_da_da_gorunur()
    {
        var (statusCode, body) = await HandleAsync(
            new ServiceUnavailableException("AI yorumlama şu an kapalı."), "Production");

        Assert.Equal(503, statusCode);
        Assert.Equal("AI yorumlama şu an kapalı.", body.GetProperty("detail").GetString());
    }
```

- [ ] **Step 2: Yorum aralığı için başarısız testleri yaz**

`tests/Grind.Tests/Services/AiInsightRangeTests.cs` oluştur:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Services;

namespace Grind.Tests.Services;

/// <summary>
/// AI yorumunun kapsadığı TR günleri (Faz 12 spec Karar 4). Saf: "bugün" dışarıdan verilir, DB yok.
/// </summary>
public class AiInsightRangeTests
{
    private static readonly DateOnly Bugun = new(2026, 3, 12);

    /// <summary>İki ucu dahil 30 gün: 11 Şubat – 12 Mart (2026 Şubat'ı 28 gün).</summary>
    [Fact]
    public void Aralik_verilmezse_bugun_biten_son_otuz_gundur()
    {
        var (from, to) = AiInsightRange.Resolve(null, null, Bugun);

        Assert.Equal(new DateOnly(2026, 2, 11), from);
        Assert.Equal(Bugun, to);
    }

    [Fact]
    public void Yalnizca_bitis_verilirse_ondan_geriye_otuz_gun_alinir()
    {
        var (from, to) = AiInsightRange.Resolve(null, new DateOnly(2026, 1, 31), Bugun);

        Assert.Equal(new DateOnly(2026, 1, 2), from);
        Assert.Equal(new DateOnly(2026, 1, 31), to);
    }

    [Fact]
    public void Yalnizca_baslangic_verilirse_bitis_bugundur()
    {
        var (from, to) = AiInsightRange.Resolve(new DateOnly(2026, 1, 1), null, Bugun);

        Assert.Equal(new DateOnly(2026, 1, 1), from);
        Assert.Equal(Bugun, to);
    }

    /// <summary>Artık yıl: 1 Ocak – 31 Aralık 2024 iki ucu dahil tam 366 gündür ve kabul edilir.</summary>
    [Fact]
    public void Tam_366_gun_kabul_edilir()
    {
        var (from, to) = AiInsightRange.Resolve(new DateOnly(2024, 1, 1), new DateOnly(2024, 12, 31), Bugun);

        Assert.Equal(365, to.DayNumber - from.DayNumber);
    }

    /// <summary>1 Ocak 2024 – 1 Ocak 2025 iki ucu dahil 367 gündür: maliyet sınırı (spec Karar 4).</summary>
    [Fact]
    public void Uc_yuz_altmis_yedi_gun_reddedilir()
    {
        var hata = Assert.Throws<ValidationException>(
            () => AiInsightRange.Resolve(new DateOnly(2024, 1, 1), new DateOnly(2025, 1, 1), Bugun));

        Assert.Equal("Aralık en fazla 366 gün olabilir.", hata.Message);
    }

    [Fact]
    public void Ters_aralik_reddedilir()
    {
        var hata = Assert.Throws<ValidationException>(
            () => AiInsightRange.Resolve(new DateOnly(2026, 3, 10), new DateOnly(2026, 3, 1), Bugun));

        Assert.Equal("Başlangıç tarihi bitiş tarihinden sonra olamaz.", hata.Message);
    }

    /// <summary>
    /// AYIRT EDİCİ: 0001-01-10'dan 29 gün geri gitmek DateOnly.AddDays'i taşırır
    /// (ArgumentOutOfRangeException → 500). Başlangıç en erken güne sabitlenmeli.
    /// </summary>
    [Fact]
    public void Takvimin_basina_yakin_bitis_tasmaz()
    {
        var (from, to) = AiInsightRange.Resolve(null, new DateOnly(1, 1, 10), Bugun);

        Assert.Equal(DateOnly.MinValue, from);
        Assert.Equal(new DateOnly(1, 1, 10), to);
    }
}
```

- [ ] **Step 3: Testlerin derlenmediğini doğrula**

Run: `dotnet build tests/Grind.Tests`
Expected: FAIL — `ServiceUnavailableException` ve `AiInsightRange` bulunamıyor (CS0246 / CS0103).

- [ ] **Step 4: `ServiceUnavailableException`'ı yaz ve eşle**

`src/Grind.Api/Common/Exceptions/ServiceUnavailableException.cs` oluştur:

```csharp
namespace Grind.Api.Common.Exceptions;

/// <summary>
/// Bağımlı olunan bir hizmet şu an kullanılamıyor: AI sağlayıcısı kapalı, erişilemiyor ya da yanıt
/// üretmedi (Faz 12 spec Karar 12). Mesaj istemciye aynen gider; bu yüzden dış sağlayıcının hata metni
/// buraya ASLA konmaz, yalnızca koddaki sabit mesajlar.
/// </summary>
public class ServiceUnavailableException(string message) : Exception(message);
```

`src/Grind.Api/Common/ErrorHandling/GlobalExceptionHandler.cs` içindeki `Map` switch'inde
`ConflictException` satırının ALTINA ekle:

```csharp
        ServiceUnavailableException => (StatusCodes.Status503ServiceUnavailable, "Hizmet kullanılamıyor"),
```

(`Detail()` yalnızca tam 500'ün mesajını gizler; 503 için değişiklik GEREKMEZ.)

- [ ] **Step 5: `LocalDayRange.EnsureOrdered`'ı çıkar**

`src/Grind.Api/Common/Time/LocalDayRange.cs` içinde `Resolve`'un başındaki bloğu:

```csharp
        if (from is { } start && to is { } end && start > end)
        {
            // Sessizce boş liste dönmek, kullanıcının parametreleri ters yazdığını gizlerdi.
            throw new ValidationException("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
        }
```

şununla değiştir:

```csharp
        EnsureOrdered(from, to);
```

ve sınıfın içine, `Resolve`'un ALTINA ekle:

```csharp
    /// <summary>
    /// <paramref name="from"/> &gt; <paramref name="to"/> ise reddeder. Sıralama kuralının TEK kopyası:
    /// <see cref="Resolve"/> ve AI yorum aralığı (Faz 12, <c>AiInsightRange</c>) bunu kullanır. Null
    /// uçlar sınırsızdır, karşılaştırılmaz.
    /// </summary>
    /// <exception cref="ValidationException"><paramref name="from"/> &gt; <paramref name="to"/>.</exception>
    public static void EnsureOrdered(DateOnly? from, DateOnly? to)
    {
        if (from is { } start && to is { } end && start > end)
        {
            // Sessizce boş liste dönmek, kullanıcının parametreleri ters yazdığını gizlerdi.
            throw new ValidationException("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
        }
    }
```

- [ ] **Step 6: `PagedQuery` tabanını çıkar**

`src/Grind.Api/Models/Dtos/Common/PagedQuery.cs` oluştur. `Page`, `PageSize` ve `Skip()` BİREBİR
`PagedRangeQuery`'den taşınır (öznitelikler, mesajlar ve `Skip()`'in taşma yorumu dahil):

```csharp
using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Common;

/// <summary>
/// Sayfalı liste uçlarının ortak sayfalama parametreleri. Tarih aralıklı listeler
/// <see cref="PagedRangeQuery"/>'yi, aralığı olmayan listeler (AI yorumları, Faz 12) doğrudan bunu
/// kullanır — sayfa kuralı tek yerde yaşar.
/// </summary>
public class PagedQuery
{
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

`src/Grind.Api/Models/Dtos/Common/PagedRangeQuery.cs` dosyasının TAMAMINI şununla değiştir:

```csharp
namespace Grind.Api.Models.Dtos.Common;

/// <summary>
/// Tarih aralıklı, sayfalı liste uçlarının ortak parametreleri (geçmiş, tartı listesi). Sayfalama
/// <see cref="PagedQuery"/>'den gelir. <c>From</c>/<c>To</c> TR yerel GÜNÜDÜR (<c>2026-03-01</c>) ve İKİ
/// UCU DA DAHİLDİR. <c>DateOnly</c> bilinçli: <c>DateTime</c> olsaydı istemcinin gönderdiği
/// <c>2026-03-01T00:00:00Z</c> sessizce TR 03:00'e denk gelir ve gecenin ilk üç saatindeki kayıtlar
/// aralığın dışında kalırdı.
/// </summary>
public class PagedRangeQuery : PagedQuery
{
    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }
}
```

- [ ] **Step 7: `AiInsightRange`'i yaz**

`src/Grind.Api/Services/AiInsightRange.cs` oluştur:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Time;

namespace Grind.Api.Services;

/// <summary>
/// AI yorumunun kapsadığı TR günleri (Faz 12 spec Karar 4). Saf fonksiyon: "bugün" dışarıdan verilir.
/// Export'tan farklı olarak aralık her zaman SOMUTTUR: satırda saklanır (Karar 3) ve maliyet aralıkla
/// büyüdüğü için üstten sınırlıdır.
/// </summary>
public static class AiInsightRange
{
    /// <summary>Varsayılan uzunluk: bitiş günü dahil son 30 gün.</summary>
    public const int DefaultDays = 30;

    /// <summary>İki ucu dahil en fazla bu kadar gün: artık yıl dahil tam bir yıl.</summary>
    public const int MaxDays = 366;

    /// <summary>
    /// <paramref name="to"/> yoksa <paramref name="today"/>; <paramref name="from"/> yoksa
    /// <c>to − 29</c> gün. Ters aralık ve <see cref="MaxDays"/>'ten uzun aralık 400.
    /// </summary>
    /// <exception cref="ValidationException">Ters ya da çok uzun aralık.</exception>
    public static (DateOnly From, DateOnly To) Resolve(DateOnly? from, DateOnly? to, DateOnly today)
    {
        var end = to ?? today;

        // Takvimin ilk 29 gününe düşen bir bitişte AddDays taşar (ArgumentOutOfRangeException, eşlenmediği
        // için 500); başlangıç en erken güne sabitlenir.
        var start = from ?? (end.DayNumber >= DefaultDays - 1
            ? end.AddDays(-(DefaultDays - 1))
            : DateOnly.MinValue);

        LocalDayRange.EnsureOrdered(start, end);

        if (end.DayNumber - start.DayNumber + 1 > MaxDays)
        {
            throw new ValidationException($"Aralık en fazla {MaxDays} gün olabilir.");
        }

        return (start, end);
    }
}
```

- [ ] **Step 8: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~GlobalExceptionHandlerTests|FullyQualifiedName~AiInsightRangeTests|FullyQualifiedName~LocalDayRangeTests|FullyQualifiedName~PagedRangeQueryTests"`
Expected: PASS. Hepsi yeşil; `LocalDayRangeTests` ve `PagedRangeQueryTests` çıkarılan yardımcıların
regresyon ağıdır ve değişmeden geçmelidir.

- [ ] **Step 9: Tüm test paketini çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS. `HistoryQuery` ve tartı listesi `PagedRangeQuery` üzerinden sayfalamayı hâlâ bağlıyor
olmalı; uçtan uca sayfalama testleri (`QueryEndpointsTests`, `BodyWeightEndpointsTests`) bunu sınar.

- [ ] **Step 10: Commit**

```bash
git add src/Grind.Api/Common/Exceptions/ServiceUnavailableException.cs src/Grind.Api/Common/ErrorHandling/GlobalExceptionHandler.cs src/Grind.Api/Common/Time/LocalDayRange.cs src/Grind.Api/Models/Dtos/Common/PagedQuery.cs src/Grind.Api/Models/Dtos/Common/PagedRangeQuery.cs src/Grind.Api/Services/AiInsightRange.cs tests/Grind.Tests/Common/GlobalExceptionHandlerTests.cs tests/Grind.Tests/Services/AiInsightRangeTests.cs
git commit -m "feat(ai): 503 eslemesi, ortak sayfalama tabani ve yorum araligi cozumu" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `RangeFrom`/`RangeTo` + migration + `AiInsightRepository`

**Files:**
- Modify: `src/Grind.Api/Models/Entities/AiInsight.cs`
- Create (üretilir): `src/Grind.Api/Data/Migrations/<zaman>_AiInsightAralikAlanlari.cs` + `.Designer.cs`
- Modify (üretilir): `src/Grind.Api/Data/Migrations/AppDbContextModelSnapshot.cs`
- Create: `src/Grind.Api/Repositories/IAiInsightRepository.cs`
- Create: `src/Grind.Api/Repositories/AiInsightRepository.cs`
- Modify: `src/Grind.Api/Data/DependencyInjection.cs`
- Test: `tests/Grind.Tests/Data/ColumnMappingTests.cs`
- Test: `tests/Grind.Tests/Data/PersistenceRegistrationTests.cs`
- Test: `tests/Grind.Tests/Repositories/AiInsightRepositoryTests.cs`

**Interfaces:**
- Consumes: yok (Task 1'den bağımsız).
- Produces:
  - `AiInsight.RangeFrom` / `AiInsight.RangeTo`: `DateOnly?`, PostgreSQL `date`, nullable.
  - `IAiInsightRepository : IRepository<AiInsight>`:
    - `Task<AiInsight?> GetOwnedByIdAsync(long id, long userId, CancellationToken cancellationToken = default)`,
      izlemeli.
    - `Task<(IReadOnlyList<AiInsight> Items, int TotalCount)> GetPageAsync(long userId, AiInsightKind? kind, long? workoutSessionId, long? setEntryId, int skip, int take, CancellationToken cancellationToken = default)`,
      izlemesiz, `CreatedAt` azalan / `Id` azalan.
  - DI: `IAiInsightRepository` → `AiInsightRepository` (scoped, `AddPersistence` içinde).

- [ ] **Step 1: Sütun eşlemesi için başarısız testi yaz**

`tests/Grind.Tests/Data/ColumnMappingTests.cs` sınıfının SONUNA (son `}`'den önce) ekle:

```csharp

    /// <summary>
    /// Yorumun kapsadığı TR günleri (Faz 12 spec Karar 3). Gün bir TARİHTİR, an değil: timestamptz
    /// olsaydı saat dilimi dönüşümü günü kaydırabilirdi. Suggestion satırlarında boş kalır.
    /// </summary>
    [Theory]
    [InlineData("RangeFrom")]
    [InlineData("RangeTo")]
    public void Yorum_araligi_nullable_date_sutunudur(string propertyName)
    {
        var property = TestModel.Entity<AiInsight>().FindProperty(propertyName)!;

        Assert.NotNull(property);
        Assert.Equal("date", property.GetColumnType());
        Assert.True(property.IsNullable);
    }
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~ColumnMappingTests"`
Expected: FAIL — `FindProperty("RangeFrom")` null döner (NullReferenceException / Assert.NotNull).

- [ ] **Step 3: Entity'ye alanları ekle**

`src/Grind.Api/Models/Entities/AiInsight.cs` içinde `public long? SetEntryId { get; set; }` satırının ALTINA
ekle:

```csharp

    /// <summary>
    /// Yorumun kapsadığı TR yerel günleri, iki ucu dahil (Faz 12 spec Karar 3). Insight satırlarında
    /// dolu; oturum kapsamlı olacak Suggestion satırlarında null. Girdisi bilinmeyen bir yorum
    /// belirsizdir ve istemci aynı aralık için tekrar ücret ödemeden önce buna bakar.
    /// </summary>
    public DateOnly? RangeFrom { get; set; }

    public DateOnly? RangeTo { get; set; }
```

Konfigürasyon sınıfına DOKUNMA: Npgsql `DateOnly`'yi kural gereği `date`'e eşler.

- [ ] **Step 4: Sütun testini çalıştır**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~ColumnMappingTests"`
Expected: PASS (model testleri veritabanına bağlanmaz).

- [ ] **Step 5: Migration'ı üret ve uygula**

Run: `dotnet dotnet-ef migrations add AiInsightAralikAlanlari --project src/Grind.Api`
Expected: `Done.` ve `src/Grind.Api/Data/Migrations/` altında `<zaman>_AiInsightAralikAlanlari.cs`,
`.Designer.cs` ve güncellenmiş `AppDbContextModelSnapshot.cs`.

Üretilen migration'ı OKU (düzenleme). `Up` yalnızca iki `AddColumn<DateOnly>` içermeli:
`RangeFrom` ve `RangeTo`, tablo `AiInsights`, `type: "date"`, `nullable: true`. `Down` ikisini
`DropColumn` ile kaldırmalı. Başka bir şey varsa (ör. beklenmeyen bir tablo/indeks değişikliği) DUR ve
raporla: model başka bir yerde de değişmiş demektir.

Run: `dotnet dotnet-ef database update --project src/Grind.Api`
Expected: `Done.` (geliştirme veritabanına uygulanır; DB testleri yeni sütunları ister).

Run: `dotnet dotnet-ef migrations has-pending-model-changes --project src/Grind.Api`
Expected: `No changes have been made to the model since the last migration.` (CI'daki drift kontrolü).

- [ ] **Step 6: Repository için başarısız testleri yaz**

`tests/Grind.Tests/Repositories/AiInsightRepositoryTests.cs` oluştur:

```csharp
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class AiInsightRepositoryTests
{
    private static readonly DateTime An = new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    private static AiInsight NewInsight(
        User user, DateTime createdAt, AiInsightKind kind = AiInsightKind.Insight,
        WorkoutSession? session = null, SetEntry? setEntry = null) => new()
    {
        User = user,
        Kind = kind,
        WorkoutSession = session,
        SetEntry = setEntry,
        Content = "yorum",
        Model = "test-model",
        CreatedAt = createdAt
    };

    [Fact]
    public async Task Baskasinin_kaydi_GetOwnedByIdAsync_ile_alinamaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var insight = NewInsight(sahip, An);
        context.AddRange(sahip, davetsiz, insight);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new AiInsightRepository(context);

        Assert.Null(await repository.GetOwnedByIdAsync(insight.Id, davetsiz.Id));
    }

    /// <summary>Silme bu sorgunun döndürdüğü nesneyi kullanır; izlemesiz dönseydi silme hiçbir şey yazmazdı.</summary>
    [Fact]
    public async Task Kendi_kaydi_izlenerek_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var insight = NewInsight(user, An);
        context.AddRange(user, insight);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var bulunan = await new AiInsightRepository(context).GetOwnedByIdAsync(insight.Id, user.Id);

        Assert.NotNull(bulunan);
        Assert.Equal(EntityState.Unchanged, context.Entry(bulunan).State);
    }

    [Fact]
    public async Task Sayfa_yeniden_eskiye_toplam_sayiyla_ve_izlemesiz_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var eski = NewInsight(user, An.AddDays(-2));
        var enYeni = NewInsight(user, An);
        var orta = NewInsight(user, An.AddDays(-1));
        // Bilerek karışık sırada eklenir: sıra eklemeden değil sorgudan gelmeli.
        context.AddRange(user, eski, enYeni, orta);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var (items, toplam) = await new AiInsightRepository(context)
            .GetPageAsync(user.Id, null, null, null, skip: 0, take: 2);

        Assert.Equal(3, toplam);
        Assert.Equal(new[] { enYeni.Id, orta.Id }, items.Select(i => i.Id));
        Assert.Empty(context.ChangeTracker.Entries());
    }

    [Fact]
    public async Task Tur_suzgeci_uygulanir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var oneri = NewInsight(user, An, AiInsightKind.Suggestion);
        context.AddRange(user, NewInsight(user, An.AddMinutes(-1)), oneri);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var (items, toplam) = await new AiInsightRepository(context)
            .GetPageAsync(user.Id, AiInsightKind.Suggestion, null, null, skip: 0, take: 20);

        Assert.Equal(1, toplam);
        Assert.Equal(oneri.Id, Assert.Single(items).Id);
    }

    [Fact]
    public async Task Oturum_ve_set_suzgecleri_uygulanir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        var session = TestDatabase.NewSession(user);
        var set = new SetEntry
        {
            WorkoutSession = session, Exercise = exercise, Weight = 100m, Reps = 8,
            RecordType = RecordType.None, CreatedAt = An
        };
        var oturumaBagli = NewInsight(user, An, AiInsightKind.Suggestion, session);
        var seteBagli = NewInsight(user, An, AiInsightKind.Suggestion, session, set);
        context.AddRange(user, exercise, session, set, oturumaBagli, seteBagli, NewInsight(user, An));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new AiInsightRepository(context);
        var (oturumdakiler, oturumToplami) = await repository
            .GetPageAsync(user.Id, null, session.Id, null, skip: 0, take: 20);
        var (settekiler, _) = await repository
            .GetPageAsync(user.Id, null, null, set.Id, skip: 0, take: 20);

        Assert.Equal(2, oturumToplami);
        Assert.Equal(
            new[] { oturumaBagli.Id, seteBagli.Id }.Order(), oturumdakiler.Select(i => i.Id).Order());
        Assert.Equal(seteBagli.Id, Assert.Single(settekiler).Id);
    }

    /// <summary>
    /// IDOR (spec Karar 13): başkasının oturum id'siyle süzmek, o oturuma bağlı YABANCI satırları değil
    /// boş sayfayı döndürmeli — sonuç her zaman kullanıcının kendi satırlarıyla sınırlı.
    /// </summary>
    [Fact]
    public async Task Baskasinin_oturumuyla_suzmek_bos_sayfa_verir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(sahip);
        context.AddRange(sahip, davetsiz, session, NewInsight(sahip, An, AiInsightKind.Suggestion, session));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var (items, toplam) = await new AiInsightRepository(context)
            .GetPageAsync(davetsiz.Id, null, session.Id, null, skip: 0, take: 20);

        Assert.Empty(items);
        Assert.Equal(0, toplam);
    }

    /// <summary>Yeni sütunlar gerçekten yazılıp okunuyor (veritabanından, izleyici temizlenerek).</summary>
    [Fact]
    public async Task Aralik_alanlari_kaydedilip_okunur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var insight = NewInsight(user, An);
        insight.RangeFrom = new DateOnly(2026, 2, 11);
        insight.RangeTo = new DateOnly(2026, 3, 12);
        context.AddRange(user, insight);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var okunan = await new AiInsightRepository(context).GetOwnedByIdAsync(insight.Id, user.Id);

        Assert.Equal(new DateOnly(2026, 2, 11), okunan!.RangeFrom);
        Assert.Equal(new DateOnly(2026, 3, 12), okunan.RangeTo);
    }
}
```

`tests/Grind.Tests/Data/PersistenceRegistrationTests.cs` içinde `Kayitli_tipler_cozulebilir` teorisinin
`[InlineData(typeof(ISetEntryRepository))]` satırının ALTINA ekle:

```csharp
    [InlineData(typeof(IAiInsightRepository))]
```

- [ ] **Step 7: Testlerin derlenmediğini doğrula**

Run: `dotnet build tests/Grind.Tests`
Expected: FAIL — `AiInsightRepository` / `IAiInsightRepository` bulunamıyor.

- [ ] **Step 8: Repository'yi yaz ve kaydet**

`src/Grind.Api/Repositories/IAiInsightRepository.cs` oluştur:

```csharp
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;

namespace Grind.Api.Repositories;

public interface IAiInsightRepository : IRepository<AiInsight>
{
    /// <summary>
    /// Başkasının kaydında null (IDOR — sahiplik doğrudan <c>UserId</c> üzerinde). İZLEMELİ döner:
    /// silme bu nesneyi kullanır.
    /// </summary>
    Task<AiInsight?> GetOwnedByIdAsync(long id, long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sayfa ve toplam sayı BİRLİKTE, aynı filtreden (ayrı metotlar filtreyi iki yerde tekrarlar ve biri
    /// değişince diğeri sessizce ayrışır). Sıra BELİRLİDİR: <c>CreatedAt</c> azalan, eşitlikte <c>Id</c>
    /// azalan. İzlemesiz. Null süzgeç uygulanmaz; verilenler VE'lenir ve sonuç HER ZAMAN kullanıcının
    /// kendi satırlarıyla sınırlıdır: başkasının oturum/set id'si boş sonuç verir (Faz 12 spec Karar 13).
    /// </summary>
    Task<(IReadOnlyList<AiInsight> Items, int TotalCount)> GetPageAsync(
        long userId,
        AiInsightKind? kind,
        long? workoutSessionId,
        long? setEntryId,
        int skip,
        int take,
        CancellationToken cancellationToken = default);
}
```

`src/Grind.Api/Repositories/AiInsightRepository.cs` oluştur:

```csharp
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class AiInsightRepository(AppDbContext context)
    : Repository<AiInsight>(context), IAiInsightRepository
{
    public Task<AiInsight?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, cancellationToken);

    public async Task<(IReadOnlyList<AiInsight> Items, int TotalCount)> GetPageAsync(
        long userId,
        AiInsightKind? kind,
        long? workoutSessionId,
        long? setEntryId,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var query = Set.Where(a => a.UserId == userId);

        if (kind is { } k)
        {
            query = query.Where(a => a.Kind == k);
        }

        if (workoutSessionId is { } sessionId)
        {
            query = query.Where(a => a.WorkoutSessionId == sessionId);
        }

        if (setEntryId is { } setId)
        {
            query = query.Where(a => a.SetEntryId == setId);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }
}
```

`src/Grind.Api/Data/DependencyInjection.cs` içinde
`services.AddScoped<IBodyWeightLogRepository, BodyWeightLogRepository>();` satırının ALTINA ekle:

```csharp
        services.AddScoped<IAiInsightRepository, AiInsightRepository>();
```

- [ ] **Step 9: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~AiInsightRepositoryTests|FullyQualifiedName~PersistenceRegistrationTests|FullyQualifiedName~ColumnMappingTests|FullyQualifiedName~ModelShapeTests"`
Expected: PASS.

- [ ] **Step 10: Tüm test paketini çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/Grind.Api/Models/Entities/AiInsight.cs src/Grind.Api/Data/Migrations src/Grind.Api/Repositories/IAiInsightRepository.cs src/Grind.Api/Repositories/AiInsightRepository.cs src/Grind.Api/Data/DependencyInjection.cs tests/Grind.Tests/Data/ColumnMappingTests.cs tests/Grind.Tests/Data/PersistenceRegistrationTests.cs tests/Grind.Tests/Repositories/AiInsightRepositoryTests.cs
git commit -m "feat(data): AiInsight aralik alanlari ve sahiplik filtreli yorum repository'si" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Sağlayıcı katmanı — soyutlama, Null + Anthropic sağlayıcıları, ayarlar, maliyet

**Files:**
- Modify: `src/Grind.Api/Grind.Api.csproj` (paket)
- Create: `src/Grind.Api/Services/Ai/AiProviderKind.cs`
- Create: `src/Grind.Api/Services/Ai/AiSettings.cs`
- Create: `src/Grind.Api/Services/Ai/IAiInsightProvider.cs`
- Create: `src/Grind.Api/Services/Ai/NullAiInsightProvider.cs`
- Create: `src/Grind.Api/Services/Ai/AiCostCalculator.cs`
- Create: `src/Grind.Api/Services/Ai/AiInsightPrompt.cs`
- Create: `src/Grind.Api/Services/Ai/AnthropicAiInsightProvider.cs`
- Create: `src/Grind.Api/Services/Ai/DependencyInjection.cs`
- Test: `tests/Grind.Tests/Services/Ai/AiCostCalculatorTests.cs`
- Test: `tests/Grind.Tests/Services/Ai/AiProviderRegistrationTests.cs`
- Test: `tests/Grind.Tests/Services/Ai/AnthropicAiInsightProviderTests.cs`

**Interfaces:**
- Consumes: `ServiceUnavailableException(string)` (Task 1).
- Produces (namespace `Grind.Api.Services.Ai`):
  - `interface IAiInsightProvider { Task<AiCompletion> CompleteAsync(string instructions, string trainingData, CancellationToken cancellationToken = default); }`
  - `sealed record AiCompletion(string Content, string Model, int? TokensUsed, decimal? EstimatedCostUsd)`
  - `NullAiInsightProvider` (sabit `DisabledMessage = "AI yorumlama şu an kapalı."`)
  - `AnthropicAiInsightProvider(AnthropicClient client, AiSettings settings, ILogger<AnthropicAiInsightProvider> logger)`
    (sabitler `FallbackBeta`, `UnreachableMessage`, `NoAnswerMessage`)
  - `enum AiProviderKind { None, Anthropic }`; `class AiSettings` (spec Karar 9 alanları)
  - `static class AiCostCalculator { decimal? Estimate(long inputTokens, long outputTokens, decimal? inputUsdPerMillion, decimal? outputUsdPerMillion); }`
  - `static class AiInsightPrompt { const string Instructions; }`
  - `IServiceCollection AddAiInsightProvider(this IServiceCollection services, AiSettings settings)`
    (singleton `IAiInsightProvider`)

**SDK notu (planlama sırasında 12.47.0'a karşı geçici bir derlemeyle doğrulandı):**
- `Anthropic.Models.Beta.Messages.MessageCreateParams` şu alanları kabul eder:
  - `System = "<string>"`,
  - `Betas = ["server-side-fallback-2026-07-01"]`,
  - `Fallbacks = new Default()`. `Default` aynı ad alanında bir sabit sınıftır; `Default.Default` YOK.
    Liste biçimi collection expression ile ATANAMAZ.
- İstek: `client.Beta.Messages.Create(parameters, cancellationToken)` → `BetaMessage`.
- Yanıt okuma:
  - metin: `response.Content.Select(b => b.Value).OfType<BetaTextBlock>()`,
  - token: `response.Usage.InputTokens` / `OutputTokens` (`long`),
  - model: `string model = response.Model`,
  - ret kontrolü: `response.StopReason == "refusal"`.
- Hata tipleri `Anthropic.Exceptions` altında: `AnthropicApiException`, `AnthropicIOException`.
- `AnthropicClient`'ın `ApiKey`, `HttpClient`, `MaxRetries`, `Timeout` (`TimeSpan`) ve `BaseUrl`
  özellikleri object initializer ile verilebilir.

- [ ] **Step 1: Paketi ekle**

Run: `dotnet add src/Grind.Api/Grind.Api.csproj package Anthropic --version 12.47.0`
Expected: csproj'a `<PackageReference Include="Anthropic" Version="12.47.0" />` eklenir.

- [ ] **Step 2: Maliyet hesabı için başarısız testleri yaz**

`tests/Grind.Tests/Services/Ai/AiCostCalculatorTests.cs` oluştur:

```csharp
using Grind.Api.Services.Ai;

namespace Grind.Tests.Services.Ai;

/// <summary>LLM çağrısının tahmini maliyeti (Faz 12 spec Karar 10). Saf fonksiyon.</summary>
public class AiCostCalculatorTests
{
    /// <summary>Varsayılan model fiyatları: 1M girdi 5 USD + 1M çıktı 25 USD.</summary>
    [Fact]
    public void Milyon_token_fiyatlari_toplanir()
    {
        Assert.Equal(30m, AiCostCalculator.Estimate(1_000_000, 1_000_000, 5m, 25m));
    }

    /// <summary>
    /// AYIRT EDİCİ: 0,0000005 USD, sütun ölçeğine (6 ondalık) yuvarlanırken AwayFromZero ile 0,000001
    /// olur; .NET'in varsayılanı (banker's rounding) 0 verirdi.
    /// </summary>
    [Fact]
    public void Sonuc_alti_ondaliga_uzaga_yuvarlanir()
    {
        Assert.Equal(0.000001m, AiCostCalculator.Estimate(1, 0, 0.5m, 0m));
        Assert.Equal(0.020345m, AiCostCalculator.Estimate(1234, 567, 5m, 25m));
    }

    [Fact]
    public void Fiyat_bilinmiyorsa_maliyet_null_kalir()
    {
        Assert.Null(AiCostCalculator.Estimate(1000, 1000, null, 25m));
        Assert.Null(AiCostCalculator.Estimate(1000, 1000, 5m, null));
    }
}
```

- [ ] **Step 3: Kayıt ve ayar testlerini yaz**

`tests/Grind.Tests/Services/Ai/AiProviderRegistrationTests.cs` oluştur:

```csharp
using Grind.Api.Services.Ai;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Grind.Tests.Services.Ai;

/// <summary>
/// Sağlayıcı seçimi ve açılış doğrulaması (Faz 12 spec Karar 9): varsayılan KAPALI; yanlış yapılandırma
/// ilk isteği değil BOOT'u durdurur (Jwt:Key kontrolüyle aynı desen).
/// </summary>
public class AiProviderRegistrationTests
{
    private static AiSettings Anthropic() => new()
    {
        Provider = AiProviderKind.Anthropic,
        ApiKey = "test-anahtari"
    };

    private static IAiInsightProvider Resolve(AiSettings settings)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAiInsightProvider(settings);
        using var provider = services.BuildServiceProvider(validateScopes: true);
        return provider.GetRequiredService<IAiInsightProvider>();
    }

    [Fact]
    public void Varsayilan_yapilandirma_kapali_saglayiciyi_kaydeder()
    {
        Assert.IsType<NullAiInsightProvider>(Resolve(new AiSettings()));
    }

    [Fact]
    public void Anthropic_ve_anahtar_verilince_gercek_saglayici_kaydedilir()
    {
        Assert.IsType<AnthropicAiInsightProvider>(Resolve(Anthropic()));
    }

    [Fact]
    public void Anahtarsiz_Anthropic_baslangicta_reddedilir()
    {
        var settings = Anthropic();
        settings.ApiKey = string.Empty;

        var hata = Assert.Throws<InvalidOperationException>(
            () => new ServiceCollection().AddAiInsightProvider(settings));

        Assert.Contains("Ai:ApiKey", hata.Message);
    }

    [Theory]
    [InlineData(0, 180)]
    [InlineData(16000, 0)]
    public void Pozitif_olmayan_sinirlar_baslangicta_reddedilir(int maxTokens, int timeoutSeconds)
    {
        var settings = Anthropic();
        settings.MaxTokens = maxTokens;
        settings.TimeoutSeconds = timeoutSeconds;

        Assert.Throws<InvalidOperationException>(() => new ServiceCollection().AddAiInsightProvider(settings));
    }

    /// <summary>
    /// "Antropic" gibi bir yazım hatası özelliği sessizce kapalı bırakmamalı: enum bağlaması açılışta
    /// patlar (spec Karar 9).
    /// </summary>
    [Fact]
    public void Taninmayan_saglayici_adi_baglamada_reddedilir()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Ai:Provider"] = "Antropic" })
            .Build();

        Assert.Throws<InvalidOperationException>(() => configuration.GetSection("Ai").Get<AiSettings>());
    }

    [Fact]
    public void Saglayici_adi_buyuk_kucuk_harfe_duyarsiz_baglanir()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Ai:Provider"] = "anthropic" })
            .Build();

        Assert.Equal(AiProviderKind.Anthropic, configuration.GetSection("Ai").Get<AiSettings>()!.Provider);
    }
}
```

- [ ] **Step 4: Sağlayıcı testlerini yaz**

`tests/Grind.Tests/Services/Ai/AnthropicAiInsightProviderTests.cs` oluştur:

```csharp
using System.Net;
using System.Text;
using System.Text.Json;
using Anthropic;
using Grind.Api.Common.Exceptions;
using Grind.Api.Services.Ai;
using Microsoft.Extensions.Logging.Abstractions;

namespace Grind.Tests.Services.Ai;

/// <summary>
/// Gerçek sağlayıcı, ağa ÇIKMADAN: SDK'nın <c>HttpClient</c>'ına sahte bir handler verilir. Böylece
/// serileştirme dahil SDK'nın tüm yolu sınanır (Faz 12 spec Karar 8).
/// </summary>
public class AnthropicAiInsightProviderTests
{
    /// <summary>Gönderilen isteği kaydeder, verilen yanıtı döner (ya da verilen hatayı fırlatır).</summary>
    private sealed class SahteHandler(Func<HttpResponseMessage> yanit) : HttpMessageHandler
    {
        public HttpRequestMessage? Istek { get; private set; }
        public string? Govde { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Istek = request;
            Govde = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return yanit();
        }
    }

    private static readonly AiSettings Ayarlar = new()
    {
        Provider = AiProviderKind.Anthropic,
        ApiKey = "test-anahtari",
        Model = "claude-opus-5",
        MaxTokens = 16000,
        TimeoutSeconds = 30,
        InputUsdPerMillionTokens = 5m,
        OutputUsdPerMillionTokens = 25m
    };

    private static (AnthropicAiInsightProvider Provider, SahteHandler Handler) Kur(Func<HttpResponseMessage> yanit)
    {
        var handler = new SahteHandler(yanit);
        var client = new AnthropicClient
        {
            ApiKey = Ayarlar.ApiKey,
            HttpClient = new HttpClient(handler),
            // Yeniden deneme yok: hata testleri geri çekilme (backoff) beklemesin.
            MaxRetries = 0
        };

        return (new AnthropicAiInsightProvider(client, Ayarlar, NullLogger<AnthropicAiInsightProvider>.Instance),
            handler);
    }

    private static HttpResponseMessage Json(HttpStatusCode status, string json) =>
        new(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    private static string Mesaj(
        string stopReason, string contentJson, string model = "claude-opus-5",
        long input = 1200, long output = 300) => $$"""
        {
          "id": "msg_test",
          "type": "message",
          "role": "assistant",
          "model": "{{model}}",
          "content": {{contentJson}},
          "stop_reason": "{{stopReason}}",
          "stop_sequence": null,
          "usage": { "input_tokens": {{input}}, "output_tokens": {{output}} }
        }
        """;

    [Fact]
    public async Task Istek_model_talimat_veri_ve_fallback_ile_messages_ucuna_gider()
    {
        var (provider, handler) = Kur(() => Json(HttpStatusCode.OK,
            Mesaj("end_turn", """[{ "type": "text", "text": "yorum" }]""")));

        await provider.CompleteAsync("talimat", "veri");

        Assert.Equal(HttpMethod.Post, handler.Istek!.Method);
        Assert.EndsWith("/v1/messages", handler.Istek.RequestUri!.AbsolutePath);
        Assert.Equal("test-anahtari", handler.Istek.Headers.GetValues("x-api-key").Single());
        Assert.Contains(AnthropicAiInsightProvider.FallbackBeta,
            string.Join(",", handler.Istek.Headers.GetValues("anthropic-beta")));

        var govde = JsonDocument.Parse(handler.Govde!).RootElement;
        Assert.Equal("claude-opus-5", govde.GetProperty("model").GetString());
        Assert.Equal(16000, govde.GetProperty("max_tokens").GetInt32());
        Assert.Equal("talimat", govde.GetProperty("system").GetString());
        Assert.Equal("default", govde.GetProperty("fallbacks").GetString());
        var mesaj = Assert.Single(govde.GetProperty("messages").EnumerateArray());
        Assert.Equal("user", mesaj.GetProperty("role").GetString());
        Assert.Equal("veri", mesaj.GetProperty("content").GetString());
    }

    /// <summary>
    /// Fallback'in yanıtladığı gerçekçi bir yanıt: düşünme bloğu ve fallback geçiş bloğu atlanır,
    /// metin blokları birleşir, model YANITTAN gelir (istenen değil, fiilen yanıtlayan — denetim doğrusu).
    /// </summary>
    [Fact]
    public async Task Metin_bloklari_birlesir_model_yanittan_gelir_token_ve_maliyet_hesaplanir()
    {
        var (provider, _) = Kur(() => Json(HttpStatusCode.OK, Mesaj("end_turn", """
            [
              { "type": "thinking", "thinking": "", "signature": "imza" },
              { "type": "fallback", "from": { "model": "claude-opus-5" }, "to": { "model": "claude-opus-4-8" } },
              { "type": "text", "text": "Birinci bölüm. " },
              { "type": "text", "text": "İkinci bölüm." }
            ]
            """, model: "claude-opus-4-8", input: 1_000_000, output: 1_000_000)));

        var sonuc = await provider.CompleteAsync("talimat", "veri");

        Assert.Equal("Birinci bölüm. İkinci bölüm.", sonuc.Content);
        Assert.Equal("claude-opus-4-8", sonuc.Model);
        Assert.Equal(2_000_000, sonuc.TokensUsed);
        Assert.Equal(30m, sonuc.EstimatedCostUsd);
    }

    /// <summary>Kesilen yanıtın ücreti ödenmiştir; kesik bir yorum hiç yoktan iyidir (spec Karar 8).</summary>
    [Fact]
    public async Task Token_sinirinda_kesilen_yanit_dondurulur()
    {
        var (provider, _) = Kur(() => Json(HttpStatusCode.OK,
            Mesaj("max_tokens", """[{ "type": "text", "text": "yarım kalan yorum" }]""")));

        var sonuc = await provider.CompleteAsync("talimat", "veri");

        Assert.Equal("yarım kalan yorum", sonuc.Content);
    }

    [Fact]
    public async Task Ret_503_verir()
    {
        var (provider, _) = Kur(() => Json(HttpStatusCode.OK, Mesaj("refusal", "[]")));

        var hata = await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => provider.CompleteAsync("talimat", "veri"));

        Assert.Equal(AnthropicAiInsightProvider.NoAnswerMessage, hata.Message);
    }

    [Fact]
    public async Task Bos_metin_503_verir()
    {
        var (provider, _) = Kur(() => Json(HttpStatusCode.OK, Mesaj("end_turn",
            """[{ "type": "thinking", "thinking": "", "signature": "imza" }]""")));

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => provider.CompleteAsync("talimat", "veri"));
    }

    /// <summary>Sağlayıcının hata metni ("iç ayrıntı") istemciye ASLA ulaşmamalı; sabit mesaj döner.</summary>
    [Theory]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    public async Task Saglayici_hatasi_ic_ayrinti_sizdirmadan_503_verir(HttpStatusCode status)
    {
        var (provider, _) = Kur(() => Json(status,
            """{ "type": "error", "error": { "type": "api_error", "message": "iç ayrıntı" } }"""));

        var hata = await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => provider.CompleteAsync("talimat", "veri"));

        Assert.Equal(AnthropicAiInsightProvider.UnreachableMessage, hata.Message);
        Assert.DoesNotContain("iç ayrıntı", hata.Message);
    }

    [Fact]
    public async Task Ag_hatasi_503_verir()
    {
        var (provider, _) = Kur(() => throw new HttpRequestException("bağlantı yok"));

        var hata = await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => provider.CompleteAsync("talimat", "veri"));

        Assert.Equal(AnthropicAiInsightProvider.UnreachableMessage, hata.Message);
    }

    [Fact]
    public async Task Kapali_saglayici_503_verir()
    {
        var hata = await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => new NullAiInsightProvider().CompleteAsync("talimat", "veri"));

        Assert.Equal("AI yorumlama şu an kapalı.", hata.Message);
    }
}
```

- [ ] **Step 5: Testlerin derlenmediğini doğrula**

Run: `dotnet build tests/Grind.Tests`
Expected: FAIL — `Grind.Api.Services.Ai` tipleri bulunamıyor.

- [ ] **Step 6: Ayarları, soyutlamayı ve Null sağlayıcıyı yaz**

`src/Grind.Api/Services/Ai/AiProviderKind.cs`:

```csharp
namespace Grind.Api.Services.Ai;

/// <summary>
/// Kullanılacak LLM sağlayıcısı. Varsayılan <see cref="None"/> (KAPALI). Enum olması bilinçli:
/// yapılandırma bağlayıcısı tanınmayan bir adı ("Antropic") açılışta reddeder (Faz 12 spec Karar 9).
/// </summary>
public enum AiProviderKind
{
    None,
    Anthropic
}
```

`src/Grind.Api/Services/Ai/AiSettings.cs`:

```csharp
namespace Grind.Api.Services.Ai;

/// <summary>
/// "Ai" yapılandırma bölümü (Faz 12 spec Karar 9). <see cref="ApiKey"/> user-secrets / ortam
/// değişkeninde tutulur, appsettings.json'a YAZILMAZ. Fiyatlar varsayılan modelinkidir; model
/// değiştirilirse fiyatlar da değiştirilmeli. Fiyat verilmezse maliyet null kalır.
/// </summary>
public class AiSettings
{
    public AiProviderKind Provider { get; set; } = AiProviderKind.None;

    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = "claude-opus-5";

    /// <summary>Akışsız istek için güvenli çıktı tavanı.</summary>
    public int MaxTokens { get; set; } = 16000;

    public int TimeoutSeconds { get; set; } = 180;

    public decimal? InputUsdPerMillionTokens { get; set; }

    public decimal? OutputUsdPerMillionTokens { get; set; }
}
```

`src/Grind.Api/Services/Ai/IAiInsightProvider.cs`:

```csharp
namespace Grind.Api.Services.Ai;

/// <summary>
/// Bir LLM'e NASIL sorulacağı (Faz 12 spec Karar 5). NE sorulacağı (talimat) servis katmanındadır.
/// Uygulamalar başarısızlıkta YALNIZCA <c>ServiceUnavailableException</c> fırlatır; sağlayıcının
/// kendi hata metni çağırana taşınmaz.
/// </summary>
public interface IAiInsightProvider
{
    Task<AiCompletion> CompleteAsync(
        string instructions, string trainingData, CancellationToken cancellationToken = default);
}

/// <summary>
/// Entity'nin AI alanlarının birebir karşılığı. Maliyeti sağlayıcı hesaplar: fiyat modele özgü bir
/// bilgidir, servis bilmez. <see cref="Model"/> fiilen yanıtlayan modeldir (fallback olabilir).
/// </summary>
public sealed record AiCompletion(string Content, string Model, int? TokensUsed, decimal? EstimatedCostUsd);
```

`src/Grind.Api/Services/Ai/NullAiInsightProvider.cs`:

```csharp
using Grind.Api.Common.Exceptions;

namespace Grind.Api.Services.Ai;

/// <summary>
/// Varsayılan sağlayıcı: AI KAPALI (Faz 12 spec Karar 5). "Açıkça kullanılamıyor" der, sahte başarı
/// ÜRETMEZ — sahte bir içerik kullanıcının ödemediği satırlar yazar ve geçmişi kirletirdi.
/// </summary>
public sealed class NullAiInsightProvider : IAiInsightProvider
{
    public const string DisabledMessage = "AI yorumlama şu an kapalı.";

    public Task<AiCompletion> CompleteAsync(
        string instructions, string trainingData, CancellationToken cancellationToken = default)
        => Task.FromException<AiCompletion>(new ServiceUnavailableException(DisabledMessage));
}
```

- [ ] **Step 7: Maliyet hesabını ve talimatı yaz**

`src/Grind.Api/Services/Ai/AiCostCalculator.cs`:

```csharp
namespace Grind.Api.Services.Ai;

/// <summary>
/// LLM çağrısının tahmini maliyeti (Faz 12 spec Karar 10). Saf fonksiyon; fiyatlar yapılandırmadan
/// gelir, burada sabit fiyat YOK — model değişince kod değişmesin.
/// </summary>
public static class AiCostCalculator
{
    private const decimal TokensPerMillion = 1_000_000m;

    /// <summary>
    /// Fiyatlardan biri bilinmiyorsa null (bilinmeyen maliyet, yanlış bir sayıdan iyidir). Sonuç sütunun
    /// ölçeğine (<c>numeric(10,6)</c>) <see cref="MidpointRounding.AwayFromZero"/> ile yuvarlanır.
    /// </summary>
    public static decimal? Estimate(
        long inputTokens, long outputTokens, decimal? inputUsdPerMillion, decimal? outputUsdPerMillion)
    {
        if (inputUsdPerMillion is not { } inputPrice || outputUsdPerMillion is not { } outputPrice)
        {
            return null;
        }

        var cost = inputTokens * inputPrice / TokensPerMillion + outputTokens * outputPrice / TokensPerMillion;

        return Math.Round(cost, 6, MidpointRounding.AwayFromZero);
    }
}
```

`src/Grind.Api/Services/Ai/AiInsightPrompt.cs`:

```csharp
namespace Grind.Api.Services.Ai;

/// <summary>
/// LLM'e NE sorulacağı (Faz 12 spec Karar 11). Sağlayıcıdan bağımsızdır. İçinde zaman damgası ya da
/// istek başına değişen bir şey YOKTUR. Bilerek kısa: güncel modeller aşırı ayrıntılı talimatla daha
/// kötü yazar.
/// </summary>
public static class AiInsightPrompt
{
    public const string Instructions =
        """
        Sen deneyimli bir kuvvet antrenmanı koçusun. Kullanıcının mesajı, GRIND antrenman takip
        uygulamasından dışa aktarılmış verisidir; belgenin başındaki açıklamalar birimleri ve
        işaretleri tanımlar.

        Bu veriyi Türkçe yorumla. Şu başlıkları, veri elverdiği ölçüde ele al:
        - Genel gidişat ve düzenlilik (antrenman günleri, seri).
        - İlerleme: rekorlar ve aynı egzersizde zaman içindeki değişim.
        - Hacmin egzersizlere ve kategorilere dağılımı, belirgin dengesizlikler.
        - Vücut ağırlığı kaydı varsa performansla ilişkisi.
        - 2-4 somut, uygulanabilir öneri.

        Yalnızca verideki bilgilere dayan; sayı uydurma. Veri bir sonuç çıkarmaya yetmiyorsa bunu açıkça
        söyle. Tıbbi teşhis koyma; ağrı veya sakatlık notlarında bir uzmana danışmayı öner. Kısa
        başlıklar ve maddeler kullan.
        """;
}
```

- [ ] **Step 8: Anthropic sağlayıcısını yaz**

`src/Grind.Api/Services/Ai/AnthropicAiInsightProvider.cs`:

```csharp
using Anthropic;
using Anthropic.Exceptions;
using Anthropic.Models.Beta.Messages;
using Grind.Api.Common.Exceptions;

namespace Grind.Api.Services.Ai;

/// <summary>
/// Gerçek sağlayıcı: resmi Anthropic C# SDK'sı (Faz 12 spec Karar 8). Yalnızca
/// <c>Ai:Provider = Anthropic</c> iken kayıtlıdır; varsayılan KAPALIDIR. Singleton: <see cref="AnthropicClient"/>
/// iş parçacığı güvenlidir ve kendi HttpClient'ını yeniden kullanır. SDK 408/409/429/5xx'te kendisi
/// yeniden dener.
///
/// Sağlayıcının hata metni istemciye ASLA ulaşmaz: loglanır, istemci sabit bir 503 mesajı alır.
/// </summary>
public sealed class AnthropicAiInsightProvider(
    AnthropicClient client,
    AiSettings settings,
    ILogger<AnthropicAiInsightProvider> logger) : IAiInsightProvider
{
    /// <summary>
    /// Model isteği politika gerekçesiyle reddederse API aynı çağrı içinde Anthropic'in önerdiği fallback
    /// modeliyle yanıtlar (<c>fallbacks: "default"</c>).
    /// </summary>
    public const string FallbackBeta = "server-side-fallback-2026-07-01";

    public const string UnreachableMessage =
        "AI sağlayıcısına şu an ulaşılamıyor. Lütfen daha sonra tekrar deneyin.";

    public const string NoAnswerMessage = "Model bu isteğe yanıt vermedi.";

    public async Task<AiCompletion> CompleteAsync(
        string instructions, string trainingData, CancellationToken cancellationToken = default)
    {
        BetaMessage response;

        try
        {
            // Thinking ve Effort bilerek verilmez: Opus 5 varsayılan olarak uyarlanabilir düşünmeyle,
            // high effort'la çalışır.
            response = await client.Beta.Messages.Create(new MessageCreateParams
            {
                Model = settings.Model,
                MaxTokens = settings.MaxTokens,
                System = instructions,
                Betas = [FallbackBeta],
                Fallbacks = new Default(),
                Messages = [new() { Role = Role.User, Content = trainingData }],
            }, cancellationToken);
        }
        catch (Exception e) when (e is AnthropicApiException or AnthropicIOException or HttpRequestException
                                  || (e is OperationCanceledException && !cancellationToken.IsCancellationRequested))
        {
            // Çağıran iptal etmediyse OperationCanceledException'ın tek kaynağı zaman aşımıdır.
            logger.LogError(e, "AI sağlayıcısına yapılan çağrı başarısız oldu.");
            throw new ServiceUnavailableException(UnreachableMessage);
        }

        if (response.StopReason == "refusal")
        {
            // Fallback zinciri de reddetti.
            logger.LogWarning("AI sağlayıcısı isteği reddetti.");
            throw new ServiceUnavailableException(NoAnswerMessage);
        }

        var content = string.Concat(
            response.Content.Select(b => b.Value).OfType<BetaTextBlock>().Select(t => t.Text)).Trim();

        if (content.Length == 0)
        {
            logger.LogWarning("AI sağlayıcısı boş yanıt döndü. Durma sebebi: {StopReason}", response.StopReason);
            throw new ServiceUnavailableException(NoAnswerMessage);
        }

        // max_tokens ile kesilen yanıt da buraya düşer ve SAKLANIR: ücreti ödenmiştir (spec Karar 8).
        var inputTokens = response.Usage.InputTokens;
        var outputTokens = response.Usage.OutputTokens;
        string servedBy = response.Model;

        return new AiCompletion(
            content,
            servedBy,
            checked((int)(inputTokens + outputTokens)),
            AiCostCalculator.Estimate(
                inputTokens, outputTokens, settings.InputUsdPerMillionTokens, settings.OutputUsdPerMillionTokens));
    }
}
```

- [ ] **Step 9: DI kaydını yaz**

`src/Grind.Api/Services/Ai/DependencyInjection.cs`:

```csharp
using Anthropic;

namespace Grind.Api.Services.Ai;

public static class DependencyInjection
{
    /// <summary>
    /// Yapılandırılan AI sağlayıcısını singleton olarak kaydeder (Faz 12 spec Karar 9). Varsayılan
    /// <see cref="AiProviderKind.None"/> → <see cref="NullAiInsightProvider"/>. Anthropic seçiliyse eksik
    /// ya da geçersiz ayar açılışta <see cref="InvalidOperationException"/> verir — Jwt:Key kontrolüyle
    /// aynı desen: yanlış yapılandırma ilk isteği değil BOOT'u durdurur.
    /// </summary>
    public static IServiceCollection AddAiInsightProvider(this IServiceCollection services, AiSettings settings)
    {
        switch (settings.Provider)
        {
            case AiProviderKind.None:
                services.AddSingleton<IAiInsightProvider, NullAiInsightProvider>();
                break;

            case AiProviderKind.Anthropic:
                EnsureValid(settings);
                services.AddSingleton(settings);
                services.AddSingleton(new AnthropicClient
                {
                    ApiKey = settings.ApiKey,
                    Timeout = TimeSpan.FromSeconds(settings.TimeoutSeconds)
                });
                services.AddSingleton<IAiInsightProvider, AnthropicAiInsightProvider>();
                break;

            default:
                throw new InvalidOperationException($"Ai:Provider desteklenmiyor: {settings.Provider}.");
        }

        return services;
    }

    private static void EnsureValid(AiSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.ApiKey))
        {
            throw new InvalidOperationException(
                "Ai:ApiKey tanımlı değil. Değeri user-secrets veya ortam değişkeninden verin.");
        }

        if (string.IsNullOrWhiteSpace(settings.Model))
        {
            throw new InvalidOperationException("Ai:Model boş olamaz.");
        }

        if (settings.MaxTokens <= 0)
        {
            throw new InvalidOperationException("Ai:MaxTokens pozitif olmalı.");
        }

        if (settings.TimeoutSeconds <= 0)
        {
            throw new InvalidOperationException("Ai:TimeoutSeconds pozitif olmalı.");
        }
    }
}
```

- [ ] **Step 10: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~Grind.Tests.Services.Ai"`
Expected: PASS.

Yanıt JSON'ları SDK'nın deserileştiricisi için eksik alan yüzünden patlarsa, yanıtı değil TEST JSON'unu
gerçek API şekline tamamla (ör. eksik zorunlu bir alan). Sağlayıcı kodundaki mantığı testi geçirmek için
değiştirme. `fallback` içerik bloğu SDK tarafından okunamıyorsa (bilinmeyen varyant hatası) bunu raporla:
gerçek bir fallback yanıtında da aynı hata olurdu.

- [ ] **Step 11: Tüm test paketini çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add src/Grind.Api/Grind.Api.csproj src/Grind.Api/Services/Ai tests/Grind.Tests/Services/Ai
git commit -m "feat(ai): varsayilan kapali saglayici soyutlamasi ve Anthropic saglayicisi" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: `AiInsightService` + DTO'lar + uygulamaya bağlama

**Files:**
- Create: `src/Grind.Api/Models/Dtos/Insight/GenerateInsightRequest.cs`
- Create: `src/Grind.Api/Models/Dtos/Insight/AiInsightQuery.cs`
- Create: `src/Grind.Api/Models/Dtos/Insight/AiInsightResponse.cs`
- Create: `src/Grind.Api/Services/IAiInsightService.cs`
- Create: `src/Grind.Api/Services/AiInsightService.cs`
- Modify: `src/Grind.Api/Services/DependencyInjection.cs`
- Modify: `src/Grind.Api/Program.cs`
- Modify: `src/Grind.Api/appsettings.json`
- Test: `tests/Grind.Tests/Services/AiInsightServiceTests.cs`

**Interfaces:**
- Consumes:
  - `AiInsightRange.Resolve`, `PagedQuery`, `ServiceUnavailableException` (Task 1)
  - `IAiInsightRepository`, `AiInsight.RangeFrom`/`RangeTo` (Task 2)
  - `IAiInsightProvider`, `AiCompletion`, `AiInsightPrompt.Instructions`, `AiSettings`, `AddAiInsightProvider` (Task 3)
  - Faz 11: `IExportService.GetAsync(StatsRangeQuery, CancellationToken)` → `ExportResponse` (`Sessions`,
    `BodyWeights` listeleri) ve `ExportTextFormatter.Format(ExportResponse)` → `string`.
- Produces:
  - `GenerateInsightRequest { DateOnly? From; DateOnly? To; }`
  - `AiInsightQuery : PagedQuery { AiInsightKind? Kind; long? WorkoutSessionId; long? SetEntryId; }`
  - `record AiInsightResponse(long Id, AiInsightKind Kind, long? WorkoutSessionId, long? SetEntryId, DateOnly? RangeFrom, DateOnly? RangeTo, string Content, string Model, int? TokensUsed, decimal? EstimatedCostUsd, DateTime CreatedAt)`
  - `IAiInsightService`:
    - `GenerateAsync(GenerateInsightRequest, CancellationToken = default)` → `Task<AiInsightResponse>`
    - `GetPageAsync(AiInsightQuery, CancellationToken = default)` → `Task<PagedResponse<AiInsightResponse>>`
    - `GetByIdAsync(long, CancellationToken = default)` → `Task<AiInsightResponse>`
    - `DeleteAsync(long, CancellationToken = default)` → `Task`
  - DI: `IAiInsightService` scoped. `Program.cs` sağlayıcıyı `Ai` bölümünden kaydeder. Bu ADIM ZORUNLU:
    Development ortamında host kayıtları açılışta doğrular ve sağlayıcısız bir `AiInsightService` kaydı
    tüm uçtan uca testleri düşürür.

- [ ] **Step 1: Servis için başarısız testleri yaz**

`tests/Grind.Tests/Services/AiInsightServiceTests.cs` oluştur:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Insight;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Grind.Api.Services.Ai;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class AiInsightServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    private sealed class SahteSaat(DateTime utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(utcNow, TimeSpan.Zero);
    }

    /// <summary>
    /// Çağrıları kaydeden sahte sağlayıcı. Çağrı anında bekleyen izlenmiş değişiklik olup olmadığını da
    /// kaydeder: LLM beklenirken yazma bekliyorsa transaction/kilit sınırı yanlış yerdedir (spec Karar 6).
    /// </summary>
    private sealed class SahteSaglayici(AppDbContext context, Exception? hata = null) : IAiInsightProvider
    {
        public int CagriSayisi { get; private set; }
        public string? Talimat { get; private set; }
        public string? Veri { get; private set; }
        public bool CagriAnindaBekleyenDegisiklikVardi { get; private set; }

        public Task<AiCompletion> CompleteAsync(
            string instructions, string trainingData, CancellationToken cancellationToken = default)
        {
            CagriSayisi++;
            Talimat = instructions;
            Veri = trainingData;
            CagriAnindaBekleyenDegisiklikVardi = context.ChangeTracker.HasChanges();

            return hata is null
                ? Task.FromResult(new AiCompletion("Güzel gidiyorsun.", "claude-opus-5", 1500, 0.0123m))
                : Task.FromException<AiCompletion>(hata);
        }
    }

    /// <summary>TR 12 Mart 20:00 (UTC 17:00): "bugün" 12 Mart, varsayılan aralık 11 Şubat – 12 Mart.</summary>
    private static readonly DateTime Simdi = new(2026, 3, 12, 17, 0, 0, DateTimeKind.Utc);

    private static async Task<(AppDbContext Context, User User, Exercise Exercise,
        IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        return (context, user, exercise, transaction);
    }

    /// <summary>
    /// GERÇEK export yolu: sağlayıcıya giden metnin Faz 11'in metni olduğu ancak böyle sınanır.
    /// </summary>
    private static AiInsightService CreateService(AppDbContext context, long userId, IAiInsightProvider provider)
    {
        var currentUser = new StubCurrentUser(userId);
        var saat = new SahteSaat(Simdi);
        var sessions = new WorkoutSessionRepository(context);
        var sets = new SetEntryRepository(context);
        var bodyWeights = new BodyWeightLogRepository(context);
        var export = new ExportService(
            sessions,
            sets,
            bodyWeights,
            new StatsService(sessions, sets, bodyWeights, currentUser, saat),
            new PersonalRecordService(sets, currentUser),
            currentUser,
            saat);

        return new AiInsightService(
            new AiInsightRepository(context), export, provider, new UnitOfWork(context), currentUser, saat);
    }

    private static void SeedSession(AppDbContext context, User user, Exercise exercise, DateTime startedAtUtc)
    {
        var session = TestDatabase.NewSession(user);
        session.StartedAt = startedAtUtc;
        context.Add(session);
        context.Add(new SetEntry
        {
            WorkoutSession = session, Exercise = exercise, Weight = 100m, Reps = 8,
            RecordType = RecordType.None, CreatedAt = startedAtUtc
        });
    }

    private static AiInsight NewInsight(User user, DateTime createdAt, AiInsightKind kind = AiInsightKind.Insight)
        => new() { User = user, Kind = kind, Content = "yorum", Model = "test-model", CreatedAt = createdAt };

    private static Task<int> SatirSayisiAsync(AppDbContext context, long userId)
        => context.Set<AiInsight>().CountAsync(a => a.UserId == userId);

    // ---- Üretim ----

    [Fact]
    public async Task Uretilen_yorum_saglayici_alanlari_ve_varsayilan_araligiyla_kaydedilir()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedSession(context, user, exercise, Simdi.AddDays(-1));
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            var yanit = await CreateService(context, user.Id, new SahteSaglayici(context))
                .GenerateAsync(new GenerateInsightRequest());

            // Veritabanından okunur: izleyicideki nesneye bakmak yanlış bir yazımı gizlerdi.
            context.ChangeTracker.Clear();
            var satir = await context.Set<AiInsight>().SingleAsync(a => a.Id == yanit.Id);

            Assert.Equal(user.Id, satir.UserId);
            Assert.Equal(AiInsightKind.Insight, satir.Kind);
            Assert.Null(satir.WorkoutSessionId);
            Assert.Null(satir.SetEntryId);
            Assert.Equal(new DateOnly(2026, 2, 11), satir.RangeFrom);
            Assert.Equal(new DateOnly(2026, 3, 12), satir.RangeTo);
            Assert.Equal("Güzel gidiyorsun.", satir.Content);
            Assert.Equal("claude-opus-5", satir.Model);
            Assert.Equal(1500, satir.TokensUsed);
            Assert.Equal(0.0123m, satir.EstimatedCostUsd);
            Assert.Equal(Simdi, satir.CreatedAt);
            Assert.Equal(new DateOnly(2026, 2, 11), yanit.RangeFrom);
        }
    }

    /// <summary>Bağlam Faz 11'in export metnidir (devreden not 3); talimat servis katmanından gelir.</summary>
    [Fact]
    public async Task Saglayiciya_talimat_ve_araligin_export_metni_gider()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedSession(context, user, exercise, Simdi.AddDays(-1));
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
            var saglayici = new SahteSaglayici(context);

            await CreateService(context, user.Id, saglayici).GenerateAsync(new GenerateInsightRequest());

            Assert.Equal(AiInsightPrompt.Instructions, saglayici.Talimat);
            Assert.Contains("Aralık: 2026-02-11 – 2026-03-12", saglayici.Veri);
            Assert.Contains(exercise.Name, saglayici.Veri);
        }
    }

    /// <summary>Bir LLM'e "veri yok" dedirtmek için para ödenmez (spec Karar 4).</summary>
    [Fact]
    public async Task Verisiz_aralik_400_verir_saglayici_cagrilmaz_satir_yazilmaz()
    {
        var (context, user, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var saglayici = new SahteSaglayici(context);

            var hata = await Assert.ThrowsAsync<ValidationException>(
                () => CreateService(context, user.Id, saglayici).GenerateAsync(new GenerateInsightRequest()));

            Assert.Equal("Bu aralıkta yorumlanacak kayıt yok.", hata.Message);
            Assert.Equal(0, saglayici.CagriSayisi);
            Assert.Equal(0, await SatirSayisiAsync(context, user.Id));
        }
    }

    /// <summary>AYIRT EDİCİ: varsayılan aralık tüm geçmiş değil son 30 gün — 40 gün önceki oturum sayılmaz.</summary>
    [Fact]
    public async Task Otuz_gunden_eski_veri_varsayilan_araliga_girmez()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedSession(context, user, exercise, Simdi.AddDays(-40));
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
            var saglayici = new SahteSaglayici(context);

            await Assert.ThrowsAsync<ValidationException>(
                () => CreateService(context, user.Id, saglayici).GenerateAsync(new GenerateInsightRequest()));

            Assert.Equal(0, saglayici.CagriSayisi);
        }
    }

    [Fact]
    public async Task Yalnizca_tarti_olan_aralik_da_yorumlanir()
    {
        var (context, user, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            context.Add(new BodyWeightLog { User = user, Weight = 82.4m, RecordedAt = Simdi.AddDays(-2) });
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
            var saglayici = new SahteSaglayici(context);

            await CreateService(context, user.Id, saglayici).GenerateAsync(new GenerateInsightRequest());

            Assert.Equal(1, saglayici.CagriSayisi);
        }
    }

    [Fact]
    public async Task Saglayici_hatasinda_satir_yazilmaz()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedSession(context, user, exercise, Simdi.AddDays(-1));
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
            var saglayici = new SahteSaglayici(
                context, new ServiceUnavailableException("AI yorumlama şu an kapalı."));

            await Assert.ThrowsAsync<ServiceUnavailableException>(
                () => CreateService(context, user.Id, saglayici).GenerateAsync(new GenerateInsightRequest()));

            Assert.Equal(0, await SatirSayisiAsync(context, user.Id));
        }
    }

    /// <summary>
    /// Spec Karar 6: yorum satırı sağlayıcı DÖNDÜKTEN sonra eklenir. Önce eklenseydi LLM beklenirken
    /// bekleyen bir yazma olurdu — sıralama değişirse bu test düşer.
    /// </summary>
    [Fact]
    public async Task Saglayici_cagrildiginda_bekleyen_degisiklik_yoktur()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            SeedSession(context, user, exercise, Simdi.AddDays(-1));
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
            var saglayici = new SahteSaglayici(context);

            await CreateService(context, user.Id, saglayici).GenerateAsync(new GenerateInsightRequest());

            Assert.Equal(1, saglayici.CagriSayisi);
            Assert.False(saglayici.CagriAnindaBekleyenDegisiklikVardi);
        }
    }

    [Fact]
    public async Task Cok_uzun_aralik_400_verir_saglayici_cagrilmaz()
    {
        var (context, user, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var saglayici = new SahteSaglayici(context);

            await Assert.ThrowsAsync<ValidationException>(() => CreateService(context, user.Id, saglayici)
                .GenerateAsync(new GenerateInsightRequest
                {
                    From = new DateOnly(2024, 1, 1), To = new DateOnly(2025, 1, 1)
                }));

            Assert.Equal(0, saglayici.CagriSayisi);
        }
    }

    // ---- Okuma ve silme ----

    [Fact]
    public async Task Liste_yeniden_eskiye_doner_ve_ture_gore_suzulur()
    {
        var (context, user, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eski = NewInsight(user, Simdi.AddDays(-2));
            var yeni = NewInsight(user, Simdi.AddDays(-1), AiInsightKind.Suggestion);
            context.AddRange(eski, yeni);
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
            var service = CreateService(context, user.Id, new SahteSaglayici(context));

            var hepsi = await service.GetPageAsync(new AiInsightQuery());
            var yorumlar = await service.GetPageAsync(new AiInsightQuery { Kind = AiInsightKind.Insight });

            Assert.Equal(new[] { yeni.Id, eski.Id }, hepsi.Items.Select(i => i.Id));
            Assert.Equal(2, hepsi.TotalCount);
            Assert.Equal(eski.Id, Assert.Single(yorumlar.Items).Id);
        }
    }

    [Fact]
    public async Task Silinen_yorum_artik_bulunamaz()
    {
        var (context, user, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var insight = NewInsight(user, Simdi);
            context.Add(insight);
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
            var service = CreateService(context, user.Id, new SahteSaglayici(context));

            Assert.Equal("yorum", (await service.GetByIdAsync(insight.Id)).Content);

            await service.DeleteAsync(insight.Id);

            var hata = await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(insight.Id));
            Assert.Equal("Yorum bulunamadı.", hata.Message);
        }
    }

    /// <summary>IDOR: başkasının yorumu HER FİİLDE 404, listede de yok.</summary>
    [Fact]
    public async Task Baskasinin_yorumu_okunamaz_silinemez_listede_gorunmez()
    {
        var (context, user, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerYorum = NewInsight(digerKullanici, Simdi);
            context.AddRange(digerKullanici, digerYorum);
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();
            var service = CreateService(context, user.Id, new SahteSaglayici(context));

            await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(digerYorum.Id));
            await Assert.ThrowsAsync<NotFoundException>(() => service.DeleteAsync(digerYorum.Id));
            Assert.Equal(0, (await service.GetPageAsync(new AiInsightQuery())).TotalCount);
        }
    }
}
```

- [ ] **Step 2: Testlerin derlenmediğini doğrula**

Run: `dotnet build tests/Grind.Tests`
Expected: FAIL — `AiInsightService`, `GenerateInsightRequest`, `AiInsightQuery` bulunamıyor.

- [ ] **Step 3: DTO'ları yaz**

`src/Grind.Api/Models/Dtos/Insight/GenerateInsightRequest.cs`:

```csharp
namespace Grind.Api.Models.Dtos.Insight;

/// <summary>
/// Yorum üretme isteği (Faz 12 spec Karar 14). <c>From</c>/<c>To</c> TR yerel günüdür, iki ucu dahil.
/// Verilmezse son 30 gün: <c>To</c> = bugün, <c>From</c> = <c>To</c> − 29. En fazla 366 gün.
/// <c>StatsRangeQuery</c>'den bilerek ayrı: şekil aynı, anlam farklı — orada null "sınır yok", burada
/// "son 30 gün" demek.
/// </summary>
public class GenerateInsightRequest
{
    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }
}
```

`src/Grind.Api/Models/Dtos/Insight/AiInsightQuery.cs`:

```csharp
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Insight;

/// <summary>
/// Yorum listesinin süzgeçleri + sayfalama (Faz 12 spec Karar 13). Hepsi opsiyonel, verilenler VE'lenir,
/// sonuç her zaman kullanıcının kendi yorumlarıyla sınırlıdır. Tanımsız bir <c>kind</c> model bağlamada
/// 400 alır.
/// </summary>
public class AiInsightQuery : PagedQuery
{
    public AiInsightKind? Kind { get; set; }

    public long? WorkoutSessionId { get; set; }

    public long? SetEntryId { get; set; }
}
```

`src/Grind.Api/Models/Dtos/Insight/AiInsightResponse.cs`:

```csharp
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Insight;

/// <summary>
/// Saklanan bir AI yorumu. <c>RangeFrom</c>/<c>RangeTo</c> yorumun kapsadığı TR günleridir (Suggestion'da
/// null). <c>Model</c> fiilen yanıtlayan modeldir. <c>EstimatedCostUsd</c> fiyat yapılandırılmamışsa null.
/// </summary>
public record AiInsightResponse(
    long Id,
    AiInsightKind Kind,
    long? WorkoutSessionId,
    long? SetEntryId,
    DateOnly? RangeFrom,
    DateOnly? RangeTo,
    string Content,
    string Model,
    int? TokensUsed,
    decimal? EstimatedCostUsd,
    DateTime CreatedAt);
```

- [ ] **Step 4: Servisi yaz**

`src/Grind.Api/Services/IAiInsightService.cs`:

```csharp
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Insight;

namespace Grind.Api.Services;

/// <summary>AI yorumları (Faz 12). Üretim yalnızca <c>Kind = Insight</c>; okuma ve silme her tür için.</summary>
public interface IAiInsightService
{
    /// <summary>
    /// Aralığın export metnini sağlayıcıya yorumlatır ve saklar. Ters/çok uzun/verisiz aralık
    /// ValidationException (400); sağlayıcı kapalı ya da başarısızsa ServiceUnavailableException (503) ve
    /// hiçbir satır yazılmaz.
    /// </summary>
    Task<AiInsightResponse> GenerateAsync(
        GenerateInsightRequest request, CancellationToken cancellationToken = default);

    /// <summary>Kendi yorumların, yeniden eskiye, sayfalı. Sonuç yoksa BOŞ sayfa (404 değil).</summary>
    Task<PagedResponse<AiInsightResponse>> GetPageAsync(
        AiInsightQuery query, CancellationToken cancellationToken = default);

    /// <summary>Başkasının ya da olmayan kayıtta NotFoundException (404).</summary>
    Task<AiInsightResponse> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    /// <summary>Başkasının ya da olmayan kayıtta NotFoundException (404).</summary>
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
```

`src/Grind.Api/Services/AiInsightService.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Insight;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services.Ai;

namespace Grind.Api.Services;

/// <summary>
/// Oku → sor → tek SaveChangesAsync (Faz 12 spec Karar 6). Bağlam Faz 11'in export metnidir; ikinci bir
/// "LLM'e özet" biçimi yazılmaz. <c>BeginTransaction</c> YOK: LLM beklenirken hiçbir transaction açık ve
/// hiçbir yazma bekliyor değildir — satır sağlayıcı döndükten SONRA eklenir.
/// </summary>
public class AiInsightService(
    IAiInsightRepository repository,
    IExportService exportService,
    IAiInsightProvider provider,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IAiInsightService
{
    /// <summary>Id İÇERMEZ — hangi id'nin var olduğunu söylemek tarama imkânı verirdi.</summary>
    private const string InsightNotFound = "Yorum bulunamadı.";

    private const string NothingToInterpret = "Bu aralıkta yorumlanacak kayıt yok.";

    public async Task<AiInsightResponse> GenerateAsync(
        GenerateInsightRequest request, CancellationToken cancellationToken = default)
    {
        // Aralık hataları HİÇBİR IO'dan önce 400 verir.
        var (from, to) = AiInsightRange.Resolve(request.From, request.To, TurkeyDay.LocalDateOf(Now()));

        var export = await exportService.GetAsync(new StatsRangeQuery { From = from, To = to }, cancellationToken);

        // Rekorlar ve seriler aralıktan bağımsızdır (Faz 11 Karar 2) ve burada sayılmaz. Setsiz ama notlu bir
        // oturum veridir (Faz 11 Karar 8).
        if (export.Sessions.Count == 0 && export.BodyWeights.Count == 0)
        {
            throw new ValidationException(NothingToInterpret);
        }

        // Buradan sonrası ÜCRETLİ: isteğin belirteci değil None (spec Karar 7). İstemci koparsa parası
        // ödenmiş yanıt yine saklanır; iş sağlayıcının zaman aşımıyla sınırlıdır.
        var completion = await provider.CompleteAsync(
            AiInsightPrompt.Instructions, ExportTextFormatter.Format(export), CancellationToken.None);

        var insight = new AiInsight
        {
            UserId = currentUser.UserId,
            Kind = AiInsightKind.Insight,
            RangeFrom = from,
            RangeTo = to,
            Content = completion.Content,
            Model = completion.Model,
            TokensUsed = completion.TokensUsed,
            EstimatedCostUsd = completion.EstimatedCostUsd,
            CreatedAt = Now()
        };

        repository.Add(insight);
        await unitOfWork.SaveChangesAsync(CancellationToken.None);

        return ToResponse(insight);
    }

    public async Task<PagedResponse<AiInsightResponse>> GetPageAsync(
        AiInsightQuery query, CancellationToken cancellationToken = default)
    {
        var (items, totalCount) = await repository.GetPageAsync(
            currentUser.UserId, query.Kind, query.WorkoutSessionId, query.SetEntryId,
            query.Skip(), query.PageSize, cancellationToken);

        return new PagedResponse<AiInsightResponse>(
            items.Select(ToResponse).ToList(), query.Page, query.PageSize, totalCount);
    }

    public async Task<AiInsightResponse> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        => ToResponse(await OwnedOrThrowAsync(id, cancellationToken));

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var insight = await OwnedOrThrowAsync(id, cancellationToken);

        repository.Remove(insight);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private DateTime Now() => timeProvider.GetUtcNow().UtcDateTime;

    private async Task<AiInsight> OwnedOrThrowAsync(long id, CancellationToken cancellationToken)
        => await repository.GetOwnedByIdAsync(id, currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException(InsightNotFound);

    private static AiInsightResponse ToResponse(AiInsight insight) => new(
        insight.Id,
        insight.Kind,
        insight.WorkoutSessionId,
        insight.SetEntryId,
        insight.RangeFrom,
        insight.RangeTo,
        insight.Content,
        insight.Model,
        insight.TokensUsed,
        insight.EstimatedCostUsd,
        insight.CreatedAt);
}
```

- [ ] **Step 5: Servis testlerini çalıştır**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~AiInsightServiceTests"`
Expected: PASS.

- [ ] **Step 6: Servisi ve sağlayıcıyı uygulamaya bağla**

`src/Grind.Api/Services/DependencyInjection.cs` içinde
`services.AddScoped<IExportService, ExportService>();` satırının ALTINA ekle:

```csharp
        services.AddScoped<IAiInsightService, AiInsightService>();
```

`src/Grind.Api/Program.cs`:

1. `using Grind.Api.Services;` satırının ALTINA ekle:

```csharp
using Grind.Api.Services.Ai;
```

2. `TimeProvider` yorumundaki şu iki satırı:

```csharp
// BodyWeightLogService (Faz 10, gelecek zaman reddi için) ve ExportService (Faz 11, export'un
// oluşturulma anı için) — AuthService, ExerciseService ve
```

şununla değiştir:

```csharp
// BodyWeightLogService (Faz 10, gelecek zaman reddi için), ExportService (Faz 11, export'un
// oluşturulma anı için) ve AiInsightService (Faz 12, varsayılan aralığın "bugün"ü ve yorumun
// oluşturulma anı için) — AuthService, ExerciseService ve
```

3. `builder.Services.AddApplicationServices();` satırının ALTINA ekle:

```csharp

// AI sağlayıcısı (Faz 12): varsayılan KAPALI (None → 503). Aktivasyon yalnızca yapılandırmayla:
// Ai:Provider = Anthropic + Ai:ApiKey (user-secrets). Anthropic seçiliyse eksik ayar BOOT'u durdurur;
// tanınmayan bir sağlayıcı adı zaten Get<AiSettings>() bağlamasında patlar.
builder.Services.AddAiInsightProvider(
    builder.Configuration.GetSection("Ai").Get<AiSettings>() ?? new AiSettings());
```

`src/Grind.Api/appsettings.json` içinde `"Jwt": { ... }` bölümünün kapanan `}`'sinden sonra virgül koyup
şu bölümü ekle (dosyanın son `}`'sinden önce):

```json
  "Ai": {
    "//": "Varsayilan KAPALI. Acmak icin user-secrets: Ai:Provider=Anthropic ve Ai:ApiKey. Fiyatlar (USD / 1M token) Model'in fiyatlaridir; model degisirse fiyatlari da guncelleyin.",
    "Provider": "None",
    "ApiKey": "",
    "Model": "claude-opus-5",
    "MaxTokens": 16000,
    "TimeoutSeconds": 180,
    "InputUsdPerMillionTokens": 5.0,
    "OutputUsdPerMillionTokens": 25.0
  }
```

- [ ] **Step 7: Tüm test paketini çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS. Uçtan uca testler host'u gerçek `Program.cs` ile kurar. `IAiInsightProvider` kaydı
eksik olsaydı Development'taki açılış doğrulaması yüzünden hepsi düşerdi; yeşil olmaları bağlamanın
doğru olduğunu gösterir.

- [ ] **Step 8: Commit**

```bash
git add src/Grind.Api/Models/Dtos/Insight src/Grind.Api/Services/IAiInsightService.cs src/Grind.Api/Services/AiInsightService.cs src/Grind.Api/Services/DependencyInjection.cs src/Grind.Api/Program.cs src/Grind.Api/appsettings.json tests/Grind.Tests/Services/AiInsightServiceTests.cs
git commit -m "feat(ai): yorumu transaction disinda ureten ve saklayan servis" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: `InsightsController` + uçtan uca testler

**Files:**
- Create: `src/Grind.Api/Controllers/InsightsController.cs`
- Create: `tests/Grind.Tests/Integration/SahteAiApiFactory.cs`
- Create: `tests/Grind.Tests/Integration/AiInsightEndpointsTests.cs`

**Interfaces:**
- Consumes:
  - `IAiInsightService`, `GenerateInsightRequest`, `AiInsightQuery`, `AiInsightResponse` (Task 4)
  - `IAiInsightProvider`, `AiCompletion` (Task 3)
  - mevcut `GrindApiFactory`
- Produces: `POST /api/insights` (201/400/503), `GET /api/insights` (200/400),
  `GET /api/insights/{id}` (200/404), `DELETE /api/insights/{id}` (204/404) — hepsi `[Authorize]`.

- [ ] **Step 1: Sahte sağlayıcılı fabrikayı yaz**

`tests/Grind.Tests/Integration/SahteAiApiFactory.cs` oluştur:

```csharp
using Grind.Api.Services.Ai;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace Grind.Tests.Integration;

/// <summary>
/// Varsayılan KAPALI sağlayıcının yerine sabit yanıt veren sahte bir sağlayıcı koyar: başarı yolu ağa ve
/// ücrete çıkmadan uçtan uca sınanır. <c>ConfigureTestServices</c> Program.cs'in kayıtlarından SONRA
/// çalışır ve aynı servis tipinin son kaydı kazanır. Ortam değişkenlerini (Jwt__Key, bağlantı dizesi) taban
/// sınıfın kurucusu ayarlar.
/// </summary>
public class SahteAiApiFactory : GrindApiFactory
{
    public const string SahteModel = "sahte-model";
    public const string SahteIcerik = "Güzel gidiyorsun.";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureTestServices(services =>
            services.AddSingleton<IAiInsightProvider>(new SabitSaglayici()));
    }

    private sealed class SabitSaglayici : IAiInsightProvider
    {
        public Task<AiCompletion> CompleteAsync(
            string instructions, string trainingData, CancellationToken cancellationToken = default)
            => Task.FromResult(new AiCompletion(SahteIcerik, SahteModel, 1500, 0.0123m));
    }
}
```

- [ ] **Step 2: Uçtan uca testleri yaz**

`tests/Grind.Tests/Integration/AiInsightEndpointsTests.cs` oluştur:

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Dtos.Insight;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Enums;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca: gerçek uygulama, gerçek JWT. İki fabrika var:
/// - <see cref="GrindApiFactory"/> gerçek varsayılanı sınar (sağlayıcı KAPALI → 503).
/// - <see cref="SahteAiApiFactory"/> başarı yolunu ağa çıkmadan sınar.
///
/// Veriler POST /api/sets ile BUGÜNE girilir, çünkü API'de geçmişe dönük giriş yok. Varsayılan aralık
/// (son 30 gün) bugünü kapsar. Aralık ve sıralama derinliği servis testlerinde sahte saatle sınanır.
/// </summary>
[Trait("Category", "Database")]
public class AiInsightEndpointsTests(GrindApiFactory kapali, SahteAiApiFactory sahte)
    : IClassFixture<GrindApiFactory>, IClassFixture<SahteAiApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static async Task<HttpClient> AuthenticatedClientAsync(WebApplicationFactory<Program> factory)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = $"ai_{Guid.NewGuid():N}"[..20],
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    /// <summary>Yorumlanacak veri: bugünün açık oturumuna tek bir set.</summary>
    private static async Task PostSetAsync(HttpClient client)
    {
        var exerciseResponse = await client.PostAsJsonAsync("/api/exercises", new CreateExerciseRequest
        {
            Name = $"Göğüs {Guid.NewGuid():N}",
            Category = ExerciseCategory.Push
        }, Json);
        exerciseResponse.EnsureSuccessStatusCode();
        var exercise = (await exerciseResponse.Content.ReadFromJsonAsync<ExerciseResponse>(Json))!;

        var setResponse = await client.PostAsJsonAsync("/api/sets",
            new CreateSetRequest { ExerciseId = exercise.Id, Weight = 100m, Reps = 8 }, Json);
        setResponse.EnsureSuccessStatusCode();
    }

    private static async Task<AiInsightResponse> GenerateAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/insights", new GenerateInsightRequest(), Json);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<AiInsightResponse>(Json))!;
    }

    [Theory]
    [InlineData("POST", "/api/insights")]
    [InlineData("GET", "/api/insights")]
    [InlineData("GET", "/api/insights/1")]
    [InlineData("DELETE", "/api/insights/1")]
    public async Task Tokensiz_istekler_401_verir(string method, string path)
    {
        var response = await kapali.CreateClient()
            .SendAsync(new HttpRequestMessage(new HttpMethod(method), path));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>GERÇEK varsayılan (spec Karar 5): sağlayıcı kapalı → 503, detay korunur, satır yazılmaz.</summary>
    [Fact]
    public async Task Kapali_saglayicida_uretim_503_ve_detay_doner()
    {
        var client = await AuthenticatedClientAsync(kapali);
        await PostSetAsync(client);

        var response = await client.PostAsJsonAsync("/api/insights", new GenerateInsightRequest(), Json);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("AI yorumlama şu an kapalı.", body.GetProperty("detail").GetString());
        var liste = await client.GetFromJsonAsync<PagedResponse<AiInsightResponse>>("/api/insights", Json);
        Assert.Equal(0, liste!.TotalCount);
    }

    [Fact]
    public async Task Uretilen_yorum_201_Location_ve_govdeyle_doner()
    {
        var client = await AuthenticatedClientAsync(sahte);
        await PostSetAsync(client);

        var response = await client.PostAsJsonAsync("/api/insights", new GenerateInsightRequest(), Json);
        var yorum = await response.Content.ReadFromJsonAsync<AiInsightResponse>(Json);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.EndsWith($"/api/insights/{yorum!.Id}", response.Headers.Location!.ToString());
        Assert.Equal(AiInsightKind.Insight, yorum.Kind);
        Assert.Equal(SahteAiApiFactory.SahteIcerik, yorum.Content);
        Assert.Equal(SahteAiApiFactory.SahteModel, yorum.Model);
        Assert.Equal(1500, yorum.TokensUsed);
        Assert.Equal(0.0123m, yorum.EstimatedCostUsd);
        // Varsayılan aralık iki ucu dahil 30 gün. Bugünün tarihine bağlanmaz: gece yarısında kaymasın.
        Assert.Equal(29, yorum.RangeTo!.Value.DayNumber - yorum.RangeFrom!.Value.DayNumber);
    }

    [Fact]
    public async Task Yorum_listelenir_getirilir_ve_silinir()
    {
        var client = await AuthenticatedClientAsync(sahte);
        await PostSetAsync(client);
        var yorum = await GenerateAsync(client);

        var liste = await client.GetFromJsonAsync<PagedResponse<AiInsightResponse>>("/api/insights", Json);
        var getirilen = await client.GetFromJsonAsync<AiInsightResponse>($"/api/insights/{yorum.Id}", Json);
        var silme = await client.DeleteAsync($"/api/insights/{yorum.Id}");
        var sonra = await client.GetAsync($"/api/insights/{yorum.Id}");

        Assert.Equal(yorum.Id, Assert.Single(liste!.Items).Id);
        Assert.Equal(yorum.Content, getirilen!.Content);
        Assert.Equal(HttpStatusCode.NoContent, silme.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, sonra.StatusCode);
    }

    /// <summary>Gövdesiz üretim en sık akış (spec Karar 14): sıfır bayt null'a bağlanır, varsayılana düşer.</summary>
    [Fact]
    public async Task Sifir_baytlik_govdeyle_uretim_201_doner()
    {
        var client = await AuthenticatedClientAsync(sahte);
        await PostSetAsync(client);

        var response = await client.PostAsync("/api/insights",
            new StringContent("", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Verisiz_aralikta_uretim_400_verir()
    {
        var client = await AuthenticatedClientAsync(sahte);

        var response = await client.PostAsJsonAsync("/api/insights", new GenerateInsightRequest(), Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Bu aralıkta yorumlanacak kayıt yok.", body.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Uc_yuz_altmis_yedi_gunluk_aralik_400_verir()
    {
        var client = await AuthenticatedClientAsync(sahte);

        var response = await client.PostAsJsonAsync("/api/insights",
            new GenerateInsightRequest { From = new DateOnly(2024, 1, 1), To = new DateOnly(2025, 1, 1) }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("Foo")]
    [InlineData("7")]
    public async Task Gecersiz_tur_suzgeci_400_verir(string kind)
    {
        var client = await AuthenticatedClientAsync(kapali);

        var response = await client.GetAsync($"/api/insights?kind={kind}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>IDOR: başkasının yorumu okunamaz/silinemez (404), listede yok; sahibininki yerinde kalır.</summary>
    [Fact]
    public async Task Baskasinin_yorumu_okunamaz_silinemez_ve_listede_gorunmez()
    {
        var sahip = await AuthenticatedClientAsync(sahte);
        await PostSetAsync(sahip);
        var yorum = await GenerateAsync(sahip);

        var davetsiz = await AuthenticatedClientAsync(sahte);
        var okuma = await davetsiz.GetAsync($"/api/insights/{yorum.Id}");
        var silme = await davetsiz.DeleteAsync($"/api/insights/{yorum.Id}");
        var liste = await davetsiz.GetFromJsonAsync<PagedResponse<AiInsightResponse>>("/api/insights", Json);

        Assert.Equal(HttpStatusCode.NotFound, okuma.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, silme.StatusCode);
        Assert.Equal(0, liste!.TotalCount);
        Assert.Equal(HttpStatusCode.OK, (await sahip.GetAsync($"/api/insights/{yorum.Id}")).StatusCode);
    }
}
```

- [ ] **Step 3: Testlerin başarısız olduğunu doğrula**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~AiInsightEndpointsTests"`
Expected: FAIL. Kimlikli istekler rota olmadığı için 404 alır (201/503/400 bekleyen testler düşer).
Tokensiz 401 testleri fallback politikası yüzünden şimdiden geçebilir.

- [ ] **Step 4: Controller'ı yaz**

`src/Grind.Api/Controllers/InsightsController.cs` oluştur:

```csharp
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Insight;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// İnce kalır: aralık, sağlayıcı çağrısı ve sahiplik servis katmanında, hata çevirisi
/// GlobalExceptionHandler'da. Burada if/try yoktur.
/// </summary>
[ApiController]
[Authorize]
[Route("api/insights")]
public class InsightsController(IAiInsightService insightService) : ControllerBase
{
    /// <summary>
    /// Aralığın antrenman verisini AI'ya yorumlatır ve saklar. Gövde opsiyoneldir: <c>from</c>/<c>to</c> TR
    /// yerel günü, iki ucu dahil; verilmezse son 30 gün, en fazla 366 gün. AI kapalıysa (varsayılan) ya da
    /// sağlayıcı yanıt veremezse 503.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<AiInsightResponse>> Generate(
        [FromBody] GenerateInsightRequest? request, CancellationToken cancellationToken)
    {
        // Sıfır baytlık gövde model binder tarafından null'a bağlanır. Aralıksız üretmek en sık akış olduğu
        // için bu `??` bir iş kuralı değil model-binding savunmasıdır (SessionsController.Start ile aynı).
        var olusan = await insightService.GenerateAsync(request ?? new GenerateInsightRequest(), cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = olusan.Id }, olusan);
    }

    /// <summary>
    /// Kendi yorumların, yeniden eskiye, sayfalı. <c>kind</c>, <c>workoutSessionId</c> ve <c>setEntryId</c>
    /// ile süzülebilir; başkasının oturum/set id'si boş sayfa verir.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<AiInsightResponse>>> GetPage(
        [FromQuery] AiInsightQuery query, CancellationToken cancellationToken)
        => Ok(await insightService.GetPageAsync(query, cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AiInsightResponse>> GetById(long id, CancellationToken cancellationToken)
        => Ok(await insightService.GetByIdAsync(id, cancellationToken));

    /// <summary>
    /// Yorumu kalıcı olarak siler. Düzenleme ucu YOK: yorum, modelin ne dediğinin kaydıdır (spec Karar 2).
    /// </summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await insightService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
```

- [ ] **Step 5: Uçtan uca testleri çalıştır**

Run: `dotnet test tests/Grind.Tests --filter "FullyQualifiedName~AiInsightEndpointsTests"`
Expected: PASS.

`Gecersiz_tur_suzgeci_400_verir("7")` 200 dönerse, sebep model bağlayıcının tanımsız sayıyı enum'a
bağlamasıdır. Bu durumda `src/Grind.Api/Models/Dtos/Insight/AiInsightQuery.cs` içindeki `Kind` özelliğine
şu özniteliği ekle (Faz 5'in `[EnumDataType]` deseni) ve dosyayı bu görevin commit'ine dahil et:

```csharp
    [EnumDataType(typeof(AiInsightKind), ErrorMessage = "Geçersiz yorum türü.")]
```

Dosyanın başına `using System.ComponentModel.DataAnnotations;` da eklenir.

- [ ] **Step 6: Tüm test paketini ve Release derlemesini çalıştır**

Run: `dotnet build -c Release`
Expected: 0 uyarı, 0 hata.

Run: `dotnet test tests/Grind.Tests`
Expected: PASS. `SwaggerDocumentTests` yeni uçlarla birlikte dokümanın hâlâ üretildiğini doğrular.

- [ ] **Step 7: Commit**

```bash
git add src/Grind.Api/Controllers/InsightsController.cs tests/Grind.Tests/Integration/SahteAiApiFactory.cs tests/Grind.Tests/Integration/AiInsightEndpointsTests.cs
git commit -m "feat(api): AI yorum uclari" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6 (kontrolcü): Dokümantasyon — PLAN.md ve CLAUDE.md

Final tüm-branch incelemesinden ve düzeltmelerinden SONRA kontrolcü (ana oturum) yapar. Subagent'a
verilmez, çünkü test sayıları ancak o noktada kesinleşir.

- [ ] **Step 1: Test sayısını komutla belirle** (elle hesaplanmaz)

Run: `dotnet test tests/Grind.Tests`
Özetteki toplam test sayısı PLAN.md'ye yazılır. Görev başına artışlar görev commit'lerindeki test
çalıştırmalarından okunur.

- [ ] **Step 2: PLAN.md**
  - Durum Özeti'nde Faz 12 → ✅.
  - Faz 12 başlığının altına spec ve plan bağlantıları.
  - 12.1–12.3 maddeleri `[x]`, her birine ne yapıldığı ve hangi görevde yapıldığı yazılır.
  - Test maddesi eklenir (katman başına test dosyaları ve toplam).
  - "Faz 12'den devreden notlar (Faz 13'te dikkat edilecek)" bölümü: spec'in "Bilinçli olarak kapsam
    dışı" listesinden açık kalanlar. Ayrıca şu not: hesap silme (Faz 13) `AiInsight` satırlarını da
    silmeli, çünkü `User → AiInsight` RESTRICT.

- [ ] **Step 3: CLAUDE.md**
  - Domain Modeli'nde `AiInsight` satırına `RangeFrom`, `RangeTo` (nullable, TR günü, Insight'ta dolu)
    eklenir.
  - Yeni bir "Karar (AI sağlayıcısı)" notu: varsayılan kapalı (`Ai:Provider = None` → 503),
    aktivasyonun yalnızca yapılandırmayla yapılması (user-secrets), üretimin yalnızca `Insight` olması,
    son 30 gün varsayılanı ve 366 gün sınırı, ücretli adımın `CancellationToken.None` ile saklanması.

- [ ] **Step 4: Commit**

```bash
git add PLAN.md CLAUDE.md
git commit -m "docs: Faz 12 tamamlandi, devreden notlar guncellendi" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Plan öz-incelemesi (yazım sırasında yapıldı)

- **Spec kapsamı:**

  | Spec kararı | Görev |
  |---|---|
  | Karar 1, 2, 13, 14 | Task 4 (servis) + Task 5 (uçlar) |
  | Karar 3 | Task 2 |
  | Karar 4 | Task 1 (`AiInsightRange`, `EnsureOrdered`) + Task 4 (verisiz aralık) |
  | Karar 5, 8, 9, 10, 11 | Task 3 |
  | Karar 6, 7 | Task 4 |
  | Karar 12 | Task 1 |
  | Test yüzeyi 1-5 | sırasıyla Task 1/2/3, Task 3, Task 2, Task 4, Task 5 |

- **İsim tutarlılığı:**
  - `AiCompletion(Content, Model, TokensUsed, EstimatedCostUsd)` Task 3, 4 ve 5'te aynı.
  - `GetPageAsync(userId, kind, workoutSessionId, setEntryId, skip, take)` Task 2 ve 4'te aynı.
  - `AiInsightRange.Resolve(from, to, today)` Task 1 ve 4'te aynı.
  - Sabit mesajlar Global Constraints'teki listeyle birebir.
- **Bilinen risk:** SDK yanıt deserileştirmesi (Task 3 Step 10) ve tanımsız sayısal enum bağlaması
  (Task 5 Step 5). İkisi için de ilgili adımda ne yapılacağı yazılı.

