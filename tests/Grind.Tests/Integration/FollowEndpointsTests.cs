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

    /// <summary>#628: istek → profilde Received → kabul → iki taraf arkadaş.</summary>
    [Fact]
    public async Task Arkadaslik_istegi_kabul_edilince_arkadas_olunur()
    {
        var (a, aAdi) = await RegisteredClientAsync();
        var (b, bAdi) = await RegisteredClientAsync();

        Assert.Equal(HttpStatusCode.NoContent, (await a.PostAsync($"/api/users/{bAdi}/friend-request", null)).StatusCode);
        var bGozuyle = await b.GetFromJsonAsync<UserProfileResponse>($"/api/users/{aAdi}/profile", Json);
        Assert.Equal(FriendRequestState.Received, bGozuyle!.FriendRequest);

        Assert.Equal(HttpStatusCode.NoContent, (await b.PostAsync($"/api/users/{aAdi}/friend-request/accept", null)).StatusCode);
        var profil = await a.GetFromJsonAsync<UserProfileResponse>($"/api/users/{bAdi}/profile", Json);
        Assert.Equal(FollowRelation.Friends, profil!.Relation);
    }

    [Fact]
    public async Task Gelen_istek_yokken_kabul_ve_ret_404()
    {
        var (a, _) = await RegisteredClientAsync();
        var (_, bAdi) = await RegisteredClientAsync();

        Assert.Equal(HttpStatusCode.NotFound, (await a.PostAsync($"/api/users/{bAdi}/friend-request/accept", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await a.PostAsync($"/api/users/{bAdi}/friend-request/reject", null)).StatusCode);
    }

    private static Task<UserProfileResponse?> ProfilAsync(HttpClient client, string username)
        => client.GetFromJsonAsync<UserProfileResponse>($"/api/users/{username}/profile", Json);

    [Fact]
    public async Task Istek_reddedilince_gonderen_tarafta_bekleyen_istek_kalmaz()
    {
        var (a, aAdi) = await RegisteredClientAsync();
        var (b, bAdi) = await RegisteredClientAsync();
        Assert.Equal(HttpStatusCode.NoContent, (await a.PostAsync($"/api/users/{bAdi}/friend-request", null)).StatusCode);
        Assert.Equal(FriendRequestState.Sent, (await ProfilAsync(a, bAdi))!.FriendRequest);

        Assert.Equal(HttpStatusCode.NoContent, (await b.PostAsync($"/api/users/{aAdi}/friend-request/reject", null)).StatusCode);

        Assert.Equal(FriendRequestState.None, (await ProfilAsync(a, bAdi))!.FriendRequest);
        Assert.Equal(FriendRequestState.None, (await ProfilAsync(b, aAdi))!.FriendRequest);
    }

    [Fact]
    public async Task Istek_geri_cekilince_hedefte_bekleyen_istek_kalmaz()
    {
        var (a, aAdi) = await RegisteredClientAsync();
        var (b, bAdi) = await RegisteredClientAsync();
        await a.PostAsync($"/api/users/{bAdi}/friend-request", null);
        Assert.Equal(FriendRequestState.Received, (await ProfilAsync(b, aAdi))!.FriendRequest);

        Assert.Equal(HttpStatusCode.NoContent, (await a.DeleteAsync($"/api/users/{bAdi}/friend-request")).StatusCode);

        Assert.Equal(FriendRequestState.None, (await ProfilAsync(b, aAdi))!.FriendRequest);
    }

    [Fact]
    public async Task Takipciden_cikar_ve_sessize_al_uclari()
    {
        var (a, aAdi) = await RegisteredClientAsync();
        var (b, bAdi) = await RegisteredClientAsync();
        await a.PostAsync($"/api/users/{bAdi}/follow", null);
        await b.PostAsync($"/api/users/{aAdi}/follow", null);

        Assert.Equal(HttpStatusCode.NoContent,
            (await a.PutAsJsonAsync($"/api/users/{bAdi}/mute", new { muted = true })).StatusCode);
        Assert.True((await a.GetFromJsonAsync<UserProfileResponse>($"/api/users/{bAdi}/profile", Json))!.NotificationsMuted);

        Assert.Equal(HttpStatusCode.NoContent, (await a.DeleteAsync($"/api/users/{bAdi}/follower")).StatusCode);
        var profil = await a.GetFromJsonAsync<UserProfileResponse>($"/api/users/{bAdi}/profile", Json);
        Assert.Equal(FollowRelation.Following, profil!.Relation);
    }
}
