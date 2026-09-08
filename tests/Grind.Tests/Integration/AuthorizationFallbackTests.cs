using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Grind.Api.Models.Dtos.Auth;

namespace Grind.Tests.Integration;

[Trait("Category", "Database")]
public class AuthorizationFallbackTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static string UniqueUsername() => $"fb_{Guid.NewGuid():N}"[..20];

    /// <summary>Kayıt olup token alır — fallback politikasının kimlik doğrulanmış tarafını sınamak için.</summary>
    private static async Task<string> TokenAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest { Username = UniqueUsername(), Password = "yeterince-uzun-sifre" });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!.Token;
    }

    [Fact]
    public async Task Kimliksiz_istek_eslesmeyen_yolda_bile_401_alir()
    {
        // Fallback politikası yokken bu 404 dönerdi. 401 dönmesi, işaretlenmemiş hiçbir
        // endpoint'in açıkta kalmadığının ("fail closed") doğrudan kanıtı.
        var response = await factory.CreateClient().GetAsync("/api/yok-boyle-bir-yol");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Kimlikli_istek_eslesmeyen_yolda_normal_404_alir()
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", await TokenAsync(client));

        var response = await client.GetAsync("/api/yok-boyle-bir-yol");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Kayit_ve_giris_kimliksiz_erisilebilir_kalir()
    {
        // [AllowAnonymous] fallback politikasını eziyor; ezmeseydi kayıt olmak imkânsızlaşırdı.
        var response = await factory.CreateClient().PostAsJsonAsync("/api/auth/register",
            new RegisterRequest { Username = UniqueUsername(), Password = "yeterince-uzun-sifre" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Swagger_kimliksiz_erisilebilir_kalir()
    {
        var response = await factory.CreateClient().GetAsync("/swagger/v1/swagger.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
