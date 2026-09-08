using Grind.Api.Controllers;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace Grind.Tests.Controllers;

public class AuthControllerTests
{
    private sealed class StubAuthService : IAuthService
    {
        public RegisterRequest? SeenRegister { get; private set; }
        public LoginRequest? SeenLogin { get; private set; }

        private static AuthResponse Response(string username) =>
            new("token", new DateTime(2030, 1, 1, 0, 0, 0, DateTimeKind.Utc), username);

        public Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
        {
            SeenRegister = request;
            return Task.FromResult(Response(request.Username));
        }

        public Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
        {
            SeenLogin = request;
            return Task.FromResult(Response(request.Username));
        }
    }

    [Fact]
    public async Task Register_istegi_servise_iletilir_ve_200_doner()
    {
        var service = new StubAuthService();
        var controller = new AuthController(service);
        var request = new RegisterRequest { Username = "efe", Password = "yeterince-uzun-sifre" };

        var result = await controller.Register(request, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal("efe", Assert.IsType<AuthResponse>(ok.Value).Username);
        Assert.Same(request, service.SeenRegister);
    }

    [Fact]
    public async Task Login_istegi_servise_iletilir_ve_200_doner()
    {
        var service = new StubAuthService();
        var controller = new AuthController(service);
        var request = new LoginRequest { Username = "efe", Password = "yeterince-uzun-sifre" };

        var result = await controller.Login(request, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal("efe", Assert.IsType<AuthResponse>(ok.Value).Username);
        Assert.Same(request, service.SeenLogin);
    }

    /// <summary>
    /// Kayıt ve giriş token'sız çağrılabilmeli. İleride global bir [Authorize] filtresi
    /// eklenirse bu iki endpoint kilitlenmemeli.
    /// </summary>
    [Fact]
    public void Controller_kimlik_dogrulamasi_istemez()
    {
        Assert.NotEmpty(typeof(AuthController)
            .GetCustomAttributes(typeof(AllowAnonymousAttribute), inherit: true));
    }

    [Fact]
    public void AuthService_DIya_kaydedilir()
    {
        var services = new ServiceCollection();

        services.AddApplicationServices();

        var descriptor = Assert.Single(services, d => d.ServiceType == typeof(IAuthService));
        Assert.Equal(typeof(AuthService), descriptor.ImplementationType);
        Assert.Equal(ServiceLifetime.Scoped, descriptor.Lifetime);
    }
}
