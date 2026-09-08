using System.Net;
using System.Text.Json;

namespace Grind.Tests.Integration;

/// <summary>
/// Swagger dokümanının kendisini doğrular. Gerekçesi somut bir hata: Faz 3'te eklenen
/// güvenlik gereksinimi, şema referansı ait olduğu <c>OpenApiDocument</c>'a bağlanmadığı
/// için sessizce BOŞ bir nesne (<c>"security": [ { } ]</c>) olarak seri hâle geliyordu.
/// Şema tanımı (<c>components.securitySchemes.Bearer</c>) doğru göründüğü için gözden
/// kaçtı, ama boş gereksinim Swagger UI'a "bu uçlar kimlik istemiyor" demek olduğundan
/// UI <c>Authorization</c> başlığını HİÇ göndermiyordu: Authorize kutusuna geçerli bir
/// token yapıştıran kullanıcı bile her istekte 401 alıyordu.
///
/// Faz 5'e kadar kimlik isteyen endpoint olmadığı için kimse fark etmedi; entegrasyon
/// testleri de Swagger UI'ı değil doğrudan HttpClient'ı kullandığı için bu yolu hiç
/// dolaşmıyordu. Bu testler o boşluğu kapatıyor.
/// </summary>
[Trait("Category", "Database")]
public class SwaggerDocumentTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private async Task<JsonElement> DocumentAsync()
    {
        var response = await factory.CreateClient().GetAsync("/swagger/v1/swagger.json");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();
    }

    [Fact]
    public async Task Bearer_semasi_tanimlanmis()
    {
        var scheme = (await DocumentAsync())
            .GetProperty("components").GetProperty("securitySchemes").GetProperty("Bearer");

        Assert.Equal("http", scheme.GetProperty("type").GetString());
        Assert.Equal("bearer", scheme.GetProperty("scheme").GetString());
    }

    /// <summary>
    /// Asıl koruma bu: gereksinimin VAR olması yetmez, <c>Bearer</c> şemasını ADIYLA
    /// göstermesi gerekir. Referans dokümana bağlanmazsa buraya boş bir nesne yazılır ve
    /// Swagger UI token'ı göndermeyi bırakır.
    /// </summary>
    [Fact]
    public async Task Guvenlik_gereksinimi_Bearer_semasini_adiyla_gosteriyor()
    {
        var requirements = (await DocumentAsync()).GetProperty("security");

        Assert.NotEmpty(requirements.EnumerateArray());
        Assert.Contains(
            requirements.EnumerateArray(),
            requirement => requirement.TryGetProperty("Bearer", out _));
    }
}
