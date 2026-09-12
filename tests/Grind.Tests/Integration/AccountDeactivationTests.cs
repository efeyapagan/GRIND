using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Integration;

/// <summary>
/// Uçtan uca: gerçek uygulama, gerçek JWT. Bu testler gerçek veritabanına yazar (istek uygulamanın
/// kendi DI scope'unda çalıştığı için transaction/rollback numarası işlemez), bu yüzden kullanıcı
/// adları Guid ile benzersizleştirilir.
/// </summary>
[Trait("Category", "Database")]
public class AccountDeactivationTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private const string Password = "yeterince-uzun-sifre";

    private static string UniqueUsername() => $"kap_{Guid.NewGuid():N}"[..20];

    /// <summary>Kayıt olur, token'ı yerleştirilmiş bir istemci ve kullanıcı adını döndürür.</summary>
    private async Task<(HttpClient Client, string Username)> RegisteredClientAsync()
    {
        var client = factory.CreateClient();
        var username = UniqueUsername();
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = username,
            Password = Password
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);

        return (client, username);
    }

    /// <summary>Ucu beklemeden, doğrudan veritabanından pasifleştirir.</summary>
    private static async Task DeactivateInDatabaseAsync(string username)
    {
        await using var context = TestDatabase.CreateContext();
        var user = await context.Set<User>().SingleAsync(u => u.Username == username);
        user.DeletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Faz 13 spec Karar 3: token 7 gün geçerli. Aktiflik her istekte okunmasaydı, pasifleştirilen
    /// hesap elindeki token'la bir hafta boyunca tüm verisine erişmeye devam ederdi.
    /// </summary>
    [Fact]
    public async Task Pasiflestirilen_hesabin_eski_tokeni_401_alir()
    {
        var (client, username) = await RegisteredClientAsync();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/exercises")).StatusCode);

        await DeactivateInDatabaseAsync(username);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/exercises")).StatusCode);
    }

    /// <summary>Geri açma yolu kapanmamalı: login [AllowAnonymous], token taşımaz, kontrolden geçmez.</summary>
    [Fact]
    public async Task Pasif_hesap_giris_yapip_yeni_tokenla_calisabilir()
    {
        var (client, username) = await RegisteredClientAsync();
        await DeactivateInDatabaseAsync(username);

        var login = await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Username = username,
            Password = Password
        });

        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        var yeni = factory.CreateClient();
        yeni.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);

        Assert.Equal(HttpStatusCode.OK, (await yeni.GetAsync("/api/exercises")).StatusCode);
    }

    /// <summary>
    /// Gerçek bir istemci yeni token gelene kadar eski Authorization başlığını taşımaya devam eder.
    /// Ölü token + login [AllowAnonymous] => kimlik doğrulama başarısız olur ama istek kimliksiz
    /// olarak devam eder, login yine çalışmalı (reviewer'ın izlediği boru hattı: aksi hâlde geri
    /// açma vaadi elinde eski token olan gerçek bir istemci için sessizce ölürdü).
    /// </summary>
    [Fact]
    public async Task Olu_tokeni_tasiyan_istemci_giris_yapabilir()
    {
        var (client, username) = await RegisteredClientAsync();
        await DeactivateInDatabaseAsync(username);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/exercises")).StatusCode);

        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Username = username,
            Password = Password
        });

        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.False(string.IsNullOrWhiteSpace(auth?.Token));

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/exercises")).StatusCode);
    }

    private static HttpRequestMessage DeleteMe(string? password) => new(HttpMethod.Delete, "/api/auth/me")
    {
        Content = JsonContent.Create(new DeleteAccountRequest { Password = password ?? string.Empty })
    };

    [Fact]
    public async Task Tokensiz_hesap_silme_401_verir()
    {
        var response = await factory.CreateClient().SendAsync(DeleteMe(Password));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Sifresiz_govde_400_verir()
    {
        var (client, _) = await RegisteredClientAsync();

        var response = await client.SendAsync(DeleteMe(null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>Yanlış şifre hesabı kapatmamalı: istemci sonrasında hâlâ çalışabilmeli.</summary>
    [Fact]
    public async Task Yanlis_sifreyle_hesap_silme_401_verir_ve_hesap_acik_kalir()
    {
        var (client, _) = await RegisteredClientAsync();

        var response = await client.SendAsync(DeleteMe("bambaska-bir-sifre"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/exercises")).StatusCode);
    }

    /// <summary>
    /// Fazın tam turu: veri gir → hesabı kapat → token ölür → doğru şifreyle giriş hesabı geri açar →
    /// KAPATMADAN ÖNCE girilen veri hâlâ orada.
    /// </summary>
    [Fact]
    public async Task Hesap_silinir_token_oluru_ve_giris_veriyle_birlikte_geri_getirir()
    {
        var (client, username) = await RegisteredClientAsync();
        var egzersizAdi = $"Gogus {Guid.NewGuid():N}";
        var olusturma = await client.PostAsJsonAsync("/api/exercises", new
        {
            name = egzersizAdi,
            category = "Push"
        });
        olusturma.EnsureSuccessStatusCode();

        var silme = await client.SendAsync(DeleteMe(Password));

        Assert.Equal(HttpStatusCode.NoContent, silme.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/exercises")).StatusCode);

        var login = await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Username = username,
            Password = Password
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        var yeni = factory.CreateClient();
        yeni.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);

        var liste = await yeni.GetStringAsync("/api/exercises");
        Assert.Contains(egzersizAdi, liste);
    }
}
