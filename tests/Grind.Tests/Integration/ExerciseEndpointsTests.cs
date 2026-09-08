using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Integration;

[Trait("Category", "Database")]
public class ExerciseEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() } };

    private static string UniqueName() => $"Egzersiz {Guid.NewGuid():N}";

    /// <summary>Yeni bir kullanıcı kaydeder ve token'ı takılı bir istemci döndürür.</summary>
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

    [Fact]
    public async Task Tokensiz_listeleme_401_verir()
    {
        var response = await factory.CreateClient().GetAsync("/api/exercises");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// Varsayılan System.Text.Json enum'u metinden OKUYAMAZ ({"category":"Push"} →
    /// JsonException, deneyle doğrulandı). Bu test JsonStringEnumConverter'ın gerçekten
    /// kayıtlı olduğunu uçtan uca kanıtlar.
    /// </summary>
    [Fact]
    public async Task Kategori_METIN_olarak_gonderilip_METIN_olarak_donuyor()
    {
        var client = await AuthenticatedClientAsync();
        var payload = new StringContent(
            $$"""{"name":"{{UniqueName()}}","category":"Legs"}""", Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/api/exercises", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"Legs\"", body);
    }

    /// <summary>
    /// [EnumDataType] tanımsız bir SAYI'yı yakalar ama alanın hiç GÖNDERİLMEMESİNİ yakalayamaz:
    /// model binder non-nullable bir enum'u sessizce 0'da (geçerli bir üye — Push) bırakırdı.
    /// Bu tam olarak canlıda gözlemlenen hatanın kendisi: category'siz PUT, kaydı sessizce
    /// Push'a çeviriyordu. Alanı tamamen atlamak için typed bir DTO yeterli değil, ham JSON
    /// gövde gerekiyor.
    /// </summary>
    [Fact]
    public async Task Kategorisi_atlanan_PUT_400_verir_ve_kaydi_sessizce_degistirmez()
    {
        var client = await AuthenticatedClientAsync();
        var name = UniqueName();

        var created = await client.PostAsJsonAsync("/api/exercises",
            new CreateExerciseRequest { Name = name, Category = ExerciseCategory.Legs }, Json);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var olusan = await created.Content.ReadFromJsonAsync<ExerciseResponse>(Json);

        var payload = new StringContent(
            $$"""{"name":"{{name}}"}""", Encoding.UTF8, "application/json");
        var response = await client.PutAsync($"/api/exercises/{olusan!.Id}", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var detail = await client.GetFromJsonAsync<ExerciseResponse>($"/api/exercises/{olusan.Id}", Json);
        Assert.Equal(ExerciseCategory.Legs, detail!.Category);
    }

    [Fact]
    public async Task Tanimsiz_kategori_sayisi_400_verir()
    {
        var client = await AuthenticatedClientAsync();
        var payload = new StringContent(
            $$"""{"name":"{{UniqueName()}}","category":99}""", Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/api/exercises", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Olusturulan_egzersiz_listede_ve_detayda_gorunur()
    {
        var client = await AuthenticatedClientAsync();
        var name = UniqueName();

        var created = await client.PostAsJsonAsync("/api/exercises",
            new CreateExerciseRequest { Name = name, Category = ExerciseCategory.Pull }, Json);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var olusan = await created.Content.ReadFromJsonAsync<ExerciseResponse>(Json);

        var detail = await client.GetFromJsonAsync<ExerciseResponse>($"/api/exercises/{olusan!.Id}", Json);
        var list = await client.GetFromJsonAsync<List<ExerciseResponse>>("/api/exercises", Json);

        Assert.Equal(name, detail!.Name);
        Assert.False(detail.IsGlobal);
        Assert.Contains(list!, e => e.Id == olusan.Id);
    }

    [Fact]
    public async Task Baska_kullanicinin_egzersizi_404_verir()
    {
        var birinci = await AuthenticatedClientAsync();
        var created = await birinci.PostAsJsonAsync("/api/exercises",
            new CreateExerciseRequest { Name = UniqueName(), Category = ExerciseCategory.Push }, Json);
        var olusan = await created.Content.ReadFromJsonAsync<ExerciseResponse>(Json);

        var ikinci = await AuthenticatedClientAsync();
        var response = await ikinci.GetAsync($"/api/exercises/{olusan!.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Global_egzersizi_arsivleme_403_verir()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.DeleteAsync("/api/exercises/1");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Arsivleme_ve_geri_alma_204_verir()
    {
        var client = await AuthenticatedClientAsync();
        var created = await client.PostAsJsonAsync("/api/exercises",
            new CreateExerciseRequest { Name = UniqueName(), Category = ExerciseCategory.Other }, Json);
        var olusan = await created.Content.ReadFromJsonAsync<ExerciseResponse>(Json);

        var arsiv = await client.DeleteAsync($"/api/exercises/{olusan!.Id}");
        var geri = await client.PostAsync($"/api/exercises/{olusan.Id}/restore", null);

        Assert.Equal(HttpStatusCode.NoContent, arsiv.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, geri.StatusCode);
    }

    [Fact]
    public async Task Javascript_semali_medya_400_verir()
    {
        var client = await AuthenticatedClientAsync();
        var created = await client.PostAsJsonAsync("/api/exercises",
            new CreateExerciseRequest { Name = UniqueName(), Category = ExerciseCategory.Push }, Json);
        var olusan = await created.Content.ReadFromJsonAsync<ExerciseResponse>(Json);

        var response = await client.PostAsJsonAsync($"/api/exercises/{olusan!.Id}/media",
            new AddMediaRequest { MediaType = MediaType.Video, Url = "javascript:alert(1)" }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>
    /// PATCH'in var olma sebebi, tel üzerinde doğrulanıyor: gövdede YALNIZCA kategori var,
    /// ad hiç gönderilmiyor ve değişmemeli. Aynı işi PUT ile yapmak adı da göndermeyi
    /// gerektirir; Swagger gövdeyi "name": "string" diye ön-doldurduğu için egzersizin adı
    /// sessizce "string" oluyordu. Ham JSON kullanılıyor, çünkü tipli bir DTO "alan hiç
    /// gönderilmedi" durumunu ifade edemez.
    /// </summary>
    [Fact]
    public async Task Patch_yalnizca_kategoriyi_degistirir_ismi_korur()
    {
        var client = await AuthenticatedClientAsync();
        var name = UniqueName();
        var created = await client.PostAsJsonAsync("/api/exercises",
            new CreateExerciseRequest { Name = name, Category = ExerciseCategory.Push }, Json);
        var olusan = await created.Content.ReadFromJsonAsync<ExerciseResponse>(Json);

        var response = await client.PatchAsync($"/api/exercises/{olusan!.Id}",
            new StringContent("""{"category":"Pull"}""", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var guncel = await response.Content.ReadFromJsonAsync<ExerciseResponse>(Json);
        Assert.Equal(ExerciseCategory.Pull, guncel!.Category);
        Assert.Equal(name, guncel.Name);
    }

    [Fact]
    public async Task Bos_govdeli_patch_400_verir()
    {
        var client = await AuthenticatedClientAsync();
        var created = await client.PostAsJsonAsync("/api/exercises",
            new CreateExerciseRequest { Name = UniqueName(), Category = ExerciseCategory.Push }, Json);
        var olusan = await created.Content.ReadFromJsonAsync<ExerciseResponse>(Json);

        var response = await client.PatchAsync($"/api/exercises/{olusan!.Id}",
            new StringContent("{}", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
