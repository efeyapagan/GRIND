using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Dtos.Session;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca (#282): rota, kimlik ve JSON sözleşmesi. Yetki kurallarının ayrıntısı
/// <c>FriendActivityServiceTests</c>'te.
/// </summary>
[Trait("Category", "Database")]
public class FriendActivityEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<(HttpClient Client, string Username)> RegisteredClientAsync()
    {
        var client = factory.CreateClient();
        var username = $"arkadas_{Guid.NewGuid():N}"[..20];
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

    /// <summary>
    /// B notlu bir antrenman yapar. Arkadaşı A geçmişi ve rekorları alır ama oturum notu yanıtta hiç yer
    /// almaz (alan yok, null bile değil); arkadaş olmayan C iki uçtan da 403 alır.
    /// </summary>
    [Fact]
    public async Task Arkadas_notsuz_gecmisi_ve_rekorlari_alir_yabanci_alamaz()
    {
        var (a, aAdi) = await RegisteredClientAsync();
        var (b, bAdi) = await RegisteredClientAsync();
        var (c, _) = await RegisteredClientAsync();

        (await a.PostAsync($"/api/users/{bAdi}/follow", null)).EnsureSuccessStatusCode();
        (await b.PostAsync($"/api/users/{aAdi}/follow", null)).EnsureSuccessStatusCode();

        (await b.PostAsJsonAsync("/api/sessions", new StartSessionRequest { Notes = "omuz sıkıştı" }, Json))
            .EnsureSuccessStatusCode();
        var egzersiz = await (await b.PostAsJsonAsync("/api/exercises", new CreateExerciseRequest
        {
            Name = $"Egzersiz {Guid.NewGuid():N}",
            Category = ExerciseCategory.Push
        }, Json)).Content.ReadFromJsonAsync<ExerciseResponse>(Json);
        (await b.PostAsJsonAsync("/api/sets",
            new CreateSetRequest { ExerciseId = egzersiz!.Id, Weight = 60m, Reps = 8 }, Json)).EnsureSuccessStatusCode();

        using var gecmis = JsonDocument.Parse(await a.GetStringAsync($"/api/users/{bAdi}/history"));
        var oturum = Assert.Single(gecmis.RootElement.GetProperty("items").EnumerateArray());
        Assert.False(oturum.TryGetProperty("notes", out _));
        Assert.Equal(1, oturum.GetProperty("sets").GetArrayLength());

        using var rekorlar = JsonDocument.Parse(await a.GetStringAsync($"/api/users/{bAdi}/records"));
        Assert.Equal(1, rekorlar.RootElement.GetArrayLength());

        Assert.Equal(HttpStatusCode.Forbidden, (await c.GetAsync($"/api/users/{bAdi}/history")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await c.GetAsync($"/api/users/{bAdi}/records")).StatusCode);
    }
}
