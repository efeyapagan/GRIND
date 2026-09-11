using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Dtos.Insight;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Enums;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca: gerçek uygulama, gerçek JWT. İki fabrika var:
/// - <see cref="GrindApiFactory"/> gerçek varsayılanı sınar (sağlayıcı KAPALI → 503).
/// - <see cref="SahteAiApiFactory"/> başarı yolunu ağa çıkmadan sınar.
///
/// Veriler POST /api/sets ile BUGÜNE girilir, çünkü API'de geçmişe dönük giriş yok. Varsayılan aralık
/// (son 30 gün) bugünü kapsar. Aralık ve sıralama derinliği servis testlerinde sahte saatle sınanır.
/// </summary>
[Trait("Category", "Database")]
public class AiInsightEndpointsTests(GrindApiFactory kapali, SahteAiApiFactory sahte)
    : IClassFixture<GrindApiFactory>, IClassFixture<SahteAiApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static async Task<HttpClient> AuthenticatedClientAsync(WebApplicationFactory<Program> factory)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = $"ai_{Guid.NewGuid():N}"[..20],
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    /// <summary>Yorumlanacak veri: bugünün açık oturumuna tek bir set.</summary>
    private static async Task PostSetAsync(HttpClient client)
    {
        var exerciseResponse = await client.PostAsJsonAsync("/api/exercises", new CreateExerciseRequest
        {
            Name = $"Göğüs {Guid.NewGuid():N}",
            Category = ExerciseCategory.Push
        }, Json);
        exerciseResponse.EnsureSuccessStatusCode();
        var exercise = (await exerciseResponse.Content.ReadFromJsonAsync<ExerciseResponse>(Json))!;

        var setResponse = await client.PostAsJsonAsync("/api/sets",
            new CreateSetRequest { ExerciseId = exercise.Id, Weight = 100m, Reps = 8 }, Json);
        setResponse.EnsureSuccessStatusCode();
    }

    private static async Task<AiInsightResponse> GenerateAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/insights", new GenerateInsightRequest(), Json);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<AiInsightResponse>(Json))!;
    }

    [Theory]
    [InlineData("POST", "/api/insights")]
    [InlineData("GET", "/api/insights")]
    [InlineData("GET", "/api/insights/1")]
    [InlineData("DELETE", "/api/insights/1")]
    public async Task Tokensiz_istekler_401_verir(string method, string path)
    {
        var response = await kapali.CreateClient()
            .SendAsync(new HttpRequestMessage(new HttpMethod(method), path));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>GERÇEK varsayılan (spec Karar 5): sağlayıcı kapalı → 503, detay korunur, satır yazılmaz.</summary>
    [Fact]
    public async Task Kapali_saglayicida_uretim_503_ve_detay_doner()
    {
        var client = await AuthenticatedClientAsync(kapali);
        await PostSetAsync(client);

        var response = await client.PostAsJsonAsync("/api/insights", new GenerateInsightRequest(), Json);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("AI yorumlama şu an kapalı.", body.GetProperty("detail").GetString());
        var liste = await client.GetFromJsonAsync<PagedResponse<AiInsightResponse>>("/api/insights", Json);
        Assert.Equal(0, liste!.TotalCount);
    }

    [Fact]
    public async Task Uretilen_yorum_201_Location_ve_govdeyle_doner()
    {
        var client = await AuthenticatedClientAsync(sahte);
        await PostSetAsync(client);

        var response = await client.PostAsJsonAsync("/api/insights", new GenerateInsightRequest(), Json);
        var yorum = await response.Content.ReadFromJsonAsync<AiInsightResponse>(Json);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.EndsWith($"/api/insights/{yorum!.Id}", response.Headers.Location!.ToString());
        Assert.Equal(AiInsightKind.Insight, yorum.Kind);
        Assert.Equal(SahteAiApiFactory.SahteIcerik, yorum.Content);
        Assert.Equal(SahteAiApiFactory.SahteModel, yorum.Model);
        Assert.Equal(1500, yorum.TokensUsed);
        Assert.Equal(0.0123m, yorum.EstimatedCostUsd);
        // Varsayılan aralık iki ucu dahil 30 gün. Bugünün tarihine bağlanmaz: gece yarısında kaymasın.
        Assert.Equal(29, yorum.RangeTo!.Value.DayNumber - yorum.RangeFrom!.Value.DayNumber);
    }

    [Fact]
    public async Task Yorum_listelenir_getirilir_ve_silinir()
    {
        var client = await AuthenticatedClientAsync(sahte);
        await PostSetAsync(client);
        var yorum = await GenerateAsync(client);

        var liste = await client.GetFromJsonAsync<PagedResponse<AiInsightResponse>>("/api/insights", Json);
        var getirilen = await client.GetFromJsonAsync<AiInsightResponse>($"/api/insights/{yorum.Id}", Json);
        var silme = await client.DeleteAsync($"/api/insights/{yorum.Id}");
        var sonra = await client.GetAsync($"/api/insights/{yorum.Id}");

        Assert.Equal(yorum.Id, Assert.Single(liste!.Items).Id);
        Assert.Equal(yorum.Content, getirilen!.Content);
        Assert.Equal(HttpStatusCode.NoContent, silme.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, sonra.StatusCode);
    }

    /// <summary>Gövdesiz üretim en sık akış (spec Karar 14): sıfır bayt null'a bağlanır, varsayılana düşer.</summary>
    [Fact]
    public async Task Sifir_baytlik_govdeyle_uretim_201_doner()
    {
        var client = await AuthenticatedClientAsync(sahte);
        await PostSetAsync(client);

        var response = await client.PostAsync("/api/insights",
            new StringContent("", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Verisiz_aralikta_uretim_400_verir()
    {
        var client = await AuthenticatedClientAsync(sahte);

        var response = await client.PostAsJsonAsync("/api/insights", new GenerateInsightRequest(), Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Bu aralıkta yorumlanacak kayıt yok.", body.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Uc_yuz_altmis_yedi_gunluk_aralik_400_verir()
    {
        var client = await AuthenticatedClientAsync(sahte);

        var response = await client.PostAsJsonAsync("/api/insights",
            new GenerateInsightRequest { From = new DateOnly(2024, 1, 1), To = new DateOnly(2025, 1, 1) }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("Foo")]
    [InlineData("7")]
    public async Task Gecersiz_tur_suzgeci_400_verir(string kind)
    {
        var client = await AuthenticatedClientAsync(kapali);

        var response = await client.GetAsync($"/api/insights?kind={kind}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>IDOR: başkasının yorumu okunamaz/silinemez (404), listede yok; sahibininki yerinde kalır.</summary>
    [Fact]
    public async Task Baskasinin_yorumu_okunamaz_silinemez_ve_listede_gorunmez()
    {
        var sahip = await AuthenticatedClientAsync(sahte);
        await PostSetAsync(sahip);
        var yorum = await GenerateAsync(sahip);

        var davetsiz = await AuthenticatedClientAsync(sahte);
        var okuma = await davetsiz.GetAsync($"/api/insights/{yorum.Id}");
        var silme = await davetsiz.DeleteAsync($"/api/insights/{yorum.Id}");
        var liste = await davetsiz.GetFromJsonAsync<PagedResponse<AiInsightResponse>>("/api/insights", Json);

        Assert.Equal(HttpStatusCode.NotFound, okuma.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, silme.StatusCode);
        Assert.Equal(0, liste!.TotalCount);
        Assert.Equal(HttpStatusCode.OK, (await sahip.GetAsync($"/api/insights/{yorum.Id}")).StatusCode);
    }
}
