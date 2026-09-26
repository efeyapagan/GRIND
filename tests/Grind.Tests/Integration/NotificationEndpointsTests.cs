using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Notification;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca (#325): rota, kimlik ve JSON sözleşmesi. Türetme kuralları <c>NotificationServiceTests</c>'te.
/// </summary>
[Trait("Category", "Database")]
public class NotificationEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<(HttpClient Client, string Username)> RegisteredClientAsync()
    {
        var client = factory.CreateClient();
        var username = $"bldrm_{Guid.NewGuid():N}"[..20];
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = username,
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return (client, username);
    }

    [Theory]
    [InlineData("GET", "/api/notifications")]
    [InlineData("GET", "/api/notifications/unread-count")]
    [InlineData("POST", "/api/notifications/seen")]
    public async Task Tokensiz_istekler_401_verir(string method, string path)
    {
        var response = await factory.CreateClient()
            .SendAsync(new HttpRequestMessage(new HttpMethod(method), path));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Her_kullanici_yalnizca_kendi_bildirimlerini_gorur()
    {
        var (a, aAdi) = await RegisteredClientAsync();
        var (b, _) = await RegisteredClientAsync();
        var (_, cAdi) = await RegisteredClientAsync();

        Assert.Equal(HttpStatusCode.NoContent, (await b.PostAsync($"/api/users/{aAdi}/follow", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await a.PostAsync($"/api/users/{cAdi}/follow", null)).StatusCode);

        var aninki = await a.GetFromJsonAsync<List<NotificationResponse>>("/api/notifications", Json);
        var bninki = await b.GetFromJsonAsync<List<NotificationResponse>>("/api/notifications", Json);

        var tek = Assert.Single(aninki!);
        Assert.Equal((NotificationKind.Follow, true), (tek.Kind, tek.IsUnread));
        Assert.Empty(bninki!);
    }

    [Fact]
    public async Task Goruldu_204_doner_ve_okunmamis_sayisini_sifirlar()
    {
        var (a, aAdi) = await RegisteredClientAsync();
        var (b, _) = await RegisteredClientAsync();
        await b.PostAsync($"/api/users/{aAdi}/follow", null);

        var once = await a.GetFromJsonAsync<UnreadNotificationCountResponse>("/api/notifications/unread-count", Json);
        Assert.Equal(1, once!.Count);

        Assert.Equal(HttpStatusCode.NoContent, (await a.PostAsync("/api/notifications/seen", null)).StatusCode);

        var sonra = await a.GetFromJsonAsync<UnreadNotificationCountResponse>("/api/notifications/unread-count", Json);
        Assert.Equal(0, sonra!.Count);
    }
}
