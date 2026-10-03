using System.Net;

namespace Grind.Tests.Integration;

/// <summary>
/// #174: mobil istemci "sunucuya ulaşılabiliyor mu" sorusunu bu uçla yoklar (çevrimdışı şeridi). Kimlik
/// istemez (oturum düşmüşken de yoklanabilmeli), veri taşımaz.
/// </summary>
[Trait("Category", "Database")]
public class HealthEndpointTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    [Fact]
    public async Task Kimliksiz_saglik_istegi_204_doner()
    {
        var response = await factory.CreateClient().GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(0, (await response.Content.ReadAsByteArrayAsync()).Length);
    }
}
