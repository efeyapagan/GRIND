using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Settings;
using Grind.Api.Models.Dtos.Stats;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca (#97): haftalık hedef şifre İSTEMEZ (profil ucunun aksine — bir hedef hassas bir hesap
/// işlemi değil). Kimlik token'dan gelir; hedef takvim yanıtından okunur.
/// </summary>
[Trait("Category", "Database")]
public class SettingsEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
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
}
