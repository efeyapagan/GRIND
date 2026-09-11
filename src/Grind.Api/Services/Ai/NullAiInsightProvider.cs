using Grind.Api.Common.Exceptions;

namespace Grind.Api.Services.Ai;

/// <summary>
/// Varsayılan sağlayıcı: AI KAPALI (Faz 12 spec Karar 5). "Açıkça kullanılamıyor" der, sahte başarı
/// ÜRETMEZ — sahte bir içerik kullanıcının ödemediği satırlar yazar ve geçmişi kirletirdi.
/// </summary>
public sealed class NullAiInsightProvider : IAiInsightProvider
{
    public const string DisabledMessage = "AI yorumlama şu an kapalı.";

    public Task<AiCompletion> CompleteAsync(
        string instructions, string trainingData, CancellationToken cancellationToken = default)
        => Task.FromException<AiCompletion>(new ServiceUnavailableException(DisabledMessage));
}
