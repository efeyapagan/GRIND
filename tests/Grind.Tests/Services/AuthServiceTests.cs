using System.Diagnostics;
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Repositories;
using Grind.Api.Services;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class AuthServiceTests
{
    private const string Password = "yeterince-uzun-sifre";

    private static JwtSettings Settings => new()
    {
        Key = "bu-test-anahtari-en-az-otuz-iki-bayt-uzunlugunda",
        Issuer = "grind-api",
        Audience = "grind-app",
        ExpiryMinutes = 60
    };

    /// <summary>Her test kendi transaction'ında çalışır; sonunda geri alınır.</summary>
    private static async Task<(AuthService Service, AppDbContext Context, IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();
        var service = new AuthService(
            new UserRepository(context), new UnitOfWork(context), new TokenService(Settings));
        return (service, context, transaction);
    }

    private static string UniqueUsername() => $"kul_{Guid.NewGuid():N}"[..20];

    private static RegisterRequest Register(string username) =>
        new() { Username = username, Password = Password };

    [Fact]
    public async Task Kayit_kullaniciyi_kucuk_harfle_saklar()
    {
        var (service, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();

            await service.RegisterAsync(Register(username.ToUpperInvariant()));

            var saved = await new UserRepository(context).GetByUsernameAsync(username);
            Assert.NotNull(saved);
            Assert.Equal(username, saved.Username);
        }
    }

    [Fact]
    public async Task Kayit_sifreyi_duz_metin_saklamaz()
    {
        var (service, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            await service.RegisterAsync(Register(username));

            var saved = await new UserRepository(context).GetByUsernameAsync(username);
            Assert.NotNull(saved);
            Assert.NotEqual(Password, saved.PasswordHash);
            Assert.True(BCrypt.Net.BCrypt.Verify(Password, saved.PasswordHash));
        }
    }

    [Fact]
    public async Task Kayit_yeni_kullanicinin_idsini_tasiyan_token_doner()
    {
        var (service, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();

            var response = await service.RegisterAsync(Register(username));

            var saved = await new UserRepository(context).GetByUsernameAsync(username);
            Assert.NotNull(saved);
            Assert.Equal(username, response.Username);
            Assert.NotEmpty(response.Token);

            var token = new Microsoft.IdentityModel.JsonWebTokens.JsonWebTokenHandler()
                .ReadJsonWebToken(response.Token);
            Assert.Equal(saved.Id.ToString(), token.GetClaim(AppClaims.UserId).Value);
        }
    }

    [Fact]
    public async Task Ayni_username_farkli_harf_buyuklugunde_reddedilir()
    {
        var (service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            await service.RegisterAsync(Register(username));

            await Assert.ThrowsAsync<ConflictException>(
                () => service.RegisterAsync(Register(username.ToUpperInvariant())));
        }
    }

    [Fact]
    public async Task Dogru_sifreyle_giris_basarili()
    {
        var (service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            await service.RegisterAsync(Register(username));

            var response = await service.LoginAsync(
                new LoginRequest { Username = username.ToUpperInvariant(), Password = Password });

            Assert.Equal(username, response.Username);
            Assert.NotEmpty(response.Token);
        }
    }

    /// <summary>
    /// Kararın özü: "kullanıcı yok" ile "şifre yanlış" AYNI yanıtı vermeli. Farklı mesaj,
    /// saldırgana hangi username'lerin kayıtlı olduğunu sayma imkânı verir.
    /// </summary>
    [Fact]
    public async Task Yanlis_sifre_ve_olmayan_kullanici_BIREBIR_ayni_hatayi_verir()
    {
        var (service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            await service.RegisterAsync(Register(username));

            var yanlisSifre = await Assert.ThrowsAsync<UnauthorizedException>(
                () => service.LoginAsync(new LoginRequest { Username = username, Password = "bambaska-sifre" }));

            var olmayanKullanici = await Assert.ThrowsAsync<UnauthorizedException>(
                () => service.LoginAsync(new LoginRequest { Username = UniqueUsername(), Password = Password }));

            Assert.Equal(yanlisSifre.Message, olmayanKullanici.Message);
        }
    }

    /// <summary>
    /// İKİ şeyi birden korur:
    /// (1) Kullanıcı bulunamadığında da BCrypt doğrulaması çalışmalı; yoksa yanıt ~1ms'de döner
    ///     ve zamanlama farkı username'leri sayar hâle gelir. Alt sınır bilerek geniş: ölçülen
    ///     maliyet ~220ms, eşik 25ms — yavaş bir CI makinesinde süre ARTAR, azalmaz.
    /// (2) Fırlatılan tipin UnauthorizedException olması. Sahte hash geçerli bir BCrypt hash'i
    ///     olmasaydı BCrypt.Verify SaltParseException fırlatırdı (deneyle doğrulandı) ve yanıt
    ///     401 yerine 500 olurdu — durum kodu tam da gizlemeye çalıştığımız bilgiyi sızdırırdı.
    /// </summary>
    [Fact]
    public async Task Olmayan_kullanicida_da_dogrulama_calisir_ve_yetkisiz_hatasi_verir()
    {
        var (service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var stopwatch = Stopwatch.StartNew();

            await Assert.ThrowsAsync<UnauthorizedException>(
                () => service.LoginAsync(new LoginRequest { Username = UniqueUsername(), Password = Password }));

            Assert.True(stopwatch.ElapsedMilliseconds > 25,
                $"Doğrulama atlanmış görünüyor ({stopwatch.ElapsedMilliseconds}ms) — zamanlama sızıntısı.");
        }
    }
}
