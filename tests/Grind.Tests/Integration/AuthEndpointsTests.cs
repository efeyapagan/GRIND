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
}
