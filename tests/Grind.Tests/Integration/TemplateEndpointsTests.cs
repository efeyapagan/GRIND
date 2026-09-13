using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Template;

namespace Grind.Tests.Integration;

[Trait("Category", "Database")]
public class TemplateEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static string UniqueName() => $"Sablon {Guid.NewGuid():N}";

    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = $"tp_{Guid.NewGuid():N}"[..20],
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    private static CreateTemplateRequest Create(string name) => new()
    {
        Name = name,
        Exercises = [new TemplateExerciseRequest { ExerciseId = 1, PlannedSets = 4 }]
    };

    [Fact]
    public async Task Tokensiz_listeleme_401_verir()
    {
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await factory.CreateClient().GetAsync("/api/templates")).StatusCode);
    }

    [Fact]
    public async Task Olusturulan_sablon_listede_ve_detayda_gorunur()
    {
        var client = await AuthenticatedClientAsync();
        var name = UniqueName();

        var created = await client.PostAsJsonAsync("/api/templates", Create(name), Json);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var olusan = await created.Content.ReadFromJsonAsync<TemplateResponse>(Json);

        var detay = await client.GetFromJsonAsync<TemplateResponse>($"/api/templates/{olusan!.Id}", Json);
        var liste = await client.GetFromJsonAsync<List<TemplateResponse>>("/api/templates", Json);

        Assert.Equal(name, detay!.Name);
        Assert.Single(detay.Exercises);
        Assert.Equal("Bench Press", detay.Exercises[0].ExerciseName);
        // Faz 5 dersi: liste de egzersizleriyle DOLU gelir, boş dizi değil.
        Assert.Contains(liste!, t => t.Id == olusan.Id && t.Exercises.Count == 1);
    }

    /// <summary>
    /// İç eleman doğrulamasının GERÇEKTEN çalıştığının tek kanıtı bu. Birim testte
    /// Validator.TryValidateObject listeye girmiyor (deneyle ölçüldü), MVC'nin doğrulayıcısı
    /// giriyor — bu test o farkı kapatıyor.
    /// </summary>
    [Fact]
    public async Task Gecersiz_plannedSets_400_verir()
    {
        var client = await AuthenticatedClientAsync();
        var payload = new StringContent(
            $$"""{"name":"{{UniqueName()}}","exercises":[{"exerciseId":1,"plannedSets":0}]}""",
            Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/api/templates", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("plannedSets", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RestSeconds_gidip_gelir_gonderilmezse_90_olur()
    {
        var client = await AuthenticatedClientAsync();
        var payload = new StringContent(
            $$"""{"name":"{{UniqueName()}}","exercises":[{"exerciseId":1,"plannedSets":4,"restSeconds":180},{"exerciseId":11,"plannedSets":3}]}""",
            Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/api/templates", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var olusan = await response.Content.ReadFromJsonAsync<TemplateResponse>(Json);
        Assert.Equal([180, 90], olusan!.Exercises.Select(e => e.RestSeconds));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(901)]
    public async Task Aralik_disi_restSeconds_400_verir(int restSeconds)
    {
        var client = await AuthenticatedClientAsync();
        var payload = new StringContent(
            $$"""{"name":"{{UniqueName()}}","exercises":[{"exerciseId":1,"plannedSets":4,"restSeconds":{{restSeconds}}}]}""",
            Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/api/templates", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("restSeconds", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Baska_kullanicinin_sablonu_404_verir()
    {
        var birinci = await AuthenticatedClientAsync();
        var created = await birinci.PostAsJsonAsync("/api/templates", Create(UniqueName()), Json);
        var olusan = await created.Content.ReadFromJsonAsync<TemplateResponse>(Json);

        var ikinci = await AuthenticatedClientAsync();

        Assert.Equal(HttpStatusCode.NotFound,
            (await ikinci.GetAsync($"/api/templates/{olusan!.Id}")).StatusCode);
    }

    [Fact]
    public async Task Patch_yalnizca_adi_degistirir_listeyi_korur()
    {
        var client = await AuthenticatedClientAsync();
        var created = await client.PostAsJsonAsync("/api/templates", Create(UniqueName()), Json);
        var olusan = await created.Content.ReadFromJsonAsync<TemplateResponse>(Json);
        var yeniAd = UniqueName();

        var response = await client.PatchAsync($"/api/templates/{olusan!.Id}",
            new StringContent($$"""{"name":"{{yeniAd}}"}""", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var guncel = await response.Content.ReadFromJsonAsync<TemplateResponse>(Json);
        Assert.Equal(yeniAd, guncel!.Name);
        Assert.Single(guncel.Exercises);
    }

    /// <summary>
    /// "exercises" alanı JSON'dan tamamen ATLANMIŞ (açık null değil) — tam da istemcinin en
    /// olası hatası. Tipli bir DTO bu senaryoyu ifade edemez (System.Text.Json eksik alanı
    /// initializer'ıyla doldurur), bu yüzden ham JSON gövdesi gerekiyor. Bu, "PUT ile
    /// exercises göndermeyi unutursan listen sessizce boşalır" regresyonunun canlı kanıtı.
    /// </summary>
    [Fact]
    public async Task Put_exercises_atlanirsa_400_verir()
    {
        var client = await AuthenticatedClientAsync();
        var created = await client.PostAsJsonAsync("/api/templates", Create(UniqueName()), Json);
        var olusan = await created.Content.ReadFromJsonAsync<TemplateResponse>(Json);

        var payload = new StringContent(
            $$"""{"name":"{{UniqueName()}}"}""", Encoding.UTF8, "application/json");
        var response = await client.PutAsync($"/api/templates/{olusan!.Id}", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Exercises", await response.Content.ReadAsStringAsync());

        // Liste hâlâ yerinde olmalı — reddedilen istek hiçbir şeyi değiştirmemeli.
        var sonra = await client.GetFromJsonAsync<TemplateResponse>($"/api/templates/{olusan.Id}", Json);
        Assert.Single(sonra!.Exercises);
    }

    /// <summary>Açıkça boş liste ("exercises": []) atlanmış alandan FARKLI — meşru bir istek,
    /// listeyi bilerek boşaltır ve 200 dönmeli.</summary>
    [Fact]
    public async Task Put_bos_exercises_listesiyle_200_ve_bos_liste_doner()
    {
        var client = await AuthenticatedClientAsync();
        var created = await client.PostAsJsonAsync("/api/templates", Create(UniqueName()), Json);
        var olusan = await created.Content.ReadFromJsonAsync<TemplateResponse>(Json);

        var payload = new StringContent(
            $$"""{"name":"{{UniqueName()}}","exercises":[]}""", Encoding.UTF8, "application/json");
        var response = await client.PutAsync($"/api/templates/{olusan!.Id}", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var guncel = await response.Content.ReadFromJsonAsync<TemplateResponse>(Json);
        Assert.Empty(guncel!.Exercises);
    }

    [Fact]
    public async Task Silinen_sablon_sonrasinda_404_verir()
    {
        var client = await AuthenticatedClientAsync();
        var created = await client.PostAsJsonAsync("/api/templates", Create(UniqueName()), Json);
        var olusan = await created.Content.ReadFromJsonAsync<TemplateResponse>(Json);

        var silme = await client.DeleteAsync($"/api/templates/{olusan!.Id}");
        var sonra = await client.GetAsync($"/api/templates/{olusan.Id}");

        Assert.Equal(HttpStatusCode.NoContent, silme.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, sonra.StatusCode);
    }
}
