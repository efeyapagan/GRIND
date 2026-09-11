using Anthropic;
using Anthropic.Exceptions;
using Anthropic.Models.Beta.Messages;
using Grind.Api.Common.Exceptions;

namespace Grind.Api.Services.Ai;

/// <summary>
/// Gerçek sağlayıcı: resmi Anthropic C# SDK'sı (Faz 12 spec Karar 8). Yalnızca
/// <c>Ai:Provider = Anthropic</c> iken kayıtlıdır; varsayılan KAPALIDIR. Singleton: <see cref="AnthropicClient"/>
/// iş parçacığı güvenlidir ve kendi HttpClient'ını yeniden kullanır. SDK 408/409/429/5xx'te kendisi
/// yeniden dener.
///
/// Sağlayıcının hata metni istemciye ASLA ulaşmaz: loglanır, istemci sabit bir 503 mesajı alır.
/// </summary>
public sealed class AnthropicAiInsightProvider : IAiInsightProvider
{
    /// <summary>
    /// Model isteği politika gerekçesiyle reddederse API aynı çağrı içinde Anthropic'in önerdiği fallback
    /// modeliyle yanıtlar (<c>fallbacks: "default"</c>).
    /// </summary>
    public const string FallbackBeta = "server-side-fallback-2026-07-01";

    public const string UnreachableMessage =
        "AI sağlayıcısına şu an ulaşılamıyor. Lütfen daha sonra tekrar deneyin.";

    public const string NoAnswerMessage = "Model bu isteğe yanıt vermedi.";

    private readonly AnthropicClient client;
    private readonly AiSettings settings;
    private readonly ILogger<AnthropicAiInsightProvider> logger;

    public AnthropicAiInsightProvider(
        AnthropicClient client, AiSettings settings, ILogger<AnthropicAiInsightProvider> logger)
    {
        this.client = client;
        this.settings = settings;
        this.logger = logger;

        // AiSettings fiyatları bilerek C# varsayılanı taşımıyor (bkz. AiSettings.cs); dağıtılan
        // varsayılan appsettings.json'da tanımlı. Fiyat yapılandırması eksik/silinmişse sağlayıcı yine
        // çalışır ama EstimatedCostUsd sessizce hep null kalır — bu durum başlangıçta bir kez loglanır.
        if (settings.InputUsdPerMillionTokens is null || settings.OutputUsdPerMillionTokens is null)
        {
            logger.LogWarning("Ai fiyatları tanımlı değil, maliyet tahmini kaydedilmeyecek.");
        }
    }

    public async Task<AiCompletion> CompleteAsync(
        string instructions, string trainingData, CancellationToken cancellationToken = default)
    {
        try
        {
            // Thinking ve Effort bilerek verilmez: Opus 5 varsayılan olarak uyarlanabilir düşünmeyle,
            // high effort'la çalışır.
            var response = await client.Beta.Messages.Create(new MessageCreateParams
            {
                Model = settings.Model,
                MaxTokens = settings.MaxTokens,
                System = instructions,
                Betas = [FallbackBeta],
                Fallbacks = new Default(),
                Messages = [new() { Role = Role.User, Content = trainingData }],
            }, cancellationToken);

            // Alan okumaları bilerek try içinde: SDK bazı alanları erişim anında (lazy) materyalize
            // eder, bu yüzden bozuk/uyumsuz bir 200 gövdesi de burada çıplak bir SDK hatası fırlatabilir.
            return ToCompletion(response);
        }
        catch (Exception e) when (e is AnthropicException or HttpRequestException
                                  || (e is OperationCanceledException && !cancellationToken.IsCancellationRequested))
        {
            // Çağıran iptal etmediyse OperationCanceledException'ın tek kaynağı zaman aşımıdır.
            logger.LogError(e, "AI sağlayıcısına yapılan çağrı başarısız oldu.");
            throw new ServiceUnavailableException(UnreachableMessage);
        }
    }

    private AiCompletion ToCompletion(BetaMessage response)
    {
        if (response.StopReason == "refusal")
        {
            // Fallback zinciri de reddetti.
            logger.LogWarning("AI sağlayıcısı isteği reddetti.");
            throw new ServiceUnavailableException(NoAnswerMessage);
        }

        var content = string.Concat(
            response.Content.Select(b => b.Value).OfType<BetaTextBlock>().Select(t => t.Text)).Trim();

        if (content.Length == 0)
        {
            logger.LogWarning("AI sağlayıcısı boş yanıt döndü. Durma sebebi: {StopReason}", response.StopReason);
            throw new ServiceUnavailableException(NoAnswerMessage);
        }

        // max_tokens ile kesilen yanıt da buraya düşer ve SAKLANIR: ücreti ödenmiştir (spec Karar 8).
        var inputTokens = response.Usage.InputTokens;
        var outputTokens = response.Usage.OutputTokens;
        string servedBy = response.Model;

        return new AiCompletion(
            content,
            servedBy,
            checked((int)(inputTokens + outputTokens)),
            AiCostCalculator.Estimate(
                inputTokens, outputTokens, settings.InputUsdPerMillionTokens, settings.OutputUsdPerMillionTokens));
    }
}
