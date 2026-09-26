using System.Net;
using System.Net.Http.Json;
using Grind.Api.Models.Dtos.Auth;

namespace Grind.Tests.Integration;

/// <summary>
/// MVC pipeline'ını gerçekten çalıştırır (WebApplicationFactory) — Validator.TryValidateObject'i
/// elle çağıran veya AuthController'ı elle örnekleyen birim testlerin GÖREMEDİĞİ boşluğu kapatır:
/// [ApiController]'ın otomatik 400'ü, [Produces] filtresi ve GlobalExceptionHandler'ın gerçek HTTP
/// yanıtına dönüşümü. Bu testler gerçek veritabanına yazar; transaction/rollback numarası
/// kullanılamaz çünkü istek uygulamanın kendi DI scope'unda çalışır — bu yüzden kullanıcı adları
/// Guid ile benzersizleştirilir ve satırlar bilerek silinmez (test kullanıcıları zararsızdır,
/// temizlik bu testlerin kapsamı dışında bırakıldı).
/// </summary>
public class AuthEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    private static string UniqueUsername() => $"itest_{Guid.NewGuid():N}"[..20];

    [Fact]
    public async Task Register_144_bytelik_sifreyle_400_ve_problem_json_doner()
    {
        var request = new RegisterRequest
        {
            Username = UniqueUsername(),
            Password = new string('ğ', 72) // 72 karakter, 144 UTF-8 bayt
        };

        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.StartsWith("application/problem+json", response.Content.Headers.ContentType?.ToString());
    }

    [Fact]
    public async Task Register_gecerli_kullaniciyla_200_ve_json_doner()
    {
        var request = new RegisterRequest
        {
            Username = UniqueUsername(),
            Password = "yeterince-uzun-gecerli-sifre"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.StartsWith("application/json", response.Content.Headers.ContentType?.ToString());
    }

    [Fact]
    public async Task Yanlis_sifre_ve_olmayan_kullanici_HTTP_seviyesinde_de_ayirt_edilemez()
    {
        var registerRequest = new RegisterRequest
        {
            Username = UniqueUsername(),
            Password = "yeterince-uzun-gecerli-sifre"
        };
        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", registerRequest);
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        var wrongPasswordResponse = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest { Username = registerRequest.Username, Password = "bambaska-bir-sifre" });

        var unknownUserResponse = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest { Username = UniqueUsername(), Password = "yeterince-uzun-gecerli-sifre" });

        Assert.Equal(HttpStatusCode.Unauthorized, wrongPasswordResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknownUserResponse.StatusCode);
        Assert.StartsWith("application/problem+json", wrongPasswordResponse.Content.Headers.ContentType?.ToString());
        Assert.StartsWith("application/problem+json", unknownUserResponse.Content.Headers.ContentType?.ToString());

        var wrongPasswordBody = await wrongPasswordResponse.Content.ReadFromJsonAsync<ProblemDetailsBody>();
        var unknownUserBody = await unknownUserResponse.Content.ReadFromJsonAsync<ProblemDetailsBody>();

        Assert.NotNull(wrongPasswordBody);
        Assert.NotNull(unknownUserBody);
        Assert.Equal(wrongPasswordBody!.Detail, unknownUserBody!.Detail);
    }

    /// <summary>RFC 7807 gövdesinden sadece <c>detail</c> alanını okumak için minimal DTO.</summary>
    private sealed class ProblemDetailsBody
    {
        public string? Detail { get; set; }
    }

    // ---- Kullanıcı adı uygunluğu (#372) ----

    private async Task<(HttpClient Client, string Username, string Password)> KayitliIstemciAsync()
    {
        var client = factory.CreateClient();
        var username = UniqueUsername();
        const string password = "yeterince-uzun-sifre";
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest { Username = username, Password = password });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth!.Token);
        return (client, username, password);
    }

    private static async Task<bool> UygunMuAsync(HttpClient client, string username)
    {
        var yanit = await client.GetFromJsonAsync<UsernameAvailabilityResponse>(
            $"/api/auth/username-available?username={Uri.EscapeDataString(username)}");
        return yanit!.Available;
    }

    [Fact]
    public async Task Uygunluk_sorgusu_tokensiz_401_verir()
    {
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await _client.GetAsync("/api/auth/username-available?username=birisi")).StatusCode);
    }

    [Fact]
    public async Task Alinmis_kullanici_adi_uygun_degil()
    {
        var (_, baskasininAdi, _) = await KayitliIstemciAsync();
        var (client, _, _) = await KayitliIstemciAsync();

        Assert.False(await UygunMuAsync(client, baskasininAdi));
    }

    /// <summary>Kullanılmayan ad uygundur — pencerede "uygun" yazan durum.</summary>
    [Fact]
    public async Task Bos_kullanici_adi_uygundur()
    {
        var (client, _, _) = await KayitliIstemciAsync();

        Assert.True(await UygunMuAsync(client, UniqueUsername()));
    }

    /// <summary>
    /// Kendi adını tekrar yazmak "alınmış" uyarısı vermemeli: pencere mevcut adla açılıyor,
    /// kullanıcı bir harf silip geri yazdığında kendi adını kendine yasaklamak anlamsız olurdu.
    /// </summary>
    [Fact]
    public async Task Kendi_kullanici_adin_uygun_sayilir()
    {
        var (client, username, _) = await KayitliIstemciAsync();

        Assert.True(await UygunMuAsync(client, username));
    }

    /// <summary>
    /// BU UCUN VAR OLMA SEBEBI: pasif hesabin kullanici adi REZERVEDIR (Faz 13 karari) ama
    /// `GET /api/users/{username}` onu 404 doner -- yani "bos" gibi gorunur ve kullanici Kaydet'te
    /// 409 yer. Uygunluk sorgusu pasif hesaplari da sayar.
    /// </summary>
    [Fact]
    public async Task Pasif_hesabin_adi_uygun_degil()
    {
        var (pasifIstemci, pasifAd, sifre) = await KayitliIstemciAsync();
        var silme = await pasifIstemci.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/auth/me")
        {
            Content = JsonContent.Create(new DeleteAccountRequest { Password = sifre }),
        });
        Assert.Equal(HttpStatusCode.NoContent, silme.StatusCode);

        var (client, _, _) = await KayitliIstemciAsync();

        Assert.False(await UygunMuAsync(client, pasifAd));
    }

    /// <summary>Biçim kuralını istemci de uyguluyor; uç yine de bozuk girdiyi kabul etmez.</summary>
    [Theory]
    [InlineData("ab")]
    [InlineData("iki kelime")]
    [InlineData("türkçe")]
    public async Task Bicimi_bozuk_ad_400_verir(string username)
    {
        var (client, _, _) = await KayitliIstemciAsync();

        var response = await client.GetAsync(
            $"/api/auth/username-available?username={Uri.EscapeDataString(username)}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>Buyuk/kucuk harf farki yeni bir ad DEGILDIR: sunucu adi normallestirerek saklar.</summary>
    [Fact]
    public async Task Buyuk_harfli_yazim_ayni_adi_isaret_eder()
    {
        var (_, baskasininAdi, _) = await KayitliIstemciAsync();
        var (client, _, _) = await KayitliIstemciAsync();

        Assert.False(await UygunMuAsync(client, baskasininAdi.ToUpperInvariant()));
    }
}
