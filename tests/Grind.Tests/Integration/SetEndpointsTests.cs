using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Dtos.Record;
using Grind.Api.Models.Dtos.Session;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Dtos.Template;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Integration;

[Trait("Category", "Database")]
public class SetEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = $"se_{Guid.NewGuid():N}"[..20],
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    /// <summary>Her testin kendine ait egzersizi olsun — rekorlar birbirine karışmasın.</summary>
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

    private static Task<HttpResponseMessage> PostSetAsync(
        HttpClient client, long exerciseId, decimal weight, int reps) =>
        client.PostAsJsonAsync("/api/sets",
            new CreateSetRequest { ExerciseId = exerciseId, Weight = weight, Reps = reps }, Json);

    [Theory]
    [InlineData("POST", "/api/sets")]
    [InlineData("GET", "/api/sessions/1/sets")]
    [InlineData("PATCH", "/api/sets/1")]
    [InlineData("DELETE", "/api/sets/1")]
    [InlineData("GET", "/api/records")]
    public async Task Tokensiz_istekler_401_verir(string method, string path)
    {
        var response = await factory.CreateClient()
            .SendAsync(new HttpRequestMessage(new HttpMethod(method), path));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Ilk_set_201_ve_agirlik_rekoru_doner()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);

        var response = await PostSetAsync(client, exerciseId, 100m, 8);
        var eklenen = await response.Content.ReadFromJsonAsync<SetEntryResponse>(Json);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(RecordType.Weight, eklenen!.RecordType);
        Assert.True(eklenen.SessionId > 0);
    }

    [Fact]
    public async Task Ayni_agirlikta_daha_cok_tekrar_tekrar_rekoru_doner()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);

        await PostSetAsync(client, exerciseId, 100m, 8);
        var ikinci = await PostSetAsync(client, exerciseId, 100m, 10);
        var eklenen = await ikinci.Content.ReadFromJsonAsync<SetEntryResponse>(Json);

        Assert.Equal(RecordType.Reps, eklenen!.RecordType);
    }

    /// <summary>Spec Soru 1/A: indirme seti rozet almaz.</summary>
    [Fact]
    public async Task Daha_hafif_agirliktaki_ilk_set_rekor_dondurmez()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);

        await PostSetAsync(client, exerciseId, 100m, 8);
        var indirme = await PostSetAsync(client, exerciseId, 60m, 15);
        var eklenen = await indirme.Content.ReadFromJsonAsync<SetEntryResponse>(Json);

        Assert.Equal(RecordType.None, eklenen!.RecordType);
    }

    [Fact]
    public async Task Oturumun_setleri_listelenir()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        var ilk = await (await PostSetAsync(client, exerciseId, 100m, 8))
            .Content.ReadFromJsonAsync<SetEntryResponse>(Json);
        await PostSetAsync(client, exerciseId, 100m, 9);

        var setler = await client.GetFromJsonAsync<List<SetEntryResponse>>(
            $"/api/sessions/{ilk!.SessionId}/sets", Json);

        Assert.Equal(2, setler!.Count);
        Assert.Equal([8, 9], setler.Select(s => s.Reps));
    }

    [Fact]
    public async Task Baskasinin_oturumunun_setleri_404_verir()
    {
        var sahip = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(sahip);
        var set = await (await PostSetAsync(sahip, exerciseId, 100m, 8))
            .Content.ReadFromJsonAsync<SetEntryResponse>(Json);

        var davetsiz = await AuthenticatedClientAsync();
        var response = await davetsiz.GetAsync($"/api/sessions/{set!.SessionId}/sets");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Patch_agirligi_duzeltir_ve_rekoru_yeniden_hesaplar()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        var ilk = await (await PostSetAsync(client, exerciseId, 100m, 8))
            .Content.ReadFromJsonAsync<SetEntryResponse>(Json);
        var ikinci = await (await PostSetAsync(client, exerciseId, 90m, 10))
            .Content.ReadFromJsonAsync<SetEntryResponse>(Json);

        Assert.Equal(RecordType.None, ikinci!.RecordType);

        var response = await client.PatchAsJsonAsync(
            $"/api/sets/{ikinci.Id}", new PatchSetRequest { Weight = 120m }, Json);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var setler = await client.GetFromJsonAsync<List<SetEntryResponse>>(
            $"/api/sessions/{ilk!.SessionId}/sets", Json);

        Assert.Equal(RecordType.Weight, setler!.Single(s => s.Id == ikinci.Id).RecordType);
        Assert.Equal(120m, setler!.Single(s => s.Id == ikinci.Id).Weight);
    }

    [Fact]
    public async Task Rekor_tasiyan_set_silinince_sonraki_set_terfi_eder()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        var ilk = await (await PostSetAsync(client, exerciseId, 100m, 8))
            .Content.ReadFromJsonAsync<SetEntryResponse>(Json);
        var ikinci = await (await PostSetAsync(client, exerciseId, 90m, 10))
            .Content.ReadFromJsonAsync<SetEntryResponse>(Json);

        var silme = await client.DeleteAsync($"/api/sets/{ilk!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, silme.StatusCode);

        var setler = await client.GetFromJsonAsync<List<SetEntryResponse>>(
            $"/api/sessions/{ilk.SessionId}/sets", Json);

        Assert.Equal(RecordType.Weight, Assert.Single(setler!).RecordType);
        Assert.Equal(ikinci!.Id, setler!.Single().Id);
    }

    [Fact]
    public async Task Baskasinin_seti_silinemez_404()
    {
        var sahip = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(sahip);
        var set = await (await PostSetAsync(sahip, exerciseId, 100m, 8))
            .Content.ReadFromJsonAsync<SetEntryResponse>(Json);

        var davetsiz = await AuthenticatedClientAsync();
        var response = await davetsiz.DeleteAsync($"/api/sets/{set!.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Rekor_ozeti_en_iyileri_doner()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        await PostSetAsync(client, exerciseId, 100m, 8);
        await PostSetAsync(client, exerciseId, 60m, 12);
        await PostSetAsync(client, exerciseId, 60m, 25);

        var rekorlar = await client.GetFromJsonAsync<List<ExerciseRecordResponse>>("/api/records", Json);
        var satir = Assert.Single(rekorlar!, r => r.ExerciseId == exerciseId);

        Assert.Equal(100m, satir.BestWeight);
        Assert.Equal(25, satir.BestReps);
        Assert.Equal(60m, satir.BestRepsWeight);
    }

    /// <summary>
    /// KANIT (Finding 1, final inceleme): özet yalnızca rekor taşıyan setleri okursa, 100 kg
    /// zaten varken atılan 60 kg × 15'lik indirme seti None kaldığı için (Soru 1/A) tüm
    /// zamanların en çok tekrarını kaçırır. Özet TÜM setlerden hesaplanmalı.
    /// </summary>
    [Fact]
    public async Task Rekor_ozeti_hafif_agirliktaki_ilk_setin_tekrarini_sayar()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        await PostSetAsync(client, exerciseId, 100m, 8);
        await PostSetAsync(client, exerciseId, 60m, 15);

        var rekorlar = await client.GetFromJsonAsync<List<ExerciseRecordResponse>>("/api/records", Json);
        var satir = Assert.Single(rekorlar!, r => r.ExerciseId == exerciseId);

        Assert.Equal(100m, satir.BestWeight);
        Assert.Equal(15, satir.BestReps);
        Assert.Equal(60m, satir.BestRepsWeight);
    }

    [Fact]
    public async Task Arsivlenmis_egzersize_set_400_verir()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        (await client.DeleteAsync($"/api/exercises/{exerciseId}")).EnsureSuccessStatusCode();

        var response = await PostSetAsync(client, exerciseId, 100m, 8);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Olmayan_egzersize_set_404_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await PostSetAsync(client, 999_999_999, 100m, 8);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    /// <summary>#266: kaydırıcının ara durağı ("2–3 arası") 2.5 olarak saklanır ve geri okunur.</summary>
    [Fact]
    public async Task Yarim_adimli_RIR_saklanir_ve_geri_okunur()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);

        var eklenen = await (await client.PostAsJsonAsync("/api/sets",
                new CreateSetRequest { ExerciseId = exerciseId, Weight = 100m, Reps = 8, Rir = 2.5m }, Json))
            .Content.ReadFromJsonAsync<SetEntryResponse>(Json);
        var setler = await client.GetFromJsonAsync<List<SetEntryResponse>>(
            $"/api/sessions/{eklenen!.SessionId}/sets", Json);

        Assert.Equal(2.5m, setler!.Single(s => s.Id == eklenen.Id).Rir);
    }

    /// <summary>#266: "4+" = 5 en üst durak; yarım adım dışı değer hiçbir durağa düşmez.</summary>
    [Theory]
    [InlineData("5.5")]
    [InlineData("1.3")]
    public async Task Gecersiz_RIR_400_verir(string rir)
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);

        var response = await client.PostAsJsonAsync("/api/sets", new CreateSetRequest
        {
            ExerciseId = exerciseId,
            Weight = 100m,
            Reps = 8,
            Rir = decimal.Parse(rir, System.Globalization.CultureInfo.InvariantCulture)
        }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Patch_yarim_adim_disi_RIR_400_verir()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);
        var set = await (await PostSetAsync(client, exerciseId, 100m, 8))
            .Content.ReadFromJsonAsync<SetEntryResponse>(Json);

        var response = await client.PatchAsJsonAsync(
            $"/api/sets/{set!.Id}", new PatchSetRequest { Rir = 1.3m }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Sifir_tekrar_400_verir()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);

        var response = await PostSetAsync(client, exerciseId, 100m, 0);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>
    /// Egzersiz alanı HİÇ gönderilmezse 400 gelmeli. ExerciseId non-nullable olsaydı
    /// sessizce 0'a bağlanır ve "egzersiz bulunamadı" 404'ü dönerdi — yanlış hata.
    /// </summary>
    [Fact]
    public async Task Egzersiz_alani_atlanirsa_400_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/sets", new { weight = 100m, reps = 8 }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>
    /// Faz 7'nin ilerleme sayacı bu faza kadar HER ZAMAN 0'dı (SetEntry üreten uç yoktu).
    /// Bu test onu ilk kez gerçekten hareket ettiriyor — sayaç bozuksa Faz 7 testleri
    /// bunu göremezdi.
    /// </summary>
    [Fact]
    public async Task Set_eklenince_oturum_ilerlemesi_artar()
    {
        var client = await AuthenticatedClientAsync();
        var exerciseId = await CreateExerciseAsync(client);

        var sablon = await client.PostAsJsonAsync("/api/templates", new
        {
            name = $"Sablon {Guid.NewGuid():N}",
            exercises = new[] { new { exerciseId, plannedSets = 4 } }
        }, Json);
        sablon.EnsureSuccessStatusCode();
        var olusanSablon = await sablon.Content.ReadFromJsonAsync<TemplateResponse>(Json);

        var oturum = await client.PostAsJsonAsync("/api/sessions",
            new StartSessionRequest { TemplateId = olusanSablon!.Id }, Json);
        oturum.EnsureSuccessStatusCode();
        var acilan = await oturum.Content.ReadFromJsonAsync<SessionResponse>(Json);

        Assert.Equal(0, acilan!.Progress.Single().CompletedSets);

        await PostSetAsync(client, exerciseId, 100m, 8);
        await PostSetAsync(client, exerciseId, 100m, 9);

        var guncel = await client.GetFromJsonAsync<SessionResponse>(
            $"/api/sessions/{acilan.Id}", Json);

        Assert.Equal(2, guncel!.Progress.Single().CompletedSets);
        Assert.Equal(4, guncel.Progress.Single().PlannedSets);
    }
}
