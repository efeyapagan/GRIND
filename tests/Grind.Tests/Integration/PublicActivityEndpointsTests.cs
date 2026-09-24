using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Dtos.Session;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Dtos.Settings;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca (#282, #294): rota, kimlik ve JSON sözleşmesi. Yetki kurallarının ayrıntısı
/// <c>PublicActivityServiceTests</c>'te.
/// </summary>
[Trait("Category", "Database")]
public class PublicActivityEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<(HttpClient Client, string Username)> RegisteredClientAsync()
    {
        var client = factory.CreateClient();
        var username = $"halka_{Guid.NewGuid():N}"[..20];
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
    /// B notlu bir antrenman yapar. Yabancı C (takip/arkadaşlık YOK) geçmişi ve rekorları alır ama
    /// oturum notu yanıtta hiç yer almaz (alan yok, null bile değil) — açık hesapta kapı yok.
    /// </summary>
    [Fact]
    public async Task Acik_hesapta_yabanci_notsuz_gecmisi_ve_rekorlari_alir()
    {
        var (b, bAdi) = await RegisteredClientAsync();
        var (c, _) = await RegisteredClientAsync();

        (await b.PutAsJsonAsync("/api/settings/privacy-level",
            new UpdatePrivacyLevelRequest { PrivacyLevel = PrivacyLevel.Acik }, Json)).EnsureSuccessStatusCode();

        (await b.PostAsJsonAsync("/api/sessions", new StartSessionRequest { Notes = "omuz sıkıştı" }, Json))
            .EnsureSuccessStatusCode();
        var egzersiz = await (await b.PostAsJsonAsync("/api/exercises", new CreateExerciseRequest
        {
            Name = $"Egzersiz {Guid.NewGuid():N}",
            Category = ExerciseCategory.Push
        }, Json)).Content.ReadFromJsonAsync<ExerciseResponse>(Json);
        (await b.PostAsJsonAsync("/api/sets",
            new CreateSetRequest { ExerciseId = egzersiz!.Id, Weight = 60m, Reps = 8 }, Json)).EnsureSuccessStatusCode();

        using var gecmis = JsonDocument.Parse(await c.GetStringAsync($"/api/users/{bAdi}/history"));
        var oturum = Assert.Single(gecmis.RootElement.GetProperty("items").EnumerateArray());
        Assert.False(oturum.TryGetProperty("notes", out _));
        Assert.Equal(1, oturum.GetProperty("sets").GetArrayLength());

        using var rekorlar = JsonDocument.Parse(await c.GetStringAsync($"/api/users/{bAdi}/records"));
        Assert.Equal(1, rekorlar.RootElement.GetArrayLength());
    }

    /// <summary>Gizli hesapta yabancı geçmişte boş liste (200, 403 DEĞİL) alır, rekorları yine görür.</summary>
    [Fact]
    public async Task Gizli_hesapta_yabanci_gecmiste_bos_liste_alir_rekorlari_gorur()
    {
        var (b, bAdi) = await RegisteredClientAsync();
        var (c, _) = await RegisteredClientAsync();

        (await b.PutAsJsonAsync("/api/settings/privacy-level",
            new UpdatePrivacyLevelRequest { PrivacyLevel = PrivacyLevel.Gizli }, Json)).EnsureSuccessStatusCode();

        var egzersiz = await (await b.PostAsJsonAsync("/api/exercises", new CreateExerciseRequest
        {
            Name = $"Egzersiz {Guid.NewGuid():N}",
            Category = ExerciseCategory.Push
        }, Json)).Content.ReadFromJsonAsync<ExerciseResponse>(Json);
        (await b.PostAsJsonAsync("/api/sets",
            new CreateSetRequest { ExerciseId = egzersiz!.Id, Weight = 60m, Reps = 8 }, Json)).EnsureSuccessStatusCode();

        var gecmisYaniti = await c.GetAsync($"/api/users/{bAdi}/history");
        Assert.Equal(HttpStatusCode.OK, gecmisYaniti.StatusCode);
        using var gecmis = JsonDocument.Parse(await gecmisYaniti.Content.ReadAsStringAsync());
        Assert.Empty(gecmis.RootElement.GetProperty("items").EnumerateArray());

        using var rekorlar = JsonDocument.Parse(await c.GetStringAsync($"/api/users/{bAdi}/records"));
        Assert.Equal(1, rekorlar.RootElement.GetArrayLength());
    }

    /// <summary>Pasif ya da olmayan hedef 404.</summary>
    [Fact]
    public async Task Pasif_ya_da_olmayan_hedef_404()
    {
        var (c, _) = await RegisteredClientAsync();

        var yanit = await c.GetAsync($"/api/users/yok_{Guid.NewGuid():N}/history");
        Assert.Equal(HttpStatusCode.NotFound, yanit.StatusCode);
    }
}
