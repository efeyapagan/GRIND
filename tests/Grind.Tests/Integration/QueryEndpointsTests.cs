using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Dtos.Session;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca: uygulama gerçekten ayağa kalkar, JWT üretilir, veriler POST /api/sets ile girilir.
/// Geçmişe dönük veri girişi API'de YOK (Faz 8 kararı), bu yüzden buradaki senaryolar BUGÜNE
/// aittir; gün sınırı ve seri derinliği servis/birim testlerinde sahte saatle sınanır.
/// </summary>
[Trait("Category", "Database")]
public class QueryEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = $"qe_{Guid.NewGuid():N}"[..20],
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    private static async Task<long> CreateExerciseAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/exercises", new CreateExerciseRequest
        {
            Name = $"Egzersiz {Guid.NewGuid():N}",
            Category = ExerciseCategory.Push
        }, Json);
        response.EnsureSuccessStatusCode();
        var olusan = await response.Content.ReadFromJsonAsync<ExerciseResponse>(Json);
        return olusan!.Id;
    }

    private static async Task PostSetAsync(HttpClient client, long exerciseId, decimal weight, int reps)
    {
        var response = await client.PostAsJsonAsync("/api/sets",
            new CreateSetRequest { ExerciseId = exerciseId, Weight = weight, Reps = reps }, Json);
        response.EnsureSuccessStatusCode();
    }

    [Theory]
    [InlineData("/api/history")]
    [InlineData("/api/stats/volume/daily")]
    [InlineData("/api/stats/volume/by-exercise")]
    [InlineData("/api/stats/calendar")]
    [InlineData("/api/stats/duration")]
    [InlineData("/api/stats/exercises/1/progress")]
    public async Task Tokensiz_istekler_401_verir(string path)
    {
        var response = await factory.CreateClient().GetAsync(path);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Gecmis_oturumu_setleriyle_ve_toplamiyla_dondurur()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        await PostSetAsync(client, exerciseId, 100m, 8);
        await PostSetAsync(client, exerciseId, 60m, 10);

        var sayfa = await client.GetFromJsonAsync<PagedResponse<HistorySessionResponse>>(
            "/api/history", Json);

        var oturum = Assert.Single(sayfa!.Items);
        Assert.Equal(2, oturum.SetCount);
        Assert.Equal(100m * 8 + 60m * 10, oturum.TotalVolume);
        Assert.Equal(2, oturum.Sets.Count);
        Assert.Equal(1, sayfa.Page);
        Assert.Equal(1, sayfa.TotalCount);
        Assert.Equal(1, sayfa.TotalPages);
    }

    [Fact]
    public async Task Gecmis_baskasinin_oturumlarini_gostermez()
    {
        var sahip = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(sahip);
        await PostSetAsync(sahip, exerciseId, 100m, 8);

        var digerKullanici = await AuthenticatedClientAsync();
        var sayfa = await digerKullanici.GetFromJsonAsync<PagedResponse<HistorySessionResponse>>(
            "/api/history", Json);

        Assert.Empty(sayfa!.Items);
    }

    [Fact]
    public async Task Gecmis_baskasinin_egzersiziyle_filtrelenirse_404_verir()
    {
        var sahip = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(sahip);

        var davetsiz = await AuthenticatedClientAsync();
        var response = await davetsiz.GetAsync($"/api/history?exerciseId={exerciseId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Ters_tarih_araligi_400_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.GetAsync("/api/history?from=2026-03-10&to=2026-03-01");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>Sayfa boyutu sınırı DTO'da: 0 gönderilirse model doğrulaması 400 verir.</summary>
    [Fact]
    public async Task Gecersiz_sayfa_boyutu_400_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.GetAsync("/api/history?pageSize=0");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Gunluk_hacim_bugunun_toplamini_verir()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        await PostSetAsync(client, exerciseId, 100m, 8);

        var ozet = await client.GetFromJsonAsync<VolumeSummaryResponse<DailyVolumeResponse>>(
            "/api/stats/volume/daily", Json);

        var gun = Assert.Single(ozet!.Items);
        Assert.Equal(800m, gun.Volume);
        Assert.Equal(1, gun.SessionCount);
        Assert.Equal(800m, ozet.TotalVolume);
    }

    [Fact]
    public async Task Egzersiz_bazli_hacim_egzersiz_adiyla_doner()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        await PostSetAsync(client, exerciseId, 100m, 8);

        var ozet = await client.GetFromJsonAsync<VolumeSummaryResponse<ExerciseVolumeResponse>>(
            "/api/stats/volume/by-exercise", Json);

        var satir = Assert.Single(ozet!.Items, i => i.ExerciseId == exerciseId);
        Assert.Equal(800m, satir.Volume);
        Assert.Equal(1, satir.SetCount);
        Assert.False(string.IsNullOrWhiteSpace(satir.ExerciseName));
    }

    [Fact]
    public async Task Takvim_bugunu_ve_seriyi_dondurur()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        await PostSetAsync(client, exerciseId, 100m, 8);

        var takvim = await client.GetFromJsonAsync<CalendarResponse>("/api/stats/calendar", Json);

        Assert.Equal(1, takvim!.TrainedDayCount);
        Assert.Equal(1, takvim.CurrentStreak);
        Assert.Equal(1, takvim.LongestStreak);
        Assert.Single(takvim.Days);
    }

    /// <summary>Issue #73: kapanmış oturumun süresi hem /sessions/open hem stats/duration'da tutarlı.</summary>
    [Fact]
    public async Task Sure_ozeti_kapanmis_oturumu_sayar()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        await PostSetAsync(client, exerciseId, 100m, 8);
        var acik = await client.GetFromJsonAsync<SessionResponse>("/api/sessions/open", Json);
        (await client.PostAsync($"/api/sessions/{acik!.Id}/finish", null)).EnsureSuccessStatusCode();

        var ozet = await client.GetFromJsonAsync<DurationSummaryResponse>("/api/stats/duration", Json);

        Assert.Equal(1, ozet!.SessionCount);
        Assert.NotNull(ozet.MedianSeconds);
        Assert.Equal(ozet.MedianSeconds, ozet.TotalSeconds);
    }

    /// <summary>Issue #73 Karar 1: hâlâ açık oturum süre özetine hiç girmez.</summary>
    [Fact]
    public async Task Sure_ozeti_acik_oturumu_saymaz()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        await PostSetAsync(client, exerciseId, 100m, 8);

        var ozet = await client.GetFromJsonAsync<DurationSummaryResponse>("/api/stats/duration", Json);

        Assert.Equal(0, ozet!.SessionCount);
        Assert.Null(ozet.MedianSeconds);
    }

    /// <summary>Hiç antrenmanı olmayan kullanıcı boş özet alır — 404 değil.</summary>
    [Fact]
    public async Task Verisi_olmayan_kullanici_bos_ozet_alir()
    {
        var client = await AuthenticatedClientAsync();

        var takvim = await client.GetFromJsonAsync<CalendarResponse>("/api/stats/calendar", Json);
        var sayfa = await client.GetFromJsonAsync<PagedResponse<HistorySessionResponse>>(
            "/api/history", Json);

        Assert.Empty(takvim!.Days);
        Assert.Equal(0, takvim.CurrentStreak);
        Assert.Empty(sayfa!.Items);
        Assert.Equal(0, sayfa.TotalPages);
    }

    [Fact]
    public async Task Hareket_ilerlemesi_bugunun_noktasini_sunucu_degerleriyle_doner()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        await PostSetAsync(client, exerciseId, 100m, 5);
        await PostSetAsync(client, exerciseId, 100m, 8);

        var sonuc = await client.GetFromJsonAsync<ExerciseProgressResponse>(
            $"/api/stats/exercises/{exerciseId}/progress", Json);

        var nokta = Assert.Single(sonuc!.Points);
        Assert.Equal(100m, nokta.TopWeight);
        Assert.Equal(8, nokta.TopWeightReps);
        Assert.Equal(1300m, nokta.Volume);
        Assert.Equal(2, nokta.SetCount);
        Assert.Equal(124.14m, nokta.EstimatedOneRepMax);
    }

    [Fact]
    public async Task Hareket_ilerlemesi_baskasinin_ozel_egzersizinde_404_verir()
    {
        var sahip = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(sahip);

        var davetsiz = await AuthenticatedClientAsync();
        var response = await davetsiz.GetAsync($"/api/stats/exercises/{exerciseId}/progress");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Hareket_ilerlemesi_ters_aralikta_400_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.GetAsync("/api/stats/exercises/1/progress?from=2026-03-10&to=2026-03-01");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
