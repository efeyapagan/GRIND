# Faz 3 — Cross-cutting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faz 4'ün controller'ının ince olabilmesi için hata çevirisini, kimliği ve sahiplik kuralını bir kez çözmek.

**Architecture:** Domain exception'ları HTTP'yi bilmez; exception → durum kodu eşlemesi tek bir `IExceptionHandler` içinde yaşar ve RFC 7807 `ProblemDetails` üretir. Kimlik `HttpContext`'ten `ICurrentUserService` ile okunur; sahiplik kuralı bağımlılığı olmayan saf bir `OwnershipGuard` sınıfındadır. JWT yalnızca `UserId` + `Username` taşır.

**Tech Stack:** .NET 10 · ASP.NET Core · Microsoft.AspNetCore.Authentication.JwtBearer 10.0.11 · Swashbuckle 10.2.3 · xUnit

**Spec:** [docs/superpowers/specs/2026-08-31-cross-cutting-design.md](../specs/2026-08-31-cross-cutting-design.md)

## Global Constraints

- Hedef framework `net10.0`.
- **Bu faz veritabanına dokunmaz.** Hiçbir testi Docker istemez; entity, EF konfigürasyonu, repository, `AppDbContext` ve migration'lar değiştirilmez.
- **Domain exception'ları HTTP durum kodu taşımaz.** Eşleme yalnızca `GlobalExceptionHandler` içindedir (CLAUDE.md: "exception tipini uygun HTTP status koduna eşlemek" middleware'in işidir).
- **Stack trace hiçbir ortamda client'a gitmez.** 500 yanıtının `detail` alanı Development'ta exception mesajını taşır, diğer ortamlarda sabit metin.
- **JWT yalnızca `UserId` ve `Username` taşır** — rol/plan claim'i yok (CLAUDE.md kararı).
- **FluentValidation eklenmez.** Doğrulama DataAnnotations + `[ApiController]`'ın otomatik `ValidationProblemDetails`'i ile yapılır (Faz 0 kararı).
- Bu fazda Controller, Service, DTO veya Repository yazılmaz. Frontend'e dokunulmaz.
- Secrets `appsettings.json`'a yazılmaz.
- TDD zorunlu. Build ve test çıktısı tertemiz — sıfır uyarı. Her görev kendi commit'ini atar.

## Doğrulanmış ortam gerçekleri

Plan yazılmadan önce deneyle doğrulandı, varsayılmadı:

- Test projesi ASP.NET Core tiplerini (`DefaultHttpContext`) **ek bir `FrameworkReference` olmadan** görüyor — Web SDK'nın framework referansı transitif akıyor. Test csproj'unda değişiklik gerekmez.
- `IProblemDetailsService.TryWriteAsync`, sahte bir `DefaultHttpContext`'e **yazıyor** — koşulu: `RequestServices` atanmış, `Accept: application/json` başlığı var ve `Response.Body` yazılabilir bir stream.
- Hem `System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler` hem `Microsoft.IdentityModel.JsonWebTokens.JsonWebTokenHandler` erişilebilir. **Modern olan (`JsonWebTokenHandler`) kullanılır**; `JwtSecurityTokenHandler` legacy'dir.

---

## File Structure

**Yeni — üretim:**

| Dosya | Sorumluluk |
|---|---|
| `src/Grind.Api/Common/Security/AppClaims.cs` | Claim tipi sabitleri (`sub`, `unique_name`) — tek doğruluk kaynağı |
| `src/Grind.Api/Common/Exceptions/NotFoundException.cs` | → 404 |
| `src/Grind.Api/Common/Exceptions/ValidationException.cs` | → 400 |
| `src/Grind.Api/Common/Exceptions/ForbiddenException.cs` | → 403 |
| `src/Grind.Api/Common/Exceptions/ConflictException.cs` | → 409 |
| `src/Grind.Api/Common/ErrorHandling/GlobalExceptionHandler.cs` | `IExceptionHandler`; eşleme + loglama + ProblemDetails |
| `src/Grind.Api/Common/Security/OwnershipGuard.cs` | Saf statik sahiplik kuralları |
| `src/Grind.Api/Common/Security/ICurrentUserService.cs` | Aktif kullanıcı sözleşmesi |
| `src/Grind.Api/Common/Security/CurrentUserService.cs` | `HttpContext`'ten okur |
| `src/Grind.Api/Common/Security/JwtSettings.cs` | Key / Issuer / Audience / ExpiryMinutes |
| `src/Grind.Api/Common/Security/ITokenService.cs` | `TokenResult CreateToken(long, string)` |
| `src/Grind.Api/Common/Security/TokenService.cs` | JWT üretimi |
| `src/Grind.Api/Common/DependencyInjection.cs` | `AddCrossCutting` |

**Yeni — test:** `tests/Grind.Tests/Common/` altında `GlobalExceptionHandlerTests.cs`, `OwnershipGuardTests.cs`, `CurrentUserServiceTests.cs`, `TokenServiceTests.cs`, `CrossCuttingRegistrationTests.cs`.

**Değiştirilecek:** `src/Grind.Api/Program.cs` (Görev 5).

**Not — claim sabitleri Görev 1'de doğuyor.** `AppClaims` kavramsal olarak Security'ye ait ama ilk tüketicisi `GlobalExceptionHandler` (log'a UserId yazıyor). Görev 3 ve 4 aynı sabitleri kullanır; string'i üç dosyada tekrarlamak DRY ihlali olurdu.

---

### Task 1: Exception hiyerarşisi ve `GlobalExceptionHandler`

**Files:**
- Create: `src/Grind.Api/Common/Security/AppClaims.cs`, `src/Grind.Api/Common/Exceptions/{NotFound,Validation,Forbidden,Conflict}Exception.cs`, `src/Grind.Api/Common/ErrorHandling/GlobalExceptionHandler.cs`
- Test: `tests/Grind.Tests/Common/GlobalExceptionHandlerTests.cs`

**Interfaces:**
- Consumes: yok
- Produces: `Grind.Api.Common.Security.AppClaims` — `public const string UserId = "sub"`, `public const string Username = "unique_name"`. `Grind.Api.Common.Exceptions` altında dört exception, her biri `(string message)` alan. `Grind.Api.Common.ErrorHandling.GlobalExceptionHandler` — constructor `(IProblemDetailsService, IHostEnvironment, ILogger<GlobalExceptionHandler>)`.

- [ ] **Step 1: Başarısız testi yaz**

`tests/Grind.Tests/Common/GlobalExceptionHandlerTests.cs`:

```csharp
using System.Text;
using System.Text.Json;
using Grind.Api.Common.ErrorHandling;
using Grind.Api.Common.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;

namespace Grind.Tests.Common;

public class GlobalExceptionHandlerTests
{
    private sealed class FakeEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;
        public string ApplicationName { get; set; } = "Grind.Api.Tests";
        public string ContentRootPath { get; set; } = string.Empty;
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            new Microsoft.Extensions.FileProviders.NullFileProvider();
    }

    /// <summary>Handler'ı çalıştırır ve yazılan gövdeyi durum koduyla birlikte döndürür.</summary>
    private static async Task<(int StatusCode, JsonElement Body)> HandleAsync(
        Exception exception, string environmentName = "Production")
    {
        var services = new ServiceCollection();
        services.AddProblemDetails();
        services.AddLogging();
        await using var provider = services.BuildServiceProvider();

        var context = new DefaultHttpContext { RequestServices = provider };
        context.Request.Headers.Accept = "application/json";
        context.Request.Path = "/api/test";
        var body = new MemoryStream();
        context.Response.Body = body;

        var handler = new GlobalExceptionHandler(
            provider.GetRequiredService<IProblemDetailsService>(),
            new FakeEnvironment(environmentName),
            NullLogger<GlobalExceptionHandler>.Instance);

        var handled = await handler.TryHandleAsync(context, exception, CancellationToken.None);
        Assert.True(handled, "Handler isteği işlemedi.");

        var json = JsonDocument.Parse(Encoding.UTF8.GetString(body.ToArray()));
        return (context.Response.StatusCode, json.RootElement.Clone());
    }

    [Theory]
    [InlineData(typeof(NotFoundException), 404)]
    [InlineData(typeof(ValidationException), 400)]
    [InlineData(typeof(ForbiddenException), 403)]
    [InlineData(typeof(ConflictException), 409)]
    public async Task Domain_exceptionlari_dogru_duruma_eslenir(Type exceptionType, int expected)
    {
        var exception = (Exception)Activator.CreateInstance(exceptionType, "mesaj")!;

        var (statusCode, body) = await HandleAsync(exception);

        Assert.Equal(expected, statusCode);
        Assert.Equal(expected, body.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task Taninmayan_exception_500_olur()
    {
        var (statusCode, body) = await HandleAsync(new InvalidOperationException("beklenmedik"));

        Assert.Equal(500, statusCode);
        Assert.Equal(500, body.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task Production_da_500_in_ic_mesaji_sizmaz()
    {
        var (_, body) = await HandleAsync(
            new InvalidOperationException("VERITABANI PAROLASI yanlis"), "Production");

        var detail = body.GetProperty("detail").GetString();
        Assert.DoesNotContain("VERITABANI PAROLASI", detail);
    }

    [Fact]
    public async Task Development_da_500_in_ic_mesaji_gorunur()
    {
        var (_, body) = await HandleAsync(
            new InvalidOperationException("teshis icin gerekli"), "Development");

        Assert.Contains("teshis icin gerekli", body.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Domain_exception_mesaji_production_da_da_gorunur()
    {
        // 4xx'ler kullanıcıya ne yaptığını söylemek içindir; gizlenecek bir şey yok.
        var (_, body) = await HandleAsync(new NotFoundException("Egzersiz bulunamadi"), "Production");

        Assert.Contains("Egzersiz bulunamadi", body.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Yanit_hicbir_ortamda_stack_trace_icermez()
    {
        Exception captured;
        try { throw new InvalidOperationException("patladi"); }
        catch (Exception e) { captured = e; }

        var (_, body) = await HandleAsync(captured, "Development");

        Assert.DoesNotContain("at Grind.Tests", body.ToString());
        Assert.DoesNotContain("StackTrace", body.ToString());
    }
}
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `dotnet test tests/Grind.Tests --filter GlobalExceptionHandlerTests`
Expected: FAIL — derleme hatası, `Grind.Api.Common` ad alanı yok.

- [ ] **Step 3: Claim sabitlerini yaz**

`src/Grind.Api/Common/Security/AppClaims.cs`:

```csharp
namespace Grind.Api.Common.Security;

/// <summary>
/// JWT claim tipleri. Tek yerde durur: token'ı üreten, okuyan ve loglayan kod aynı
/// sabitleri kullanır. .NET'in eski claim eşlemesi kapatıldığı için (MapInboundClaims =
/// false) bu adlar token'da göründükleri hâlleriyle kullanılır.
/// </summary>
public static class AppClaims
{
    public const string UserId = "sub";
    public const string Username = "unique_name";
}
```

- [ ] **Step 4: Dört exception'ı yaz**

`src/Grind.Api/Common/Exceptions/NotFoundException.cs`:

```csharp
namespace Grind.Api.Common.Exceptions;

/// <summary>
/// İstenen kayıt yok — ya da kullanıcı ona erişemiyor. İkisi bilerek ayrılmaz: erişilemeyen
/// bir kayıt için 403 dönmek "böyle bir kayıt var" bilgisini sızdırır.
/// </summary>
public class NotFoundException(string message) : Exception(message);
```

`src/Grind.Api/Common/Exceptions/ValidationException.cs`:

```csharp
namespace Grind.Api.Common.Exceptions;

/// <summary>Servis katmanının iş kuralı doğrulaması başarısız (DataAnnotations'ın ötesi).</summary>
public class ValidationException(string message) : Exception(message);
```

`src/Grind.Api/Common/Exceptions/ForbiddenException.cs`:

```csharp
namespace Grind.Api.Common.Exceptions;

/// <summary>
/// Kullanıcı kaydı görebiliyor ama bu işlemi yapamaz — örn. global bir egzersizi
/// düzenlemeye çalışmak. Başkasının özel kaydı için bu DEĞİL, NotFoundException kullanılır.
/// </summary>
public class ForbiddenException(string message) : Exception(message);
```

`src/Grind.Api/Common/Exceptions/ConflictException.cs`:

```csharp
namespace Grind.Api.Common.Exceptions;

/// <summary>Mevcut durumla çakışma — örn. kullanılmakta olan bir kullanıcı adı.</summary>
public class ConflictException(string message) : Exception(message);
```

- [ ] **Step 5: Handler'ı yaz**

`src/Grind.Api/Common/ErrorHandling/GlobalExceptionHandler.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Common.ErrorHandling;

/// <summary>
/// Altından kaçan her exception'ı yakalar, loglar ve RFC 7807 ProblemDetails olarak yanıtlar.
/// Rollback İŞİ DEĞİLDİR — o, Unit of Work seviyesinde bundan önce bitmiş olmalıdır.
/// </summary>
public class GlobalExceptionHandler(
    IProblemDetailsService problemDetailsService,
    IHostEnvironment environment,
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (statusCode, title) = Map(exception);
        var userId = httpContext.User.FindFirst(AppClaims.UserId)?.Value ?? "anonim";

        // 5xx bizim hatamız, 4xx çağıranın: ikisini aynı seviyede loglamak gürültü yaratır.
        if (statusCode >= StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception,
                "İşlenmemiş hata. Yol: {Path}, Kullanıcı: {UserId}", httpContext.Request.Path, userId);
        }
        else
        {
            logger.LogWarning(
                "İstek reddedildi ({StatusCode}). Yol: {Path}, Kullanıcı: {UserId}, Sebep: {Reason}",
                statusCode, httpContext.Request.Path, userId, exception.Message);
        }

        httpContext.Response.StatusCode = statusCode;

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = statusCode,
                Title = title,
                Detail = Detail(exception, statusCode),
                Instance = httpContext.Request.Path
            }
        });
    }

    private static (int StatusCode, string Title) Map(Exception exception) => exception switch
    {
        NotFoundException => (StatusCodes.Status404NotFound, "Kayıt bulunamadı"),
        ValidationException => (StatusCodes.Status400BadRequest, "Geçersiz istek"),
        ForbiddenException => (StatusCodes.Status403Forbidden, "İzin yok"),
        ConflictException => (StatusCodes.Status409Conflict, "Çakışma"),
        _ => (StatusCodes.Status500InternalServerError, "Beklenmeyen bir hata oluştu")
    };

    /// <summary>
    /// Domain exception'larının mesajı kullanıcıya söylenmek içindir. 500'ünki değildir:
    /// iç mesaj bağlantı dizesi, dosya yolu veya şema ayrıntısı sızdırabilir.
    /// </summary>
    private string Detail(Exception exception, int statusCode)
        => statusCode == StatusCodes.Status500InternalServerError && !environment.IsDevelopment()
            ? "Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin."
            : exception.Message;
}
```

- [ ] **Step 6: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS (97/97 — 88 mevcut + 9 yeni: 4 theory + 5 fact).

- [ ] **Step 7: Commit**

```bash
git add src/Grind.Api/Common tests/Grind.Tests/Common
git commit -m "feat(common): domain exception'lari ve global hata handler'i"
```

---

### Task 2: `OwnershipGuard`

**Files:**
- Create: `src/Grind.Api/Common/Security/OwnershipGuard.cs`
- Test: `tests/Grind.Tests/Common/OwnershipGuardTests.cs`

**Interfaces:**
- Consumes: `Grind.Api.Common.Exceptions.ForbiddenException`
- Produces: `Grind.Api.Common.Security.OwnershipGuard` — `static bool IsVisibleTo(long? ownerId, long currentUserId)`, `static bool IsOwnedBy(long? ownerId, long currentUserId)`, `static void EnsureOwnedBy(long? ownerId, long currentUserId, string resourceName)`. Faz 5-8 servisleri bunları çağıracak.

**İki kavram bilerek ayrı:** *görünürlük* globalleri içerir (`ownerId is null` herkese açıktır), *sahiplik* içermez (global bir kaydı kimse değiştiremez). Listeleme ve okuma görünürlüğe, değiştirme ve silme sahipliğe bakar.

- [ ] **Step 1: Başarısız testi yaz**

`tests/Grind.Tests/Common/OwnershipGuardTests.cs`:

```csharp
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;

namespace Grind.Tests.Common;

public class OwnershipGuardTests
{
    private const long Me = 42;
    private const long SomeoneElse = 99;

    [Fact]
    public void Global_kayit_herkese_gorunur()
    {
        Assert.True(OwnershipGuard.IsVisibleTo(null, Me));
        Assert.True(OwnershipGuard.IsVisibleTo(null, SomeoneElse));
    }

    [Fact]
    public void Kendi_kaydim_bana_gorunur()
    {
        Assert.True(OwnershipGuard.IsVisibleTo(Me, Me));
    }

    [Fact]
    public void Baskasinin_kaydi_bana_gorunmez()
    {
        Assert.False(OwnershipGuard.IsVisibleTo(SomeoneElse, Me));
    }

    [Fact]
    public void Global_kayit_kimsenin_MALI_degildir()
    {
        // Görünürlük ile sahiplik farkı: global egzersizi görebilirim ama değiştiremem.
        Assert.False(OwnershipGuard.IsOwnedBy(null, Me));
    }

    [Fact]
    public void Kendi_kaydim_benim_malimdir()
    {
        Assert.True(OwnershipGuard.IsOwnedBy(Me, Me));
    }

    [Fact]
    public void EnsureOwnedBy_kendi_kaydimda_gecer()
    {
        OwnershipGuard.EnsureOwnedBy(Me, Me, "Egzersiz");
    }

    [Fact]
    public void EnsureOwnedBy_global_kayitta_ForbiddenException_firlatir()
    {
        var exception = Assert.Throws<ForbiddenException>(
            () => OwnershipGuard.EnsureOwnedBy(null, Me, "Egzersiz"));

        Assert.Contains("Egzersiz", exception.Message);
    }

    [Fact]
    public void EnsureOwnedBy_baskasinin_kaydinda_ForbiddenException_firlatir()
    {
        Assert.Throws<ForbiddenException>(
            () => OwnershipGuard.EnsureOwnedBy(SomeoneElse, Me, "Egzersiz"));
    }
}
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `dotnet test tests/Grind.Tests --filter OwnershipGuardTests`
Expected: FAIL — `OwnershipGuard` tipi yok.

- [ ] **Step 3: Implementasyonu yaz**

`src/Grind.Api/Common/Security/OwnershipGuard.cs`:

```csharp
using Grind.Api.Common.Exceptions;

namespace Grind.Api.Common.Security;

/// <summary>
/// CLAUDE.md'nin sahiplik kuralının tek uygulaması. Saf fonksiyonlar — bağımlılığı yok,
/// her servis aynı kararı aynı şekilde verir.
/// </summary>
public static class OwnershipGuard
{
    /// <summary>Okuma/listeleme için: kendi kaydı ya da global (UserId = null).</summary>
    public static bool IsVisibleTo(long? ownerId, long currentUserId)
        => ownerId is null || ownerId == currentUserId;

    /// <summary>
    /// Değiştirme için: yalnızca kullanıcının KENDİ kaydı. Global kayıtlar (null) kimsenin
    /// malı değildir — görülebilirler ama değiştirilemezler.
    /// </summary>
    public static bool IsOwnedBy(long? ownerId, long currentUserId)
        => ownerId == currentUserId;

    /// <summary>
    /// Değiştirme/silme öncesi kapı. Başkasının ÖZEL kaydı buraya hiç ulaşmamalıdır —
    /// repository onu zaten görünmez kılar ve servis öncesinde NotFoundException fırlatır
    /// (varlık bilgisi sızdırılmasın diye). Buraya ulaşan tek "hayır" durumu global kayıttır.
    /// </summary>
    public static void EnsureOwnedBy(long? ownerId, long currentUserId, string resourceName)
    {
        if (!IsOwnedBy(ownerId, currentUserId))
        {
            throw new ForbiddenException($"{resourceName} üzerinde değişiklik yapma izniniz yok.");
        }
    }
}
```

- [ ] **Step 4: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS (105/105).

- [ ] **Step 5: Commit**

```bash
git add src/Grind.Api/Common/Security/OwnershipGuard.cs tests/Grind.Tests/Common/OwnershipGuardTests.cs
git commit -m "feat(common): OwnershipGuard - gorunurluk ve sahiplik kurallari"
```

---

### Task 3: `ICurrentUserService`

**Files:**
- Create: `src/Grind.Api/Common/Security/ICurrentUserService.cs`, `src/Grind.Api/Common/Security/CurrentUserService.cs`
- Test: `tests/Grind.Tests/Common/CurrentUserServiceTests.cs`

**Interfaces:**
- Consumes: `AppClaims`
- Produces: `Grind.Api.Common.Security.ICurrentUserService` — `long UserId { get; }`, `string Username { get; }`. `CurrentUserService(IHttpContextAccessor accessor)`.

**Kimlik yoksa fırlatır, null dönmez.** Register/login dışındaki her endpoint `[Authorize]` taşıyacak; kimliğin olmaması bir çalışma zamanı durumu değil, `[Authorize]`'u unutmuş birinin programlama hatasıdır. Fırlatmak onu 500 olarak açığa çıkarır — sessizce anonim davranmak yetkilendirmeyi delerdi.

- [ ] **Step 1: Başarısız testi yaz**

`tests/Grind.Tests/Common/CurrentUserServiceTests.cs`:

```csharp
using System.Security.Claims;
using Grind.Api.Common.Security;
using Microsoft.AspNetCore.Http;

namespace Grind.Tests.Common;

public class CurrentUserServiceTests
{
    private static CurrentUserService WithClaims(params Claim[] claims)
    {
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(claims, "test"))
        };
        return new CurrentUserService(new HttpContextAccessor { HttpContext = context });
    }

    private static CurrentUserService WithoutContext()
        => new(new HttpContextAccessor { HttpContext = null });

    [Fact]
    public void UserId_claimden_okunur()
    {
        var service = WithClaims(new Claim(AppClaims.UserId, "1234"));

        Assert.Equal(1234, service.UserId);
    }

    [Fact]
    public void Username_claimden_okunur()
    {
        var service = WithClaims(new Claim(AppClaims.Username, "efe"));

        Assert.Equal("efe", service.Username);
    }

    [Fact]
    public void Kimlik_yoksa_UserId_firlatir()
    {
        var service = WithClaims();

        Assert.Throws<InvalidOperationException>(() => service.UserId);
    }

    [Fact]
    public void HttpContext_yoksa_UserId_firlatir()
    {
        var service = WithoutContext();

        Assert.Throws<InvalidOperationException>(() => service.UserId);
    }

    [Fact]
    public void Sayiya_cevrilemeyen_UserId_firlatir()
    {
        // Bozuk bir token sessizce 0 numaralı kullanıcıya dönüşmemeli.
        var service = WithClaims(new Claim(AppClaims.UserId, "abc"));

        Assert.Throws<InvalidOperationException>(() => service.UserId);
    }

    [Fact]
    public void Kimlik_yoksa_Username_firlatir()
    {
        var service = WithClaims();

        Assert.Throws<InvalidOperationException>(() => service.Username);
    }
}
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `dotnet test tests/Grind.Tests --filter CurrentUserServiceTests`
Expected: FAIL — `CurrentUserService` tipi yok.

- [ ] **Step 3: Arayüzü ve implementasyonu yaz**

`src/Grind.Api/Common/Security/ICurrentUserService.cs`:

```csharp
namespace Grind.Api.Common.Security;

/// <summary>
/// Aktif isteğin kullanıcısı. Kimlik yoksa fırlatır — bu uygulamada kimliksiz bir istek
/// yalnızca [Authorize] unutulduğunda oluşur ve bu bir programlama hatasıdır.
/// </summary>
public interface ICurrentUserService
{
    long UserId { get; }

    string Username { get; }
}
```

`src/Grind.Api/Common/Security/CurrentUserService.cs`:

```csharp
using System.Globalization;

namespace Grind.Api.Common.Security;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public long UserId
    {
        get
        {
            var raw = Claim(AppClaims.UserId);

            return long.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var id)
                ? id
                : throw new InvalidOperationException(
                    "İstekte geçerli bir kullanıcı kimliği yok. Endpoint [Authorize] taşımıyor olabilir.");
        }
    }

    public string Username
        => Claim(AppClaims.Username)
           ?? throw new InvalidOperationException(
               "İstekte kullanıcı adı claim'i yok. Endpoint [Authorize] taşımıyor olabilir.");

    private string? Claim(string claimType)
        => httpContextAccessor.HttpContext?.User.FindFirst(claimType)?.Value;
}
```

- [ ] **Step 4: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS (111/111).

- [ ] **Step 5: Commit**

```bash
git add src/Grind.Api/Common/Security tests/Grind.Tests/Common/CurrentUserServiceTests.cs
git commit -m "feat(common): ICurrentUserService - HttpContext'ten aktif kullanici"
```

---

### Task 4: `ITokenService` ve JWT üretimi

**Files:**
- Create: `src/Grind.Api/Common/Security/JwtSettings.cs`, `ITokenService.cs`, `TokenService.cs`
- Test: `tests/Grind.Tests/Common/TokenServiceTests.cs`

**Interfaces:**
- Consumes: `AppClaims`
- Produces: `Grind.Api.Common.Security.JwtSettings` — `Key`, `Issuer`, `Audience` (string), `ExpiryMinutes` (int). `TokenResult(string Token, DateTime ExpiresAtUtc)` record. `ITokenService` — `TokenResult CreateToken(long userId, string username)`. `TokenService(JwtSettings settings)`. Faz 4 `AuthService` bunu kullanacak.

`IOptions<>` kullanılmıyor: `JwtSettings` doğrudan inject edilir. Faz 2'nin `AddPersistence(connectionString)` kararıyla aynı gerekçe — kayıt, yapılandırma okumasından bağımsız ve doğrudan test edilebilir olur.

**Modern handler kullanılır:** `Microsoft.IdentityModel.JsonWebTokens.JsonWebTokenHandler`. `JwtSecurityTokenHandler` de erişilebilir ama legacy'dir.

- [ ] **Step 1: Başarısız testi yaz**

`tests/Grind.Tests/Common/TokenServiceTests.cs`:

```csharp
using System.Text;
using Grind.Api.Common.Security;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Grind.Tests.Common;

public class TokenServiceTests
{
    private static readonly JwtSettings Settings = new()
    {
        Key = "bu-yalnizca-test-icin-kullanilan-en-az-256-bitlik-bir-anahtardir",
        Issuer = "grind-api-test",
        Audience = "grind-app-test",
        ExpiryMinutes = 60
    };

    private static TokenValidationParameters ValidationParameters() => new()
    {
        ValidIssuer = Settings.Issuer,
        ValidAudience = Settings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Settings.Key)),
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    [Fact]
    public async Task Uretilen_token_kendi_parametreleriyle_dogrulanir()
    {
        var result = new TokenService(Settings).CreateToken(7, "efe");

        var validation = await new JsonWebTokenHandler()
            .ValidateTokenAsync(result.Token, ValidationParameters());

        Assert.True(validation.IsValid, validation.Exception?.Message);
    }

    [Fact]
    public async Task Token_userId_ve_username_tasir()
    {
        var result = new TokenService(Settings).CreateToken(7, "efe");

        var validation = await new JsonWebTokenHandler()
            .ValidateTokenAsync(result.Token, ValidationParameters());

        Assert.Equal("7", validation.Claims[AppClaims.UserId].ToString());
        Assert.Equal("efe", validation.Claims[AppClaims.Username].ToString());
    }

    [Fact]
    public async Task Token_rol_veya_plan_claimi_TASIMAZ()
    {
        // CLAUDE.md kararı: JWT sadece kimlik taşır. Rol/plan token'a gömülürse kullanıcı
        // premium'a geçtiğinde eski token eski durumu taşımaya devam eder.
        var result = new TokenService(Settings).CreateToken(7, "efe");

        var validation = await new JsonWebTokenHandler()
            .ValidateTokenAsync(result.Token, ValidationParameters());

        Assert.DoesNotContain(validation.Claims.Keys, k =>
            k.Contains("role", StringComparison.OrdinalIgnoreCase) ||
            k.Contains("plan", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void ExpiresAtUtc_ayarlanan_sureyi_yansitir()
    {
        var before = DateTime.UtcNow;

        var result = new TokenService(Settings).CreateToken(7, "efe");

        var expected = before.AddMinutes(Settings.ExpiryMinutes);
        Assert.InRange(result.ExpiresAtUtc, expected.AddSeconds(-30), expected.AddSeconds(30));
    }

    [Fact]
    public async Task Baska_bir_anahtarla_imzalanmis_gibi_dogrulanamaz()
    {
        var result = new TokenService(Settings).CreateToken(7, "efe");
        var wrongKey = ValidationParameters();
        wrongKey.IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes("tamamen-baska-bir-anahtar-en-az-256-bitlik-olmali!"));

        var validation = await new JsonWebTokenHandler().ValidateTokenAsync(result.Token, wrongKey);

        Assert.False(validation.IsValid);
    }
}
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `dotnet test tests/Grind.Tests --filter TokenServiceTests`
Expected: FAIL — `JwtSettings` / `TokenService` tipleri yok.

- [ ] **Step 3: Ayarlar sınıfını ve arayüzü yaz**

`src/Grind.Api/Common/Security/JwtSettings.cs`:

```csharp
namespace Grind.Api.Common.Security;

/// <summary>
/// `appsettings.json`'daki "Jwt" bölümü. `Key` orada BOŞ durur; gerçek değer
/// user-secrets veya ortam değişkeninden gelir.
/// </summary>
public class JwtSettings
{
    public string Key { get; set; } = string.Empty;

    public string Issuer { get; set; } = string.Empty;

    public string Audience { get; set; } = string.Empty;

    public int ExpiryMinutes { get; set; }
}
```

`src/Grind.Api/Common/Security/ITokenService.cs`:

```csharp
namespace Grind.Api.Common.Security;

/// <summary>Üretilen erişim token'ı ve ne zaman geçersizleşeceği.</summary>
public record TokenResult(string Token, DateTime ExpiresAtUtc);

public interface ITokenService
{
    /// <summary>
    /// Yalnızca kimlik taşıyan bir JWT üretir. Rol/plan gibi zamanla değişebilen
    /// öznitelikler bilerek dışarıda bırakılır (CLAUDE.md kararı).
    /// </summary>
    TokenResult CreateToken(long userId, string username);
}
```

- [ ] **Step 4: `TokenService`'i yaz**

`src/Grind.Api/Common/Security/TokenService.cs`:

```csharp
using System.Globalization;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Grind.Api.Common.Security;

public class TokenService(JwtSettings settings) : ITokenService
{
    public TokenResult CreateToken(long userId, string username)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(settings.ExpiryMinutes);

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = settings.Issuer,
            Audience = settings.Audience,
            Expires = expiresAt,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.Key)),
                SecurityAlgorithms.HmacSha256),
            Claims = new Dictionary<string, object>
            {
                [AppClaims.UserId] = userId.ToString(CultureInfo.InvariantCulture),
                [AppClaims.Username] = username
            }
        };

        return new TokenResult(new JsonWebTokenHandler().CreateToken(descriptor), expiresAt);
    }
}
```

- [ ] **Step 5: Testleri çalıştır**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS (116/116).

- [ ] **Step 6: Commit**

```bash
git add src/Grind.Api/Common/Security tests/Grind.Tests/Common/TokenServiceTests.cs
git commit -m "feat(common): ITokenService - yalnizca kimlik tasiyan JWT uretimi"
```

---

### Task 5: DI kayıtları, kimlik doğrulama ve Swagger

**Files:**
- Create: `src/Grind.Api/Common/DependencyInjection.cs`
- Modify: `src/Grind.Api/Program.cs`
- Test: `tests/Grind.Tests/Common/CrossCuttingRegistrationTests.cs`

**Interfaces:**
- Consumes: Görev 1-4'ün tamamı
- Produces: `Grind.Api.Common.DependencyInjection.AddCrossCutting(this IServiceCollection services, JwtSettings jwtSettings)`. Faz 4 controller'ları bu kayıtlar üzerinde çalışacak.

**`MapInboundClaims = false`:** .NET varsayılan olarak gelen `sub` claim'ini `ClaimTypes.NameIdentifier`'a yeniden adlandırır. Bu klasik bir tuzaktır — token'a `sub` yazıp `sub` okumaya çalışan kod sessizce boş döner. Kapatınca claim adları token'daki hâliyle kalır ve `AppClaims` sabitleri hem yazarken hem okurken geçerli olur.

- [ ] **Step 1: Başarısız testi yaz**

`tests/Grind.Tests/Common/CrossCuttingRegistrationTests.cs`:

```csharp
using Grind.Api.Common;
using Grind.Api.Common.Security;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;

namespace Grind.Tests.Common;

public class CrossCuttingRegistrationTests
{
    private static JwtSettings ValidSettings() => new()
    {
        Key = "bu-yalnizca-test-icin-kullanilan-en-az-256-bitlik-bir-anahtardir",
        Issuer = "grind-api-test",
        Audience = "grind-app-test",
        ExpiryMinutes = 60
    };

    private static ServiceProvider BuildProvider()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddCrossCutting(ValidSettings());
        return services.BuildServiceProvider(validateScopes: true);
    }

    [Theory]
    [InlineData(typeof(ICurrentUserService))]
    [InlineData(typeof(ITokenService))]
    [InlineData(typeof(IHttpContextAccessor))]
    public void Kayitli_tipler_cozulebilir(Type serviceType)
    {
        using var provider = BuildProvider();
        using var scope = provider.CreateScope();

        Assert.NotNull(scope.ServiceProvider.GetService(serviceType));
    }

    [Fact]
    public void Global_hata_handleri_kayitlidir()
    {
        using var provider = BuildProvider();
        using var scope = provider.CreateScope();

        Assert.NotNull(scope.ServiceProvider.GetService<IExceptionHandler>());
    }

    [Fact]
    public void Cok_kisa_JWT_anahtari_baslangicta_reddedilir()
    {
        // HmacSha256 en az 256 bit ister. Kısa anahtar ilk token üretiminde anlaşılmaz bir
        // hataya dönüşür; başlangıçta net bir hata vermek daha iyi.
        var services = new ServiceCollection();
        var settings = ValidSettings();
        settings.Key = "cok-kisa";

        var exception = Assert.Throws<InvalidOperationException>(
            () => services.AddCrossCutting(settings));

        Assert.Contains("Jwt:Key", exception.Message);
    }

    [Fact]
    public void Bos_JWT_anahtari_baslangicta_reddedilir()
    {
        var services = new ServiceCollection();
        var settings = ValidSettings();
        settings.Key = string.Empty;

        Assert.Throws<InvalidOperationException>(() => services.AddCrossCutting(settings));
    }
}
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `dotnet test tests/Grind.Tests --filter CrossCuttingRegistrationTests`
Expected: FAIL — `AddCrossCutting` yok.

- [ ] **Step 3: DI uzantısını yaz**

`src/Grind.Api/Common/DependencyInjection.cs`:

```csharp
using System.Text;
using Grind.Api.Common.ErrorHandling;
using Grind.Api.Common.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace Grind.Api.Common;

public static class DependencyInjection
{
    /// <summary>HmacSha256 en az 256 bit anahtar ister.</summary>
    private const int MinimumKeyBytes = 32;

    public static IServiceCollection AddCrossCutting(
        this IServiceCollection services, JwtSettings jwtSettings)
    {
        if (Encoding.UTF8.GetByteCount(jwtSettings.Key) < MinimumKeyBytes)
        {
            throw new InvalidOperationException(
                $"Jwt:Key en az {MinimumKeyBytes} byte olmalı (HmacSha256 gereği). " +
                "Değeri user-secrets veya ortam değişkeninden verin.");
        }

        services.AddSingleton(jwtSettings);
        services.AddSingleton<ITokenService, TokenService>();

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        services.AddProblemDetails();
        services.AddExceptionHandler<GlobalExceptionHandler>();

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // .NET varsayılanı gelen "sub" claim'ini ClaimTypes.NameIdentifier'a
                // yeniden adlandırır; kapatmazsak AppClaims.UserId ile okumak boş döner.
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = jwtSettings.Issuer,
                    ValidAudience = jwtSettings.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtSettings.Key)),
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateIssuerSigningKey = true,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };
            });

        services.AddAuthorization();

        return services;
    }
}
```

- [ ] **Step 4: `Program.cs`'i güncelle**

`src/Grind.Api/Program.cs` dosyasını şu hâle getir:

```csharp
using Grind.Api.Common;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddPersistence(
    builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres tanımlı değil."));

builder.Services.AddCrossCutting(
    builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
    ?? throw new InvalidOperationException("Jwt bölümü tanımlı değil."));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Login'den dönen token'ı buraya yapıştırın (başına 'Bearer ' yazmayın)."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { new OpenApiSecuritySchemeReference("Bearer"), new List<string>() }
    });
});

var app = builder.Build();

// Pipeline'ın başında: altındaki her şeyi sarar.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

`using Grind.Api.Data;` **kalmalı** — `AddPersistence` o ad alanındadır (doğrulandı: `src/Grind.Api/Data/DependencyInjection.cs` satır 4).

**Swagger tipleri hakkında:** ad alanı `Microsoft.OpenApi`'dir, `Microsoft.OpenApi.Models` **değil**. Swashbuckle 10.2.3 Microsoft.OpenApi v2'ye dayanıyor ve tipler `.Models` alt ad alanından çıkarıldı; eski `OpenApiSecurityScheme { Reference = new OpenApiReference { ... } }` deseni de kaldırıldı, yerine `OpenApiSecuritySchemeReference("Bearer")` geldi. `OpenApiSecurityRequirement`, `Dictionary<OpenApiSecuritySchemeReference, List<string>>` olduğu için değer `Array.Empty<string>()` değil `new List<string>()` olmalıdır. Hepsi derlenerek doğrulandı.

- [ ] **Step 5: Testleri çalıştır ve uygulamanın ayağa kalktığını doğrula**

Run: `dotnet test tests/Grind.Tests`
Expected: PASS (122/122).

Run: `dotnet build --configuration Release`
Expected: 0 uyarı, 0 hata.

- [ ] **Step 6: Commit**

```bash
git add src/Grind.Api/Common/DependencyInjection.cs src/Grind.Api/Program.cs tests/Grind.Tests/Common/CrossCuttingRegistrationTests.cs
git commit -m "feat(common): AddCrossCutting, JWT kimlik dogrulama ve Swagger bearer"
```

- [ ] **Step 7: `PLAN.md`'de Faz 3'ü kapat**

Faz 3 maddelerini `- [x]` yap; durum tablosunda Faz 3'ü ✅, Faz 4'ü `⏳ sırada` yap.

```bash
git add PLAN.md
git commit -m "docs: Faz 3 tamamlandi"
```

---

## Doğrulama Özeti

Faz 3 şu koşullar sağlandığında bitmiştir:

- `dotnet build --configuration Release` 0 uyarı, 0 hata
- `dotnet test tests/Grind.Tests` tamamı yeşil (Docker çalışırken; Faz 3'ün kendi testleri Docker istemez ama Faz 1-2'nin testleri ister)
- Hiçbir domain exception'ı HTTP durum kodu taşımıyor
- 500 yanıtı Production'da iç mesaj sızdırmıyor, hiçbir ortamda stack trace sızdırmıyor
- JWT yalnızca `sub` ve `unique_name` taşıyor
- Entity, EF konfigürasyonu, repository ve migration dosyalarına dokunulmadı
