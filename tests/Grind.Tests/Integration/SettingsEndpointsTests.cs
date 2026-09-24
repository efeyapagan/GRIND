using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Profile;
using Grind.Api.Models.Dtos.Settings;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca (#97): haftalık hedef şifre İSTEMEZ (profil ucunun aksine — bir hedef hassas bir hesap
/// işlemi değil). Kimlik token'dan gelir; hedef takvim yanıtından okunur.
/// </summary>
[Trait("Category", "Database")]
public class SettingsEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<HttpClient> RegisteredClientAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = $"hedef_{Guid.NewGuid():N}"[..20],
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    [Fact]
    public async Task Haftalik_hedef_ayarlanir_takvimde_gorunur_ve_kaldirilabilir()
    {
        var client = await RegisteredClientAsync();

        var ayarla = await client.PutAsJsonAsync("/api/settings/weekly-target",
            new UpdateWeeklyTargetRequest { WeeklyTargetDays = 4 });
        Assert.Equal(HttpStatusCode.NoContent, ayarla.StatusCode);

        var takvim = await client.GetFromJsonAsync<CalendarResponse>("/api/stats/calendar");
        Assert.Equal(4, takvim!.WeeklyTargetDays);
        Assert.Equal(0, takvim.CurrentTargetStreak);
        Assert.Equal(0, takvim.ThisWeekTrainedDays);

        var kaldir = await client.PutAsJsonAsync("/api/settings/weekly-target",
            new UpdateWeeklyTargetRequest { WeeklyTargetDays = null });
        Assert.Equal(HttpStatusCode.NoContent, kaldir.StatusCode);

        takvim = await client.GetFromJsonAsync<CalendarResponse>("/api/stats/calendar");
        Assert.Null(takvim!.WeeklyTargetDays);
        Assert.Null(takvim.CurrentTargetStreak);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(8)]
    public async Task Bir_ile_yedi_disindaki_hedef_400_doner(int hedef)
    {
        var client = await RegisteredClientAsync();

        var response = await client.PutAsJsonAsync("/api/settings/weekly-target",
            new UpdateWeeklyTargetRequest { WeeklyTargetDays = hedef });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData(PrivacyLevel.Acik)]
    [InlineData(PrivacyLevel.Kisitli)]
    [InlineData(PrivacyLevel.Gizli)]
    public async Task Gizlilik_seviyesi_ayarlanir_ve_profilde_gorunur(PrivacyLevel seviye)
    {
        var client = await RegisteredClientAsync();

        var ayarla = await client.PutAsJsonAsync("/api/settings/privacy-level",
            new UpdatePrivacyLevelRequest { PrivacyLevel = seviye });
        Assert.Equal(HttpStatusCode.NoContent, ayarla.StatusCode);

        var profil = await client.GetFromJsonAsync<ProfileResponse>("/api/profile", Json);
        Assert.Equal(seviye, profil!.PrivacyLevel);
    }

    [Fact]
    public async Task Gecersiz_gizlilik_seviyesi_400_doner()
    {
        var client = await RegisteredClientAsync();

        using var govde = new StringContent(
            "{\"privacyLevel\":\"Yok\"}", System.Text.Encoding.UTF8, "application/json");
        var response = await client.PutAsync("/api/settings/privacy-level", govde);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
