using Grind.Api.Services.Ai;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Grind.Tests.Services.Ai;

/// <summary>
/// Sağlayıcı seçimi ve açılış doğrulaması (Faz 12 spec Karar 9): varsayılan KAPALI; yanlış yapılandırma
/// ilk isteği değil BOOT'u durdurur (Jwt:Key kontrolüyle aynı desen).
/// </summary>
public class AiProviderRegistrationTests
{
    private static AiSettings Anthropic() => new()
    {
        Provider = AiProviderKind.Anthropic,
        ApiKey = "test-anahtari"
    };

    private static IAiInsightProvider Resolve(AiSettings settings)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAiInsightProvider(settings);
        using var provider = services.BuildServiceProvider(validateScopes: true);
        return provider.GetRequiredService<IAiInsightProvider>();
    }

    [Fact]
    public void Varsayilan_yapilandirma_kapali_saglayiciyi_kaydeder()
    {
        Assert.IsType<NullAiInsightProvider>(Resolve(new AiSettings()));
    }

    [Fact]
    public void Anthropic_ve_anahtar_verilince_gercek_saglayici_kaydedilir()
    {
        Assert.IsType<AnthropicAiInsightProvider>(Resolve(Anthropic()));
    }

    [Fact]
    public void Anahtarsiz_Anthropic_baslangicta_reddedilir()
    {
        var settings = Anthropic();
        settings.ApiKey = string.Empty;

        var hata = Assert.Throws<InvalidOperationException>(
            () => new ServiceCollection().AddAiInsightProvider(settings));

        Assert.Contains("Ai:ApiKey", hata.Message);
    }

    [Theory]
    [InlineData(0, 180)]
    [InlineData(16000, 0)]
    public void Pozitif_olmayan_sinirlar_baslangicta_reddedilir(int maxTokens, int timeoutSeconds)
    {
        var settings = Anthropic();
        settings.MaxTokens = maxTokens;
        settings.TimeoutSeconds = timeoutSeconds;

        Assert.Throws<InvalidOperationException>(() => new ServiceCollection().AddAiInsightProvider(settings));
    }

    /// <summary>
    /// "Antropic" gibi bir yazım hatası özelliği sessizce kapalı bırakmamalı: enum bağlaması açılışta
    /// patlar (spec Karar 9).
    /// </summary>
    [Fact]
    public void Taninmayan_saglayici_adi_baglamada_reddedilir()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Ai:Provider"] = "Antropic" })
            .Build();

        Assert.Throws<InvalidOperationException>(() => configuration.GetSection("Ai").Get<AiSettings>());
    }

    [Fact]
    public void Saglayici_adi_buyuk_kucuk_harfe_duyarsiz_baglanir()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Ai:Provider"] = "anthropic" })
            .Build();

        Assert.Equal(AiProviderKind.Anthropic, configuration.GetSection("Ai").Get<AiSettings>()!.Provider);
    }
}
