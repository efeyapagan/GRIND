using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Grind.Api.Models.Dtos.Auth;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca: gerçek uygulama, gerçek JWT (issue #65). Bu testler gerçek veritabanına yazar
/// (istek uygulamanın kendi DI scope'unda çalıştığı için transaction/rollback numarası işlemez),
/// bu yüzden kullanıcı adları Guid ile benzersizleştirilir.
/// </summary>
[Trait("Category", "Database")]
public class ProfileUpdateEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private const string Password = "yeterince-uzun-sifre";

    private static string UniqueUsername() => $"prof_{Guid.NewGuid():N}"[..20];

    private async Task<(HttpClient Client, string Username)> RegisteredClientAsync()
    {
        var client = factory.CreateClient();
        var username = UniqueUsername();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = username,
            Password = Password
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);

        return (client, username);
    }

    [Fact]
    public async Task Kullanici_adi_ve_sifre_degisir_yeni_token_calisir_kimlik_yenilenir()
    {
        var (client, username) = await RegisteredClientAsync();
        var yeniAd = UniqueUsername();
        const string yeniSifre = "yepyeni-bir-sifre-123";

        var response = await client.PatchAsJsonAsync("/api/auth/me", new UpdateProfileRequest
        {
            CurrentPassword = Password,
            NewUsername = yeniAd,
            NewPassword = yeniSifre
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.Equal(yeniAd, auth!.Username);

        // Eski kullanici adiyla ARTIK giris yapilamaz, yenisiyle ve yeni sifreyle yapilabilir.
        var eskiAdlaGiris = await factory.CreateClient().PostAsJsonAsync("/api/auth/login",
            new LoginRequest { Username = username, Password = yeniSifre });
        Assert.Equal(HttpStatusCode.Unauthorized, eskiAdlaGiris.StatusCode);

        var yeniGiris = await factory.CreateClient().PostAsJsonAsync("/api/auth/login",
            new LoginRequest { Username = yeniAd, Password = yeniSifre });
        Assert.Equal(HttpStatusCode.OK, yeniGiris.StatusCode);
    }

    [Fact]
    public async Task Yanlis_mevcut_sifreyle_401_doner()
    {
        var (client, _) = await RegisteredClientAsync();

        var response = await client.PatchAsJsonAsync("/api/auth/me",
            new UpdateProfileRequest { CurrentPassword = "bambaska-bir-sifre", NewUsername = UniqueUsername() });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.StartsWith("application/problem+json", response.Content.Headers.ContentType?.ToString());
    }

    [Fact]
    public async Task Alinmis_kullanici_adiyla_409_doner()
    {
        var (_, alinmisAd) = await RegisteredClientAsync();
        var (client, _) = await RegisteredClientAsync();

        var response = await client.PatchAsJsonAsync("/api/auth/me",
            new UpdateProfileRequest { CurrentPassword = Password, NewUsername = alinmisAd });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Kimliksiz_istek_401_alir()
    {
        var response = await factory.CreateClient().PatchAsJsonAsync("/api/auth/me",
            new UpdateProfileRequest { CurrentPassword = Password, NewUsername = UniqueUsername() });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Ikisi_de_bos_gonderilirse_400_doner()
    {
        var (client, _) = await RegisteredClientAsync();

        var response = await client.PatchAsJsonAsync("/api/auth/me",
            new UpdateProfileRequest { CurrentPassword = Password });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
