using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Dtos.Export;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca: veriler POST /api/sets ile girilir. Geçmişe dönük giriş API'de YOK (Faz 8), bu yüzden
/// senaryolar BUGÜNE aittir. Biçim ayrıntıları ExportTextFormatterTests'te, özet tutarlılığı
/// ExportServiceTests'te sınanır.
/// </summary>
[Trait("Category", "Database")]
public class ExportEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = $"ex_{Guid.NewGuid():N}"[..20],
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    /// <summary>Ad Türkçe karakter taşır: metin ucunun UTF-8'i bozmadan taşıdığı da sınanır.</summary>
    private static async Task<ExerciseResponse> CreateExerciseAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/exercises", new CreateExerciseRequest
        {
            Name = $"Göğüs {Guid.NewGuid():N}",
            Category = ExerciseCategory.Push
        }, Json);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ExerciseResponse>(Json))!;
    }

    private static async Task PostSetAsync(HttpClient client, long exerciseId, decimal weight, int reps)
    {
        var response = await client.PostAsJsonAsync("/api/sets",
            new CreateSetRequest { ExerciseId = exerciseId, Weight = weight, Reps = reps }, Json);
        response.EnsureSuccessStatusCode();
    }

    [Theory]
    [InlineData("/api/export/json")]
    [InlineData("/api/export/text")]
    public async Task Tokensiz_istekler_401_verir(string path)
    {
        var response = await factory.CreateClient().GetAsync(path);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Json_export_oturumu_ozeti_ve_rekorlari_dondurur()
    {
        var client = await AuthenticatedClientAsync();
        var exercise = await CreateExerciseAsync(client);
        await PostSetAsync(client, exercise.Id, 100m, 8);
        await PostSetAsync(client, exercise.Id, 60m, 10);

        var export = await client.GetFromJsonAsync<ExportResponse>("/api/export/json", Json);

        var oturum = Assert.Single(export!.Sessions);
        Assert.Equal(2, oturum.Sets.Count);
        Assert.Equal(2, export.Summary.SetCount);
        Assert.Equal(100m * 8 + 60m * 10, export.Summary.TotalVolume);
        Assert.Equal(exercise.Name, Assert.Single(export.AllTimeRecords).ExerciseName);
        Assert.Empty(export.BodyWeights);
        Assert.Null(export.From);   // aralık verilmedi: tüm geçmiş
    }

    [Fact]
    public async Task Metin_export_utf8_duz_metin_doner()
    {
        var client = await AuthenticatedClientAsync();
        var exercise = await CreateExerciseAsync(client);
        await PostSetAsync(client, exercise.Id, 100m, 8);

        var response = await client.GetAsync("/api/export/text");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/plain", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("utf-8", response.Content.Headers.ContentType?.CharSet);
        var metin = await response.Content.ReadAsStringAsync();
        Assert.StartsWith("# GRIND antrenman verisi\n", metin);
        Assert.Contains("Oluşturulma:", metin);
        // "×" ve "ğ/ü" UTF-8 ile bozulmadan gelmeli.
        Assert.Contains($"- {exercise.Name}: 100×8", metin);
    }

    [Theory]
    [InlineData("/api/export/json?from=2026-03-10&to=2026-03-01")]
    [InlineData("/api/export/text?from=2026-03-10&to=2026-03-01")]
    public async Task Ters_tarih_araligi_400_verir(string path)
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.GetAsync(path);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>
    /// AYIRT EDİCİ (spec Karar 10): metin ucuna [Produces("text/plain")] eklenirse bu istek 406'ya
    /// döner, çünkü otomatik 400'ün ValidationProblemDetails'ı text/plain olarak yazılamaz.
    /// </summary>
    [Fact]
    public async Task Metin_ucunda_bozuk_tarih_406_degil_400_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.GetAsync("/api/export/text?from=abc");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Export_baskasinin_verisini_icermez()
    {
        var sahip = await AuthenticatedClientAsync();
        var exercise = await CreateExerciseAsync(sahip);
        await PostSetAsync(sahip, exercise.Id, 100m, 8);

        var davetsiz = await AuthenticatedClientAsync();
        var export = await davetsiz.GetFromJsonAsync<ExportResponse>("/api/export/json", Json);
        var metin = await davetsiz.GetStringAsync("/api/export/text");

        Assert.Empty(export!.Sessions);
        Assert.Empty(export.AllTimeRecords);
        Assert.Equal(0, export.Summary.SetCount);
        Assert.DoesNotContain(exercise.Name, metin);
    }
}
