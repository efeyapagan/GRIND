using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Cardio;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Dtos.Notification;
using Grind.Api.Models.Dtos.Record;
using Grind.Api.Models.Dtos.Session;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Integration;

/// <summary>#647: kardiyo kaydının akışı uçtan uca — Başlat, Durdur, arka kapı, rekor, geçmiş, bildirim.</summary>
[Trait("Category", "Database")]
public class CardioEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private const long Treadmill = 193;
    private const long BenchPress = 1;

    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<(HttpClient Client, string Username)> RegisteredClientAsync()
    {
        var client = factory.CreateClient();
        var username = $"kd_{Guid.NewGuid():N}"[..20];
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

    private static async Task<long> StartSessionAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/sessions", new StartSessionRequest(), Json);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<SessionResponse>(Json))!.Id;
    }

    private static Task<HttpResponseMessage> StartCardioAsync(
        HttpClient client, long sessionId, DateTimeOffset startedAt, long exerciseId = Treadmill, decimal? speed = 9m)
        => client.PostAsJsonAsync($"/api/sessions/{sessionId}/cardio", new StartCardioRequest
        {
            ExerciseId = exerciseId,
            ClientStartedAt = startedAt,
            SpeedKmh = speed
        }, Json);

    private static async Task<CardioEntryResponse> StartedAsync(HttpClient client, long sessionId, DateTimeOffset startedAt)
    {
        var response = await StartCardioAsync(client, sessionId, startedAt);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<CardioEntryResponse>(Json))!;
    }

    private static async Task<CardioEntryResponse> StopAsync(
        HttpClient client, long id, DateTimeOffset stoppedAt, decimal? distance)
    {
        var response = await client.PostAsJsonAsync($"/api/cardio/{id}/stop", new StopCardioRequest
        {
            ClientStoppedAt = stoppedAt,
            SpeedKmh = 9m,
            DistanceKm = distance
        }, Json);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<CardioEntryResponse>(Json))!;
    }

    private static async Task FinishAsync(HttpClient client, long sessionId, DateTimeOffset endedAt)
    {
        var response = await client.PostAsJsonAsync(
            $"/api/sessions/{sessionId}/finish", new FinishSessionRequest { ClientEndedAt = endedAt }, Json);
        response.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Baslat_ve_durdur_sureyi_hesaplar_ve_rekoru_dondurur()
    {
        var (client, _) = await RegisteredClientAsync();
        var sessionId = await StartSessionAsync(client);
        var simdi = DateTimeOffset.UtcNow;

        var akan = await StartedAsync(client, sessionId, simdi.AddMinutes(-20));
        Assert.Null(akan.DurationSeconds);

        var biten = await StopAsync(client, akan.Id, simdi, 3.2m);

        Assert.Equal(1200, biten.DurationSeconds);
        Assert.Equal((3.2m, 9m), (biten.DistanceKm!.Value, biten.SpeedKmh!.Value));
        Assert.True(biten.IsDurationRecord);
        Assert.True(biten.IsDistanceRecord);
    }

    [Fact]
    public async Task Akan_kardiyo_varken_ikincisini_baslatmak_409_verir()
    {
        var (client, _) = await RegisteredClientAsync();
        var sessionId = await StartSessionAsync(client);
        await StartedAsync(client, sessionId, DateTimeOffset.UtcNow.AddMinutes(-5));

        var ikinci = await StartCardioAsync(client, sessionId, DateTimeOffset.UtcNow);

        Assert.Equal(HttpStatusCode.Conflict, ikinci.StatusCode);
    }

    [Fact]
    public async Task Bitmis_antrenmanda_kardiyo_baslatmak_409_verir()
    {
        var (client, _) = await RegisteredClientAsync();
        var sessionId = await StartSessionAsync(client);
        await FinishAsync(client, sessionId, DateTimeOffset.UtcNow);

        var yanit = await StartCardioAsync(client, sessionId, DateTimeOffset.UtcNow);

        Assert.Equal(HttpStatusCode.Conflict, yanit.StatusCode);
    }

    [Fact]
    public async Task Baskasinin_antrenmani_ve_kaydi_404_verir()
    {
        var (sahip, _) = await RegisteredClientAsync();
        var (yabanci, _) = await RegisteredClientAsync();
        var sessionId = await StartSessionAsync(sahip);
        var kayit = await StartedAsync(sahip, sessionId, DateTimeOffset.UtcNow.AddMinutes(-5));

        Assert.Equal(HttpStatusCode.NotFound, (await StartCardioAsync(yabanci, sessionId, DateTimeOffset.UtcNow)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await yabanci.GetAsync($"/api/sessions/{sessionId}/cardio")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await yabanci.PostAsJsonAsync($"/api/cardio/{kayit.Id}/stop", new StopCardioRequest(), Json)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await yabanci.DeleteAsync($"/api/cardio/{kayit.Id}")).StatusCode);
    }

    [Fact]
    public async Task Kilolu_harekete_kardiyo_kardiyo_harekete_set_400_verir()
    {
        var (client, _) = await RegisteredClientAsync();
        var sessionId = await StartSessionAsync(client);

        var kardiyo = await StartCardioAsync(client, sessionId, DateTimeOffset.UtcNow, BenchPress, speed: null);
        var set = await client.PostAsJsonAsync(
            $"/api/sessions/{sessionId}/sets", new CreateSetRequest { ExerciseId = Treadmill, DurationSeconds = 600 }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, kardiyo.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, set.StatusCode);
    }

    /// <summary>Arka kapı: Durdur'a basılmadan antrenman bitirilirse kardiyo bitiş anında kapanır.</summary>
    [Fact]
    public async Task Antrenmani_bitirmek_akan_kardiyoyu_bitis_aniyla_kapatir()
    {
        var (client, _) = await RegisteredClientAsync();
        var sessionId = await StartSessionAsync(client);
        var simdi = DateTimeOffset.UtcNow;
        await StartedAsync(client, sessionId, simdi.AddMinutes(-15));

        await FinishAsync(client, sessionId, simdi);

        var kayit = Assert.Single((await client.GetFromJsonAsync<List<CardioEntryResponse>>($"/api/sessions/{sessionId}/cardio", Json))!);
        Assert.Equal(900, kayit.DurationSeconds);
        Assert.True(kayit.IsDurationRecord);
    }

    [Fact]
    public async Task Silme_rekorlari_yeniden_tarar()
    {
        var (client, _) = await RegisteredClientAsync();
        var sessionId = await StartSessionAsync(client);
        var simdi = DateTimeOffset.UtcNow;

        var ilk = await StartedAsync(client, sessionId, simdi.AddMinutes(-60));
        await StopAsync(client, ilk.Id, simdi.AddMinutes(-30), 5m);
        var ikinci = await StartedAsync(client, sessionId, simdi.AddMinutes(-20));
        var ikinciBiten = await StopAsync(client, ikinci.Id, simdi.AddMinutes(-10), 2m);
        Assert.False(ikinciBiten.IsDistanceRecord);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/cardio/{ilk.Id}")).StatusCode);

        var kalan = Assert.Single((await client.GetFromJsonAsync<List<CardioEntryResponse>>($"/api/sessions/{sessionId}/cardio", Json))!);
        Assert.True(kalan.IsDistanceRecord);
        Assert.True(kalan.IsDurationRecord);
    }

    [Fact]
    public async Task Duzeltme_rekorlari_yeniden_tarar_ve_akan_kayit_409_verir()
    {
        var (client, _) = await RegisteredClientAsync();
        var sessionId = await StartSessionAsync(client);
        var simdi = DateTimeOffset.UtcNow;
        var ilk = await StartedAsync(client, sessionId, simdi.AddMinutes(-60));
        await StopAsync(client, ilk.Id, simdi.AddMinutes(-30), 5m);
        var ikinci = await StartedAsync(client, sessionId, simdi.AddMinutes(-20));

        var akanDuzeltme = await client.PutAsJsonAsync($"/api/cardio/{ikinci.Id}", new UpdateCardioRequest { DurationSeconds = 60 }, Json);
        Assert.Equal(HttpStatusCode.Conflict, akanDuzeltme.StatusCode);

        await StopAsync(client, ikinci.Id, simdi.AddMinutes(-10), 2m);
        var duzeltilen = await client.PutAsJsonAsync(
            $"/api/cardio/{ikinci.Id}", new UpdateCardioRequest { DurationSeconds = 600, DistanceKm = 6m }, Json);

        Assert.Equal(HttpStatusCode.OK, duzeltilen.StatusCode);
        Assert.True((await duzeltilen.Content.ReadFromJsonAsync<CardioEntryResponse>(Json))!.IsDistanceRecord);
    }

    /// <summary>Yalnızca kardiyo yapılmış antrenman boş değildir: bitirilir, takvimde antrenman günüdür.</summary>
    [Fact]
    public async Task Yalnizca_kardiyolu_antrenman_bitirilir_ve_antrenman_gunu_sayilir()
    {
        var (client, _) = await RegisteredClientAsync();
        var sessionId = await StartSessionAsync(client);
        var simdi = DateTimeOffset.UtcNow;
        var kayit = await StartedAsync(client, sessionId, simdi.AddMinutes(-20));
        await StopAsync(client, kayit.Id, simdi.AddMinutes(-1), null);

        await FinishAsync(client, sessionId, simdi);

        var takvim = await client.GetFromJsonAsync<CalendarResponse>("/api/stats/calendar", Json);
        Assert.Equal(1, takvim!.TrainedDayCount);
        var oturum = await client.GetFromJsonAsync<SessionResponse>($"/api/sessions/{sessionId}", Json);
        Assert.Equal(1, Assert.Single(oturum!.Progress).CompletedSets);
    }

    [Fact]
    public async Task Gecmis_ve_arkadasin_gecmisi_kardiyoyu_antrenmanin_icinde_tasir()
    {
        var (sahip, sahipAdi) = await RegisteredClientAsync();
        var (izleyen, _) = await RegisteredClientAsync();
        var sessionId = await StartSessionAsync(sahip);
        var simdi = DateTimeOffset.UtcNow;
        var kayit = await StartedAsync(sahip, sessionId, simdi.AddMinutes(-20));
        await StopAsync(sahip, kayit.Id, simdi.AddMinutes(-1), 3m);
        await FinishAsync(sahip, sessionId, simdi);

        var kendi = await sahip.GetFromJsonAsync<PagedResponseDto<HistorySessionResponse>>("/api/history", Json);
        var arkadas = await izleyen.GetFromJsonAsync<PagedResponseDto<FriendHistorySessionResponse>>(
            $"/api/users/{sahipAdi}/history", Json);

        Assert.Equal(3m, Assert.Single(Assert.Single(kendi!.Items).Cardio).DistanceKm);
        Assert.Equal(3m, Assert.Single(Assert.Single(arkadas!.Items).Cardio).DistanceKm);
    }

    [Fact]
    public async Task Rekorlar_ozeti_en_uzun_sureyi_ve_mesafeyi_gosterir()
    {
        var (client, _) = await RegisteredClientAsync();
        var sessionId = await StartSessionAsync(client);
        var simdi = DateTimeOffset.UtcNow;
        var uzun = await StartedAsync(client, sessionId, simdi.AddMinutes(-60));
        await StopAsync(client, uzun.Id, simdi.AddMinutes(-30), 4m);
        var uzak = await StartedAsync(client, sessionId, simdi.AddMinutes(-20));
        await StopAsync(client, uzak.Id, simdi.AddMinutes(-10), 4.5m);

        var rekorlar = await client.GetFromJsonAsync<List<ExerciseRecordResponse>>("/api/records", Json);

        var kosu = Assert.Single(rekorlar!, r => r.ExerciseId == Treadmill);
        Assert.Equal((1800, 4.5m), (kosu.BestDurationSeconds!.Value, kosu.BestDistanceKm!.Value));
    }

    [Fact]
    public async Task Kardiyo_rekoru_olan_antrenman_rekor_bildirimi_uretir()
    {
        var (sahip, sahipAdi) = await RegisteredClientAsync();
        var (takipci, _) = await RegisteredClientAsync();
        Assert.Equal(HttpStatusCode.NoContent, (await takipci.PostAsync($"/api/users/{sahipAdi}/follow", null)).StatusCode);

        var sessionId = await StartSessionAsync(sahip);
        var simdi = DateTimeOffset.UtcNow;
        var kayit = await StartedAsync(sahip, sessionId, simdi.AddMinutes(-20));
        await StopAsync(sahip, kayit.Id, simdi.AddMinutes(-1), 5.2m);
        await FinishAsync(sahip, sessionId, simdi);

        var bildirimler = await takipci.GetFromJsonAsync<List<NotificationResponse>>("/api/notifications", Json);

        var rekor = Assert.Single(Assert.Single(bildirimler!, b => b.Kind == NotificationKind.Records).Records!);
        Assert.Equal((Treadmill, RecordType.Distance, 5.2m), (rekor.ExerciseId, rekor.RecordType, rekor.DistanceKm!.Value));
    }

    private sealed record PagedResponseDto<T>(List<T> Items);
}
