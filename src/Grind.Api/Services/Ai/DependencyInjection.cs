using System.Net.Http.Headers;
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
        services.AddSingleton(settings);

        switch (settings.Provider)
        {
            case AiProviderKind.None:
                services.AddSingleton<IAiInsightProvider, NullAiInsightProvider>();
                break;

            case AiProviderKind.Anthropic:
                EnsureValid(settings);
                services.AddSingleton(new AnthropicClient
                {
                    ApiKey = settings.ApiKey,
                    // Timeout DENEME BAŞINA uygulanır, yeniden denemeleri kapsamaz — bu yüzden MaxRetries
                    // burada açıkça 1'e sabitlenir (SDK varsayılanı 2). Gerçek, iptal edilemez üst sınır
                    // (MaxRetries + 1) × TimeoutSeconds'tır.
                    Timeout = TimeSpan.FromSeconds(settings.TimeoutSeconds),
                    MaxRetries = 1
                });
                services.AddSingleton<IAiInsightProvider, AnthropicAiInsightProvider>();
                break;

            case AiProviderKind.OpenRouter:
                EnsureValid(settings);
                services.AddHttpClient<IAiInsightProvider, OpenRouterAiInsightProvider>(http =>
                {
                    http.BaseAddress = new Uri("https://openrouter.ai/api/v1/");
                    http.Timeout = TimeSpan.FromSeconds(settings.TimeoutSeconds);
                    http.DefaultRequestHeaders.Authorization =
                        new AuthenticationHeaderValue("Bearer", settings.ApiKey);
                });
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
