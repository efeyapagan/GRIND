using System.Net;
using System.Threading.RateLimiting;
using Grind.Api.Common;
using Microsoft.AspNetCore.Http;

namespace Grind.Tests.Common;

/// <summary>
/// Login/register bölümleme mantığını (issue #74) ASP.NET Core pipeline'ı hiç kurmadan,
/// doğrudan sınar: <see cref="RateLimitPartition{TKey}.Factory"/> elle çağrılıp dönen
/// <see cref="RateLimiter"/> üzerinde <c>AttemptAcquire</c> ile bütçe tüketilir. Program.cs'in
/// gerçek üretim sayılarını (10/5dk, 5/1sa) burada, HTTP'siz ve deterministik kilitleriz;
/// gerçek HTTP üzerinden uçtan uca mekanizma (429/ProblemDetails/Retry-After) ise
/// <c>AuthRateLimitingEndpointsTests</c>'te (gevşetilmiş, test-ortak bir sınırla) sınanır.
/// </summary>
public class AuthRateLimiterPartitionsTests
{
    private static HttpContext HttpContext(string ip)
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse(ip);
        return context;
    }

    private static RateLimiter Limiter(RateLimitPartition<string> partition) => partition.Factory(partition.PartitionKey);

    [Fact]
    public void Varsayilan_ayarlar_karara_baglanan_uretim_degerleridir()
    {
        var settings = new AuthRateLimitSettings();

        Assert.Equal(10, settings.LoginPermitLimit);
        Assert.Equal(5, settings.LoginWindowMinutes);
        Assert.Equal(5, settings.RegisterPermitLimit);
        Assert.Equal(60, settings.RegisterWindowMinutes);
    }

    [Fact]
    public void ClientIp_baglanti_adresini_dizgeye_cevirir()
    {
        var ip = AuthRateLimiterPartitions.ClientIp(HttpContext("203.0.113.7"));

        Assert.Equal("203.0.113.7", ip);
    }

    [Fact]
    public void ClientIp_adres_yoksa_bilinmiyor_doner()
    {
        var context = new DefaultHttpContext();

        Assert.Equal("bilinmiyor", AuthRateLimiterPartitions.ClientIp(context));
    }

    [Fact]
    public void Login_limitini_asan_istek_reddedilir_ve_Retry_After_tasir()
    {
        var settings = new AuthRateLimitSettings { LoginPermitLimit = 2, LoginWindowMinutes = 5 };
        var httpContext = HttpContext("198.51.100.1");
        using var limiter = Limiter(AuthRateLimiterPartitions.Login(httpContext, settings));

        Assert.True(limiter.AttemptAcquire(1).IsAcquired);
        Assert.True(limiter.AttemptAcquire(1).IsAcquired);
        var reddedilen = limiter.AttemptAcquire(1);

        Assert.False(reddedilen.IsAcquired);
        Assert.True(reddedilen.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter));
        Assert.True(retryAfter > TimeSpan.Zero);
    }

    [Fact]
    public void Register_limitini_asan_istek_reddedilir()
    {
        var settings = new AuthRateLimitSettings { RegisterPermitLimit = 1, RegisterWindowMinutes = 60 };
        var httpContext = HttpContext("198.51.100.2");
        using var limiter = Limiter(AuthRateLimiterPartitions.Register(httpContext, settings));

        Assert.True(limiter.AttemptAcquire(1).IsAcquired);
        Assert.False(limiter.AttemptAcquire(1).IsAcquired);
    }

    [Fact]
    public void Farkli_ip_kendi_bagimsiz_butcesini_tasir()
    {
        var settings = new AuthRateLimitSettings { LoginPermitLimit = 1, LoginWindowMinutes = 5 };
        using var birinciIp = Limiter(AuthRateLimiterPartitions.Login(HttpContext("198.51.100.10"), settings));
        using var ikinciIp = Limiter(AuthRateLimiterPartitions.Login(HttpContext("198.51.100.20"), settings));

        Assert.True(birinciIp.AttemptAcquire(1).IsAcquired);
        Assert.False(birinciIp.AttemptAcquire(1).IsAcquired);

        // Farklı IP, birincinin hakkını tüketmiş olmasından ETKİLENMEZ -- bağımsız sayaç.
        Assert.True(ikinciIp.AttemptAcquire(1).IsAcquired);
    }

    /// <summary>Login ve register AYRI fonksiyonlardır -- aynı IP için bile bağımsız bütçe taşırlar.</summary>
    [Fact]
    public void Login_ve_register_bagimsiz_sayac_tasir()
    {
        var settings = new AuthRateLimitSettings { LoginPermitLimit = 1, RegisterPermitLimit = 1 };
        var httpContext = HttpContext("198.51.100.30");
        using var girisLimiteri = Limiter(AuthRateLimiterPartitions.Login(httpContext, settings));
        using var kayitLimiteri = Limiter(AuthRateLimiterPartitions.Register(httpContext, settings));

        Assert.True(girisLimiteri.AttemptAcquire(1).IsAcquired);
        Assert.False(girisLimiteri.AttemptAcquire(1).IsAcquired);

        Assert.True(kayitLimiteri.AttemptAcquire(1).IsAcquired);
    }
}
