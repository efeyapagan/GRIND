using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Profile;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca (#280): rota, kimlik, JSON ve multipart sözleşmesi, önbellek başlıkları. İş kurallarının
/// ayrıntısı <c>ProfileServiceTests</c>'te.
/// </summary>
[Trait("Category", "Database")]
public class ProfileEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3];

    private async Task<(HttpClient Client, string Username)> RegisteredClientAsync()
    {
        var client = factory.CreateClient();
        var username = $"profil_{Guid.NewGuid():N}"[..20];
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = username,
            Password = "yeterince-uzun-sifre"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return (client, username);
    }

    [Fact]
    public async Task Profil_guncellenir_ve_okunur()
    {
        var (client, username) = await RegisteredClientAsync();

        var put = await client.PutAsJsonAsync("/api/profile",
            new UpdateProfileDetailsRequest { DisplayName = "Efe Yapağan", BirthDate = new DateOnly(2000, 1, 1) });
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);

        var profil = await client.GetFromJsonAsync<ProfileResponse>("/api/profile");
        Assert.Equal(username, profil!.Username);
        Assert.Equal("Efe Yapağan", profil.DisplayName);
        Assert.Equal(new DateOnly(2000, 1, 1), profil.BirthDate);
        Assert.NotNull(profil.Age);
    }

    /// <summary>
    /// Multipart yükleme → başka bir kullanıcı baytları ETag ile alır → aynı ETag'le 304 → silince 404.
    /// </summary>
    [Fact]
    public async Task Fotograf_yuklenir_baskasi_gorur_etag_ile_304_silinince_404()
    {
        var (sahip, sahipAdi) = await RegisteredClientAsync();
        var (bakan, _) = await RegisteredClientAsync();

        using var form = new MultipartFormDataContent();
        var dosya = new ByteArrayContent(Png);
        dosya.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(dosya, "file", "avatar.png");
        Assert.Equal(HttpStatusCode.NoContent, (await sahip.PutAsync("/api/profile/avatar", form)).StatusCode);

        var foto = await bakan.GetAsync($"/api/users/{sahipAdi}/avatar");
        Assert.Equal(HttpStatusCode.OK, foto.StatusCode);
        Assert.Equal("image/png", foto.Content.Headers.ContentType?.MediaType);
        Assert.Equal(Png, await foto.Content.ReadAsByteArrayAsync());
        var etag = foto.Headers.ETag;
        Assert.NotNull(etag);

        using var kosullu = new HttpRequestMessage(HttpMethod.Get, $"/api/users/{sahipAdi}/avatar");
        kosullu.Headers.IfNoneMatch.Add(etag);
        Assert.Equal(HttpStatusCode.NotModified, (await bakan.SendAsync(kosullu)).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await sahip.DeleteAsync("/api/profile/avatar")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bakan.GetAsync($"/api/users/{sahipAdi}/avatar")).StatusCode);
    }
}
