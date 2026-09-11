using Anthropic;

namespace Grind.Api.Services.Ai;

public static class DependencyInjection
{
    /// <summary>
    /// Yapılandırılan AI sağlayıcısını singleton olarak kaydeder (Faz 12 spec Karar 9). Varsayılan
    /// <see cref="AiProviderKind.None"/> → <see cref="NullAiInsightProvider"/>. Anthropic seçiliyse eksik
    /// ya da geçersiz ayar açılışta <see cref="InvalidOperationException"/> verir — Jwt:Key kontrolüyle
    /// aynı desen: yanlış yapılandırma ilk isteği değil BOOT'u durdurur.
    /// </summary>
    public static IServiceCollection AddAiInsightProvider(this IServiceCollection services, AiSettings settings)
    {
        switch (settings.Provider)
        {
            case AiProviderKind.None:
                services.AddSingleton<IAiInsightProvider, NullAiInsightProvider>();
                break;

            case AiProviderKind.Anthropic:
                EnsureValid(settings);
                services.AddSingleton(settings);
                services.AddSingleton(new AnthropicClient
                {
                    ApiKey = settings.ApiKey,
                    Timeout = TimeSpan.FromSeconds(settings.TimeoutSeconds)
                });
                services.AddSingleton<IAiInsightProvider, AnthropicAiInsightProvider>();
                break;

            default:
                throw new InvalidOperationException($"Ai:Provider desteklenmiyor: {settings.Provider}.");
        }

        return services;
    }

    private static void EnsureValid(AiSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.ApiKey))
        {
            throw new InvalidOperationException(
                "Ai:ApiKey tanımlı değil. Değeri user-secrets veya ortam değişkeninden verin.");
        }

        if (string.IsNullOrWhiteSpace(settings.Model))
        {
            throw new InvalidOperationException("Ai:Model boş olamaz.");
        }

        if (settings.MaxTokens <= 0)
        {
            throw new InvalidOperationException("Ai:MaxTokens pozitif olmalı.");
        }

        if (settings.TimeoutSeconds <= 0)
        {
            throw new InvalidOperationException("Ai:TimeoutSeconds pozitif olmalı.");
        }
    }
}
