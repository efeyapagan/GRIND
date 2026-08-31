using System.Security.Claims;
using Grind.Api.Common.Security;
using Microsoft.AspNetCore.Http;

namespace Grind.Tests.Common;

public class CurrentUserServiceTests
{
    private static CurrentUserService WithClaims(params Claim[] claims)
    {
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(claims, "test"))
        };
        return new CurrentUserService(new HttpContextAccessor { HttpContext = context });
    }

    private static CurrentUserService WithoutContext()
        => new(new HttpContextAccessor { HttpContext = null });

    [Fact]
    public void UserId_claimden_okunur()
    {
        var service = WithClaims(new Claim(AppClaims.UserId, "1234"));

        Assert.Equal(1234, service.UserId);
    }

    [Fact]
    public void Username_claimden_okunur()
    {
        var service = WithClaims(new Claim(AppClaims.Username, "efe"));

        Assert.Equal("efe", service.Username);
    }

    [Fact]
    public void Kimlik_yoksa_UserId_firlatir()
    {
        var service = WithClaims();

        Assert.Throws<InvalidOperationException>(() => service.UserId);
    }

    [Fact]
    public void HttpContext_yoksa_UserId_firlatir()
    {
        var service = WithoutContext();

        Assert.Throws<InvalidOperationException>(() => service.UserId);
    }

    [Fact]
    public void Sayiya_cevrilemeyen_UserId_firlatir()
    {
        // Bozuk bir token sessizce 0 numaralı kullanıcıya dönüşmemeli.
        var service = WithClaims(new Claim(AppClaims.UserId, "abc"));

        Assert.Throws<InvalidOperationException>(() => service.UserId);
    }

    [Fact]
    public void Kimlik_yoksa_Username_firlatir()
    {
        var service = WithClaims();

        Assert.Throws<InvalidOperationException>(() => service.Username);
    }
}
