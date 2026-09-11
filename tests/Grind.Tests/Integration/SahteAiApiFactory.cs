using Grind.Api.Services.Ai;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace Grind.Tests.Integration;

/// <summary>
/// Varsayılan KAPALI sağlayıcının yerine sabit yanıt veren sahte bir sağlayıcı koyar: başarı yolu ağa ve
/// ücrete çıkmadan uçtan uca sınanır. <c>ConfigureTestServices</c> Program.cs'in kayıtlarından SONRA
/// çalışır ve aynı servis tipinin son kaydı kazanır. Ortam değişkenlerini (Jwt__Key, bağlantı dizesi) taban
/// sınıfın kurucusu ayarlar.
/// </summary>
public class SahteAiApiFactory : GrindApiFactory
{
    public const string SahteModel = "sahte-model";
    public const string SahteIcerik = "Güzel gidiyorsun.";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureTestServices(services =>
            services.AddSingleton<IAiInsightProvider>(new SabitSaglayici()));
    }

    private sealed class SabitSaglayici : IAiInsightProvider
    {
        public Task<AiCompletion> CompleteAsync(
            string instructions, string trainingData, CancellationToken cancellationToken = default)
            => Task.FromResult(new AiCompletion(SahteIcerik, SahteModel, 1500, 0.0123m));
    }
}
