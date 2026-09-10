using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.BodyWeight;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca: gerçek uygulama, gerçek JWT, gerçek saat. Gün sınırı ve ortalama derinliği
/// servis testlerinde sahte saatle sınanıyor; burada HTTP sözleşmesi (durum kodları, zarf,
/// Location, model doğrulaması) sabitleniyor.
/// </summary>
[Trait("Category", "Database")]
public class BodyWeightEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = $"bw_{Guid.NewGuid():N}"[..20],
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    private static async Task<BodyWeightLogResponse> PostWeightAsync(HttpClient client, decimal weight)
    {
        var response = await client.PostAsJsonAsync("/api/body-weights",
            new CreateBodyWeightRequest { Weight = weight }, Json);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<BodyWeightLogResponse>(Json))!;
    }

    [Theory]
    [InlineData("POST", "/api/body-weights")]
    [InlineData("GET", "/api/body-weights")]
    [InlineData("GET", "/api/body-weights/1")]
    [InlineData("PATCH", "/api/body-weights/1")]
    [InlineData("DELETE", "/api/body-weights/1")]
    [InlineData("GET", "/api/stats/body-weight-trend")]
    public async Task Tokensiz_istekler_401_verir(string method, string path)
    {
        var response = await factory.CreateClient()
            .SendAsync(new HttpRequestMessage(new HttpMethod(method), path));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Tarti_201_ve_Location_doner()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/body-weights",
            new CreateBodyWeightRequest { Weight = 82.4m }, Json);
        var eklenen = await response.Content.ReadFromJsonAsync<BodyWeightLogResponse>(Json);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(82.4m, eklenen!.Weight);
        Assert.EndsWith($"/api/body-weights/{eklenen.Id}", response.Headers.Location!.ToString());
    }

    [Fact]
    public async Task Liste_zarfi_yeniden_eskiye_doner()
    {
        var client = await AuthenticatedClientAsync();
        await PostWeightAsync(client, 82.4m);
        var ikinci = await PostWeightAsync(client, 82.1m);

        var sayfa = await client.GetFromJsonAsync<PagedResponse<BodyWeightLogResponse>>(
            "/api/body-weights", Json);

        Assert.Equal(2, sayfa!.TotalCount);
        Assert.Equal(ikinci.Id, sayfa.Items[0].Id);
        Assert.Equal(1, sayfa.TotalPages);
    }

    /// <summary>
    /// "Gönderilmeyen alan korunur" iki kez VERİTABANINDAN okunarak karşılaştırılıyor: POST
    /// yanıtındaki zaman .NET'in 100 ns hassasiyetinde, PostgreSQL ise mikrosaniyeye keser —
    /// POST yanıtıyla GET yanıtını karşılaştırmak rastgele kırmızıya dönerdi.
    /// </summary>
    [Fact]
    public async Task Patch_kiloyu_duzeltir_ve_zamani_korur()
    {
        var client = await AuthenticatedClientAsync();
        var eklenen = await PostWeightAsync(client, 82.4m);
        var once = await client.GetFromJsonAsync<BodyWeightLogResponse>(
            $"/api/body-weights/{eklenen.Id}", Json);

        var response = await client.PatchAsJsonAsync(
            $"/api/body-weights/{eklenen.Id}", new PatchBodyWeightRequest { Weight = 81.9m }, Json);
        var sonra = await client.GetFromJsonAsync<BodyWeightLogResponse>(
            $"/api/body-weights/{eklenen.Id}", Json);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(81.9m, sonra!.Weight);
        Assert.Equal(once!.RecordedAt, sonra.RecordedAt);
    }

    [Fact]
    public async Task Silinen_kayit_404_verir()
    {
        var client = await AuthenticatedClientAsync();
        var eklenen = await PostWeightAsync(client, 82.4m);

        var silme = await client.DeleteAsync($"/api/body-weights/{eklenen.Id}");
        var okuma = await client.GetAsync($"/api/body-weights/{eklenen.Id}");

        Assert.Equal(HttpStatusCode.NoContent, silme.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, okuma.StatusCode);
    }

    /// <summary>IDOR, HTTP katmanında her fiilde: başkasının kaydı 404 — varlığı doğrulanmaz.</summary>
    [Fact]
    public async Task Baskasinin_kaydi_her_fiilde_404_verir()
    {
        var sahip = await AuthenticatedClientAsync();
        var eklenen = await PostWeightAsync(sahip, 82.4m);

        var davetsiz = await AuthenticatedClientAsync();

        Assert.Equal(HttpStatusCode.NotFound,
            (await davetsiz.GetAsync($"/api/body-weights/{eklenen.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await davetsiz.PatchAsJsonAsync($"/api/body-weights/{eklenen.Id}",
                new PatchBodyWeightRequest { Weight = 1m }, Json)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await davetsiz.DeleteAsync($"/api/body-weights/{eklenen.Id}")).StatusCode);
    }

    /// <summary>0 kg modelde reddedilir — veritabanı kısıtına (500) hiç ulaşmaz.</summary>
    [Fact]
    public async Task Sifir_kilo_400_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/body-weights",
            new CreateBodyWeightRequest { Weight = 0m }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Uc_ondalikli_kilo_400_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/body-weights",
            new CreateBodyWeightRequest { Weight = 82.455m }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Gelecek_zaman_400_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/body-weights", new CreateBodyWeightRequest
        {
            Weight = 82.4m,
            RecordedAt = DateTimeOffset.UtcNow.AddDays(1)
        }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Karsilastirma_kilo_ve_hacmi_iki_seride_doner()
    {
        var client = await AuthenticatedClientAsync();
        await PostWeightAsync(client, 82.4m);

        var egzersiz = await client.PostAsJsonAsync("/api/exercises", new CreateExerciseRequest
        {
            Name = $"Egzersiz {Guid.NewGuid():N}",
            Category = ExerciseCategory.Push
        }, Json);
        egzersiz.EnsureSuccessStatusCode();
        var exerciseId = (await egzersiz.Content.ReadFromJsonAsync<ExerciseResponse>(Json))!.Id;
        (await client.PostAsJsonAsync("/api/sets",
            new CreateSetRequest { ExerciseId = exerciseId, Weight = 100m, Reps = 8 }, Json))
            .EnsureSuccessStatusCode();

        var trend = await client.GetFromJsonAsync<BodyWeightTrendResponse>(
            "/api/stats/body-weight-trend", Json);

        Assert.Equal(82.4m, Assert.Single(trend!.BodyWeight).Weight);
        Assert.Equal(800m, Assert.Single(trend.Volume).Volume);
    }
}
