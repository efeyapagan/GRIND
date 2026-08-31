using System.Text;
using System.Text.Json;
using Grind.Api.Common.ErrorHandling;
using Grind.Api.Common.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;

namespace Grind.Tests.Common;

public class GlobalExceptionHandlerTests
{
    private sealed class FakeEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;
        public string ApplicationName { get; set; } = "Grind.Api.Tests";
        public string ContentRootPath { get; set; } = string.Empty;
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            new Microsoft.Extensions.FileProviders.NullFileProvider();
    }

    /// <summary>Handler'ı çalıştırır ve yazılan gövdeyi durum koduyla birlikte döndürür.</summary>
    private static async Task<(int StatusCode, JsonElement Body)> HandleAsync(
        Exception exception, string environmentName = "Production")
    {
        var services = new ServiceCollection();
        services.AddProblemDetails();
        services.AddLogging();
        await using var provider = services.BuildServiceProvider();

        var context = new DefaultHttpContext { RequestServices = provider };
        context.Request.Headers.Accept = "application/json";
        context.Request.Path = "/api/test";
        var body = new MemoryStream();
        context.Response.Body = body;

        var handler = new GlobalExceptionHandler(
            provider.GetRequiredService<IProblemDetailsService>(),
            new FakeEnvironment(environmentName),
            NullLogger<GlobalExceptionHandler>.Instance);

        var handled = await handler.TryHandleAsync(context, exception, CancellationToken.None);
        Assert.True(handled, "Handler isteği işlemedi.");

        var json = JsonDocument.Parse(Encoding.UTF8.GetString(body.ToArray()));
        return (context.Response.StatusCode, json.RootElement.Clone());
    }

    [Theory]
    [InlineData(typeof(NotFoundException), 404)]
    [InlineData(typeof(ValidationException), 400)]
    [InlineData(typeof(UnauthorizedException), 401)]
    [InlineData(typeof(ForbiddenException), 403)]
    [InlineData(typeof(ConflictException), 409)]
    public async Task Domain_exceptionlari_dogru_duruma_eslenir(Type exceptionType, int expected)
    {
        var exception = (Exception)Activator.CreateInstance(exceptionType, "mesaj")!;

        var (statusCode, body) = await HandleAsync(exception);

        Assert.Equal(expected, statusCode);
        Assert.Equal(expected, body.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task Taninmayan_exception_500_olur()
    {
        var (statusCode, body) = await HandleAsync(new InvalidOperationException("beklenmedik"));

        Assert.Equal(500, statusCode);
        Assert.Equal(500, body.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task Production_da_500_in_ic_mesaji_sizmaz()
    {
        var (_, body) = await HandleAsync(
            new InvalidOperationException("VERITABANI PAROLASI yanlis"), "Production");

        var detail = body.GetProperty("detail").GetString();
        Assert.DoesNotContain("VERITABANI PAROLASI", detail);
    }

    [Fact]
    public async Task Development_da_500_in_ic_mesaji_gorunur()
    {
        var (_, body) = await HandleAsync(
            new InvalidOperationException("teshis icin gerekli"), "Development");

        Assert.Contains("teshis icin gerekli", body.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Domain_exception_mesaji_production_da_da_gorunur()
    {
        // 4xx'ler kullanıcıya ne yaptığını söylemek içindir; gizlenecek bir şey yok.
        var (_, body) = await HandleAsync(new NotFoundException("Egzersiz bulunamadi"), "Production");

        Assert.Contains("Egzersiz bulunamadi", body.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Yetkisiz_hatasinin_mesaji_yanita_aynen_yansir()
    {
        var (statusCode, body) = await HandleAsync(
            new UnauthorizedException("Kullanıcı adı veya şifre hatalı."));

        Assert.Equal(401, statusCode);
        Assert.Equal("Kullanıcı adı veya şifre hatalı.", body.GetProperty("detail").GetString());
    }

    [Theory]
    [InlineData("Development")]
    [InlineData("Production")]
    public async Task Yanit_hicbir_ortamda_stack_trace_icermez(string environmentName)
    {
        Exception captured;
        try { throw new InvalidOperationException("patladi"); }
        catch (Exception e) { captured = e; }

        var (_, body) = await HandleAsync(captured, environmentName);

        Assert.DoesNotContain("at Grind.Tests", body.ToString());
    }
}
