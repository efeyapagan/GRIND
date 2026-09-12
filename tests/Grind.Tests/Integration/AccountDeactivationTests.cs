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
}
