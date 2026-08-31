using Grind.Api.Common;
using Grind.Api.Common.ErrorHandling;
using Grind.Api.Common.Security;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Grind.Tests.Common;

public class CrossCuttingRegistrationTests
{
    private sealed class FakeEnvironment(string environmentName = "Production") : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;
        public string ApplicationName { get; set; } = "Grind.Api.Tests";
        public string ContentRootPath { get; set; } = string.Empty;
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            new Microsoft.Extensions.FileProviders.NullFileProvider();
    }

    private static JwtSettings ValidSettings() => new()
    {
        Key = "bu-yalnizca-test-icin-kullanilan-en-az-256-bitlik-bir-anahtardir",
        Issuer = "grind-api-test",
        Audience = "grind-app-test",
        ExpiryMinutes = 60
    };

    private static ServiceProvider BuildProvider()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddCrossCutting(ValidSettings(), new FakeEnvironment());
        return services.BuildServiceProvider(validateScopes: true);
    }

    [Theory]
    [InlineData(typeof(ICurrentUserService))]
    [InlineData(typeof(ITokenService))]
    [InlineData(typeof(IHttpContextAccessor))]
    public void Kayitli_tipler_cozulebilir(Type serviceType)
    {
        using var provider = BuildProvider();
        using var scope = provider.CreateScope();

        Assert.NotNull(scope.ServiceProvider.GetService(serviceType));
    }

    [Fact]
    public void Global_hata_handleri_kayitlidir()
    {
        // GlobalExceptionHandler, IHostEnvironment'a bagimli ve o host tarafindan saglanir -
        // ciplak bir ServiceCollection uzerinde degil. Bu yuzden burada servisi resolve etmek
        // yerine sadece IExceptionHandler kaydinin var oldugu dogrulanir (bkz. task-5 kararlari).
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddCrossCutting(ValidSettings(), new FakeEnvironment());

        Assert.Contains(services, d =>
            d.ServiceType == typeof(IExceptionHandler) &&
            d.ImplementationType == typeof(GlobalExceptionHandler));
    }

    [Fact]
    public void Cok_kisa_JWT_anahtari_baslangicta_reddedilir()
    {
        // HmacSha256 en az 256 bit ister. Kısa anahtar ilk token üretiminde anlaşılmaz bir
        // hataya dönüşür; başlangıçta net bir hata vermek daha iyi.
        var services = new ServiceCollection();
        var settings = ValidSettings();
        settings.Key = "cok-kisa";

        var exception = Assert.Throws<InvalidOperationException>(
            () => services.AddCrossCutting(settings, new FakeEnvironment()));

        Assert.Contains("Jwt:Key", exception.Message);
    }

    [Fact]
    public void Bos_JWT_anahtari_baslangicta_reddedilir()
    {
        var services = new ServiceCollection();
        var settings = ValidSettings();
        settings.Key = string.Empty;

        Assert.Throws<InvalidOperationException>(
            () => services.AddCrossCutting(settings, new FakeEnvironment()));
    }
}
