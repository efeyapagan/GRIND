using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Session;
using Grind.Api.Models.Dtos.Template;

namespace Grind.Tests.Integration;

[Trait("Category", "Database")]
public class SessionEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = $"ss_{Guid.NewGuid():N}"[..20],
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    [Fact]
    public async Task Tokensiz_listeleme_401_verir()
    {
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await factory.CreateClient().GetAsync("/api/sessions")).StatusCode);
    }

    /// <summary>İlk çağrı 201 (yeni), ikinci çağrı 200 (var olan) — idempotent başlatma.</summary>
    [Fact]
    public async Task Baslatma_ilk_cagrida_201_ikincide_200_verir()
    {
        var client = await AuthenticatedClientAsync();

        var ilk = await client.PostAsJsonAsync("/api/sessions", new StartSessionRequest(), Json);
        var ikinci = await client.PostAsJsonAsync("/api/sessions", new StartSessionRequest(), Json);

        Assert.Equal(HttpStatusCode.Created, ilk.StatusCode);
        Assert.Equal(HttpStatusCode.OK, ikinci.StatusCode);

        var a = await ilk.Content.ReadFromJsonAsync<SessionResponse>(Json);
        var b = await ikinci.Content.ReadFromJsonAsync<SessionResponse>(Json);
        Assert.Equal(a!.Id, b!.Id);
    }

    /// <summary>
    /// Zero-byte gövde (Content-Length: 0), model binder tarafından bir varsayılan DTO'ya değil
    /// null'a bağlanır. Şablonsuz/notsuz başlatmak en sık akış olduğu için bu senaryo 400/500
    /// yerine 201 vermeli — controller [FromBody] parametresini nullable alıp `?? new(...)`
    /// ile karşılamalı.
    /// </summary>
    [Fact]
    public async Task Tamamen_bos_govdeyle_baslatma_201_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.PostAsync("/api/sessions",
            new StringContent("", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var olusan = await response.Content.ReadFromJsonAsync<SessionResponse>(Json);
        Assert.True(olusan!.IsOpen);
    }

    private static async Task<TemplateResponse> CreateTemplateAsync(HttpClient client, int plannedSets = 4)
    {
        var response = await client.PostAsJsonAsync("/api/templates", new CreateTemplateRequest
        {
            Name = $"Sablon {Guid.NewGuid():N}",
            Exercises = [new TemplateExerciseRequest { ExerciseId = 1, PlannedSets = plannedSets }]
        }, Json);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<TemplateResponse>(Json))!;
    }

    /// <summary>
    /// FIX 1 REGRESYON TESTİ: eskiden `GET /api/sessions/open`, `WorkoutSessionRepository
    /// .GetOpenSessionStartedBetweenAsync`in Template'i Include etmemesi yüzünden
    /// `templateName: null, progress: []` döndürüyordu — POST ile aynı oturum farklı bir
    /// gövde taşıyordu. Şablonsuz bir oturumla bu ayrım hiç görünmezdi, bu yüzden şablonlu
    /// başlatılıyor.
    /// </summary>
    [Fact]
    public async Task Acik_oturum_ucu_baslatilan_oturumu_dondurur()
    {
        var client = await AuthenticatedClientAsync();
        var sablon = await CreateTemplateAsync(client);

        var baslatma = await client.PostAsJsonAsync("/api/sessions",
            new StartSessionRequest { TemplateId = sablon.Id }, Json);
        var olusan = await baslatma.Content.ReadFromJsonAsync<SessionResponse>(Json);

        var acik = await client.GetFromJsonAsync<SessionResponse>("/api/sessions/open", Json);

        Assert.Equal(olusan!.Id, acik!.Id);
        Assert.True(acik.IsOpen);
        Assert.Equal(sablon.Name, acik.TemplateName);
        Assert.Single(acik.Progress);
        Assert.Equal(4, acik.Progress[0].PlannedSets);
    }

    /// <summary>
    /// FIX 1 REGRESYON TESTİ: liste ucu (`GET /api/sessions`) `templateName`'i taşımalı —
    /// eskiden `WorkoutSessionRepository.GetAllAsync` Template'i Include etmediği için bu
    /// hep null geliyordu. `progress` listede bilerek boş kalır (N+1'den kaçınmak için,
    /// bkz. SessionResponse.Progress doc'u); bu test onu iddia ETMEZ.
    /// </summary>
    [Fact]
    public async Task Liste_ucu_sablon_adini_tasir()
    {
        var client = await AuthenticatedClientAsync();
        var sablon = await CreateTemplateAsync(client);
        await client.PostAsJsonAsync("/api/sessions", new StartSessionRequest { TemplateId = sablon.Id }, Json);

        var liste = await client.GetFromJsonAsync<List<SessionResponse>>("/api/sessions", Json);

        var oturum = Assert.Single(liste!);
        Assert.Equal(sablon.Id, oturum.TemplateId);
        Assert.Equal(sablon.Name, oturum.TemplateName);
    }

    [Fact]
    public async Task Acik_oturum_yokken_open_ucu_404_verir()
    {
        var client = await AuthenticatedClientAsync();

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/sessions/open")).StatusCode);
    }

    [Fact]
    public async Task Bitirme_200_tekrar_bitirme_409_verir()
    {
        var client = await AuthenticatedClientAsync();
        var baslatma = await client.PostAsJsonAsync("/api/sessions", new StartSessionRequest(), Json);
        var olusan = await baslatma.Content.ReadFromJsonAsync<SessionResponse>(Json);

        var ilk = await client.PostAsync($"/api/sessions/{olusan!.Id}/finish", null);
        var ikinci = await client.PostAsync($"/api/sessions/{olusan.Id}/finish", null);

        Assert.Equal(HttpStatusCode.OK, ilk.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, ikinci.StatusCode);
    }

    [Fact]
    public async Task Baska_kullanicinin_oturumu_404_verir()
    {
        var birinci = await AuthenticatedClientAsync();
        var baslatma = await birinci.PostAsJsonAsync("/api/sessions", new StartSessionRequest(), Json);
        var olusan = await baslatma.Content.ReadFromJsonAsync<SessionResponse>(Json);

        var ikinci = await AuthenticatedClientAsync();

        Assert.Equal(HttpStatusCode.NotFound,
            (await ikinci.GetAsync($"/api/sessions/{olusan!.Id}")).StatusCode);
    }

    [Fact]
    public async Task Not_guncellenebilir()
    {
        var client = await AuthenticatedClientAsync();
        var baslatma = await client.PostAsJsonAsync("/api/sessions", new StartSessionRequest(), Json);
        var olusan = await baslatma.Content.ReadFromJsonAsync<SessionResponse>(Json);

        var response = await client.PatchAsync($"/api/sessions/{olusan!.Id}",
            new StringContent("""{"notes":"Guclu hissettim"}""", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var guncel = await response.Content.ReadFromJsonAsync<SessionResponse>(Json);
        Assert.Equal("Guclu hissettim", guncel!.Notes);
    }

    [Fact]
    public async Task Silinen_oturum_sonrasinda_404_verir()
    {
        var client = await AuthenticatedClientAsync();
        var baslatma = await client.PostAsJsonAsync("/api/sessions", new StartSessionRequest(), Json);
        var olusan = await baslatma.Content.ReadFromJsonAsync<SessionResponse>(Json);

        var silme = await client.DeleteAsync($"/api/sessions/{olusan!.Id}");
        var sonra = await client.GetAsync($"/api/sessions/{olusan.Id}");

        Assert.Equal(HttpStatusCode.NoContent, silme.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, sonra.StatusCode);
    }
}
