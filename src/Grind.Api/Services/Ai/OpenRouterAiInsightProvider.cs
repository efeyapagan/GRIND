using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Grind.Api.Common.Exceptions;

namespace Grind.Api.Services.Ai;

/// <summary>
/// GEÇİCİ/test amaçlı ikinci gerçek sağlayıcı (issue #99): OpenRouter'ın OpenAI-uyumlu
/// <c>/chat/completions</c> uç noktası, yalnızca ücretsiz (":free" ekli) modellerle kullanılmak
/// üzere. <see cref="AnthropicAiInsightProvider"/> ile AYNI sözleşmeyi taşır: sağlayıcının kendi
/// hata metni istemciye ASLA ulaşmaz, sabit bir 503 mesajına sarılır.
/// </summary>
public sealed class OpenRouterAiInsightProvider : IAiInsightProvider
{
    public const string UnreachableMessage =
        "AI sağlayıcısına şu an ulaşılamıyor. Lütfen daha sonra tekrar deneyin.";

    public const string NoAnswerMessage = "Model bu isteğe yanıt vermedi.";

    private readonly HttpClient client;
    private readonly AiSettings settings;
    private readonly ILogger<OpenRouterAiInsightProvider> logger;

    public OpenRouterAiInsightProvider(
        HttpClient client, AiSettings settings, ILogger<OpenRouterAiInsightProvider> logger)
    {
        this.client = client;
        this.settings = settings;
        this.logger = logger;
    }

    public async Task<AiCompletion> CompleteAsync(
        string instructions, string trainingData, CancellationToken cancellationToken = default)
    {
        HttpResponseMessage response;
        try
        {
            response = await client.PostAsJsonAsync("chat/completions", new ChatRequest(
                settings.Model,
                settings.MaxTokens,
                [new ChatMessage("system", instructions), new ChatMessage("user", trainingData)]),
                cancellationToken);
        }
        catch (Exception e) when (e is HttpRequestException
                                  || (e is OperationCanceledException && !cancellationToken.IsCancellationRequested))
        {
            // Çağıran iptal etmediyse OperationCanceledException'ın tek kaynağı zaman aşımıdır.
            logger.LogError(e, "AI sağlayıcısına yapılan çağrı başarısız oldu.");
            throw new ServiceUnavailableException(UnreachableMessage);
        }

        if (!response.IsSuccessStatusCode)
        {
            var hataGovdesi = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogError(
                "AI sağlayıcısı {StatusCode} döndü: {Govde}", (int)response.StatusCode, hataGovdesi);
            throw new ServiceUnavailableException(UnreachableMessage);
        }

        try
        {
            var govde = await response.Content.ReadFromJsonAsync<ChatResponse>(cancellationToken);
            var secim = govde?.Choices?.FirstOrDefault()
                ?? throw new InvalidOperationException("gövdede choices yok");
            var icerik = secim.Message.Content?.Trim() ?? string.Empty;

            if (icerik.Length == 0)
            {
                logger.LogWarning(
                    "AI sağlayıcısı boş yanıt döndü. Durma sebebi: {FinishReason}", secim.FinishReason);
                throw new ServiceUnavailableException(NoAnswerMessage);
            }

            return new AiCompletion(
                icerik,
                govde!.Model,
                govde.Usage?.TotalTokens,
                AiCostCalculator.Estimate(
                    govde.Usage?.PromptTokens ?? 0, govde.Usage?.CompletionTokens ?? 0,
                    settings.InputUsdPerMillionTokens, settings.OutputUsdPerMillionTokens));
        }
        catch (Exception e) when (e is JsonException or InvalidOperationException)
        {
            // 200 döner ama gövde zorunlu alanları taşımıyor -- bu da bir sağlayıcı hatasıdır,
            // istemciye asla çıplak sızmamalı (bkz. AnthropicAiInsightProvider'daki aynı desen).
            logger.LogError(e, "AI sağlayıcısının yanıt gövdesi ayrıştırılamadı.");
            throw new ServiceUnavailableException(UnreachableMessage);
        }
    }

    private sealed record ChatRequest(
        string Model, [property: JsonPropertyName("max_tokens")] int MaxTokens, ChatMessage[] Messages);

    private sealed record ChatMessage(string Role, string Content);

    private sealed record ChatResponse(
        string Model, List<ChatChoice>? Choices, UsageInfo? Usage);

    private sealed record ChatChoice(
        ChatResponseMessage Message, [property: JsonPropertyName("finish_reason")] string? FinishReason);

    private sealed record ChatResponseMessage(string? Content);

    private sealed record UsageInfo(
        [property: JsonPropertyName("prompt_tokens")] long PromptTokens,
        [property: JsonPropertyName("completion_tokens")] long CompletionTokens,
        [property: JsonPropertyName("total_tokens")] int TotalTokens);
}
