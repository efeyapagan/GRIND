using System.Net;
using System.Net.Http.Json;
using Grind.Api.Models.Dtos.Auth;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca (issue #74): gerçek HTTP üzerinden mekanizmanın (429 + ProblemDetails + Retry-After
/// + login/register'ın ayrı sayaçları) çalıştığını doğrular. Üretimin gerçek sayıları (10/5dk,
/// 5/1sa) burada DEĞİL, HTTP'siz <c>AuthRateLimiterPartitionsTests</c>'te sınanır -- test host'u
/// <see cref="GrindApiFactory.RelaxedRateLimit"/> ile gevşetilmiştir (bkz. o sınıfın dokümantasyonu).
///
/// BİLEREK <c>IClassFixture</c> KULLANMAZ: rate limiter durumu (IP başına sayaç) TestServer'ın
/// ömrü boyunca kalıcıdır ve TÜM test istekleri aynı (loopback) IP'den geldiği için, paylaşılan
/// bir factory'de bir test metodunun harcadığı hak bir SONRAKİ metodu etkiler (sıralamaya duyarlı,
/// kırılgan testler). Bunun yerine her test kendi <see cref="GrindApiFactory"/>'sini kurar --
/// xUnit zaten her [Fact] için yeni bir test sınıfı örneği oluşturduğundan, bu her teste temiz
/// bir sayaç garanti eder.
/// </summary>
[Trait("Category", "Database")]
public class AuthRateLimitingEndpointsTests : IDisposable
{
    private readonly GrindApiFactory factory = new();

    public void Dispose()
    {
        factory.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task Siniri_asan_giris_429_ve_Retry_After_doner()
    {
        var client = factory.CreateClient();
        var istek = new LoginRequest { Username = "olmayan_kullanici", Password = "yanlis-sifre-123" };

        for (var i = 0; i < GrindApiFactory.RelaxedRateLimit; i++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await client.PostAsJsonAsync("/api/auth/login", istek)).StatusCode);
        }

        var asan = await client.PostAsJsonAsync("/api/auth/login", istek);

        Assert.Equal(HttpStatusCode.TooManyRequests, asan.StatusCode);
        Assert.Equal("application/problem+json", asan.Content.Headers.ContentType?.MediaType);
        Assert.True(asan.Headers.RetryAfter is not null, "Retry-After başlığı eksik.");
    }

    [Fact]
    public async Task Dogru_sifreyle_bile_giris_sinira_takilir()
    {
        var client = factory.CreateClient();
        var kullaniciAdi = $"ratelimit_{Guid.NewGuid():N}"[..20];
        (await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest { Username = kullaniciAdi, Password = "yeterince-uzun-sifre" }))
            .EnsureSuccessStatusCode();

        var dogruIstek = new LoginRequest { Username = kullaniciAdi, Password = "yeterince-uzun-sifre" };
        for (var i = 0; i < GrindApiFactory.RelaxedRateLimit; i++)
        {
            (await client.PostAsJsonAsync("/api/auth/login", dogruIstek)).EnsureSuccessStatusCode();
        }

        var asan = await client.PostAsJsonAsync("/api/auth/login", dogruIstek);

        Assert.Equal(HttpStatusCode.TooManyRequests, asan.StatusCode);
    }

    [Fact]
    public async Task Siniri_asan_kayit_429_ve_Retry_After_doner()
    {
        var client = factory.CreateClient();

        for (var i = 0; i < GrindApiFactory.RelaxedRateLimit; i++)
        {
            var kullaniciAdi = $"ratelimit_{Guid.NewGuid():N}"[..20];
            (await client.PostAsJsonAsync("/api/auth/register",
                new RegisterRequest { Username = kullaniciAdi, Password = "yeterince-uzun-sifre" }))
                .EnsureSuccessStatusCode();
        }

        var asan = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest
            {
                Username = $"ratelimit_{Guid.NewGuid():N}"[..20],
                Password = "yeterince-uzun-sifre"
            });

        Assert.Equal(HttpStatusCode.TooManyRequests, asan.StatusCode);
        Assert.True(asan.Headers.RetryAfter is not null, "Retry-After başlığı eksik.");
    }

    /// <summary>Login ve register AYRI politikalar/sayaçlar taşır -- biri diğerini tüketmez.</summary>
    [Fact]
    public async Task Login_siniri_register_ucunu_etkilemez()
    {
        var client = factory.CreateClient();
        var yanlisIstek = new LoginRequest { Username = "olmayan_kullanici", Password = "yanlis-sifre-123" };

        for (var i = 0; i < GrindApiFactory.RelaxedRateLimit; i++)
        {
            await client.PostAsJsonAsync("/api/auth/login", yanlisIstek);
        }
        Assert.Equal(HttpStatusCode.TooManyRequests,
            (await client.PostAsJsonAsync("/api/auth/login", yanlisIstek)).StatusCode);

        var kayit = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest { Username = $"ratelimit_{Guid.NewGuid():N}"[..20], Password = "yeterince-uzun-sifre" });

        Assert.Equal(HttpStatusCode.OK, kayit.StatusCode);
    }
}
