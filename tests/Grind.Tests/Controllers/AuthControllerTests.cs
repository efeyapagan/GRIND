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

        // Faz 13: bu controller testleri henüz DeactivateAsync'i egzersiz etmiyor (bkz. Task 3),
        // ama arabirim üyesi olduğu için sahte sınıf derlenebilmesi adına burada yer almalı.
        public Task DeactivateAsync(DeleteAccountRequest request, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
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
    /// [AllowAnonymous] bilerek sınıf değil, her action üzerinde ayrı ayrı duruyor. Sınıf
    /// seviyesindeki bir [AllowAnonymous], bu controller'a ileride eklenecek her yeni action'ı
    /// (örn. bir "change-password" endpoint'i) sessizce anonim erişime açardı — ve fallback
    /// authorization politikası (bkz. DependencyInjection.AddCrossCutting) bunu YAKALAYAMAZ:
    /// sınıf seviyesindeki [AllowAnonymous] fallback politikasını her zaman ezer. Bu yüzden
    /// istisna, sadece gerçekten anonim kalması gereken iki action'a (Register, Login) tek tek
    /// tanımlanır; yeni bir action varsayılan olarak korumalı kalır.
    /// </summary>
    [Fact]
    public void Register_ve_Login_kimlik_dogrulamasi_istemez()
    {
        Assert.NotEmpty(typeof(AuthController)
            .GetMethod(nameof(AuthController.Register))!
            .GetCustomAttributes(typeof(AllowAnonymousAttribute), inherit: true));

        Assert.NotEmpty(typeof(AuthController)
            .GetMethod(nameof(AuthController.Login))!
            .GetCustomAttributes(typeof(AllowAnonymousAttribute), inherit: true));

        // Sınıf seviyesinde OLMAMALI: oraya konursa bu controller'a ileride eklenecek her
        // action sessizce anonim olur ve fallback policy bunu ezemez.
        Assert.Empty(typeof(AuthController)
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
