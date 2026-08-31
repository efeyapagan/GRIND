using System.Security.Claims;
using System.Text;
using Grind.Api.Common.Security;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Grind.Tests.Common;

public class TokenServiceTests
{
    private static readonly JwtSettings Settings = new()
    {
        Key = "bu-yalnizca-test-icin-kullanilan-en-az-256-bitlik-bir-anahtardir",
        Issuer = "grind-api-test",
        Audience = "grind-app-test",
        ExpiryMinutes = 60
    };

    private static TokenValidationParameters ValidationParameters() => new()
    {
        ValidIssuer = Settings.Issuer,
        ValidAudience = Settings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Settings.Key)),
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        // Prod'daki (DependencyInjection.AddCrossCutting) ayarla aynı: aksi halde
        // User.Identity.Name sessizce null döner (bkz. Identity_Name_username_tasir testi).
        NameClaimType = AppClaims.Username
    };

    [Fact]
    public async Task Uretilen_token_kendi_parametreleriyle_dogrulanir()
    {
        var result = new TokenService(Settings).CreateToken(7, "efe");

        var validation = await new JsonWebTokenHandler()
            .ValidateTokenAsync(result.Token, ValidationParameters());

        Assert.True(validation.IsValid, validation.Exception?.Message);
    }

    [Fact]
    public async Task Token_userId_ve_username_tasir()
    {
        var result = new TokenService(Settings).CreateToken(7, "efe");

        var validation = await new JsonWebTokenHandler()
            .ValidateTokenAsync(result.Token, ValidationParameters());

        Assert.Equal("7", validation.Claims[AppClaims.UserId].ToString());
        Assert.Equal("efe", validation.Claims[AppClaims.Username].ToString());
    }

    [Fact]
    public async Task Token_yalnizca_beklenen_claimleri_tasir()
    {
        // CLAUDE.md kararı: JWT sadece kimlik taşır. Rol/plan (veya başka herhangi bir alan)
        // token'a gömülürse kullanıcı premium'a geçtiğinde eski token eski durumu taşımaya
        // devam eder. Kara liste (ör. "role"/"plan" içermez) yerine beyaz liste kullanılır ki
        // ileride eklenecek HERHANGİ bir claim bu testi kırsın.
        var result = new TokenService(Settings).CreateToken(7, "efe");

        var validation = await new JsonWebTokenHandler()
            .ValidateTokenAsync(result.Token, ValidationParameters());

        var expectedKeys = new[]
        {
            AppClaims.UserId, AppClaims.Username, "aud", "iss", "exp", "iat", "nbf"
        };
        Assert.Equal(expectedKeys.ToHashSet(), validation.Claims.Keys.ToHashSet());
    }

    [Fact]
    public async Task Identity_Name_username_tasir()
    {
        // NameClaimType ayarlanmazsa (varsayılan ClaimTypes.Name, token'da yok) User.Identity.Name
        // sessizce null döner — Faz 4'te AuthController gibi kod bunu fark etmeden kırılır.
        var result = new TokenService(Settings).CreateToken(7, "efe");

        var validation = await new JsonWebTokenHandler()
            .ValidateTokenAsync(result.Token, ValidationParameters());
        var principal = new ClaimsPrincipal(validation.ClaimsIdentity);

        Assert.Equal("efe", principal.Identity?.Name);
    }

    [Fact]
    public void ExpiresAtUtc_ayarlanan_sureyi_yansitir()
    {
        var before = DateTime.UtcNow;

        var result = new TokenService(Settings).CreateToken(7, "efe");

        var expected = before.AddMinutes(Settings.ExpiryMinutes);
        Assert.InRange(result.ExpiresAtUtc, expected.AddSeconds(-30), expected.AddSeconds(30));
    }

    [Fact]
    public async Task Baska_bir_anahtarla_imzalanmis_gibi_dogrulanamaz()
    {
        var result = new TokenService(Settings).CreateToken(7, "efe");
        var wrongKey = ValidationParameters();
        wrongKey.IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes("tamamen-baska-bir-anahtar-en-az-256-bitlik-olmali!"));

        var validation = await new JsonWebTokenHandler().ValidateTokenAsync(result.Token, wrongKey);

        Assert.False(validation.IsValid);
    }
}
