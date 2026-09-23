using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Social;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca (#281): rota, kimlik ve JSON sözleşmesi. İş kurallarının ayrıntısı
/// <c>FollowServiceTests</c>'te; burada yalnızca uçların birbirine doğru bağlandığı doğrulanır.
/// </summary>
[Trait("Category", "Database")]
public class FollowEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<(HttpClient Client, string Username)> RegisteredClientAsync()
    {
        var client = factory.CreateClient();
        var username = $"takip_{Guid.NewGuid():N}"[..20];
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

    [Fact]
    public async Task Karsilikli_takip_arkadas_listesinde_ve_profilde_gorunur()
    {
        var (a, aAdi) = await RegisteredClientAsync();
        var (b, bAdi) = await RegisteredClientAsync();

        Assert.Equal(HttpStatusCode.NoContent, (await a.PostAsync($"/api/users/{bAdi}/follow", null)).StatusCode);

        var profil = await a.GetFromJsonAsync<UserProfileResponse>($"/api/users/{bAdi}/profile", Json);
        Assert.Equal(FollowRelation.Following, profil!.Relation);
        Assert.Equal(1, profil.FollowerCount);

        Assert.Equal(HttpStatusCode.NoContent, (await b.PostAsync($"/api/users/{aAdi}/follow", null)).StatusCode);

        var arkadaslar = await a.GetFromJsonAsync<PagedResponse<UserSummaryResponse>>(
            $"/api/users/{aAdi}/friends", Json);
        Assert.Equal([bAdi], arkadaslar!.Items.Select(i => i.Username));

        Assert.Equal(HttpStatusCode.NoContent, (await a.DeleteAsync($"/api/users/{bAdi}/follow")).StatusCode);
        profil = await a.GetFromJsonAsync<UserProfileResponse>($"/api/users/{bAdi}/profile", Json);
        Assert.Equal(FollowRelation.FollowedBy, profil!.Relation);
    }

    [Fact]
    public async Task Arama_ucu_kullanici_adini_bulur()
    {
        var (a, _) = await RegisteredClientAsync();
        var (_, bAdi) = await RegisteredClientAsync();

        var sonuc = await a.GetFromJsonAsync<List<UserSummaryResponse>>($"/api/users/search?q={bAdi}", Json);

        Assert.Equal([bAdi], sonuc!.Select(s => s.Username));
    }
}
