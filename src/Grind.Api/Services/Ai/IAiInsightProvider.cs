namespace Grind.Api.Services.Ai;

/// <summary>
/// Bir LLM'e NASIL sorulacağı (Faz 12 spec Karar 5). NE sorulacağı (talimat) servis katmanındadır.
/// Uygulamalar başarısızlıkta YALNIZCA <c>ServiceUnavailableException</c> fırlatır; sağlayıcının
/// kendi hata metni çağırana taşınmaz.
/// </summary>
public interface IAiInsightProvider
{
    Task<AiCompletion> CompleteAsync(
        string instructions, string trainingData, CancellationToken cancellationToken = default);
}

/// <summary>
/// Entity'nin AI alanlarının birebir karşılığı. Maliyeti sağlayıcı hesaplar: fiyat modele özgü bir
/// bilgidir, servis bilmez. <see cref="Model"/> fiilen yanıtlayan modeldir (fallback olabilir).
/// </summary>
public sealed record AiCompletion(string Content, string Model, int? TokensUsed, decimal? EstimatedCostUsd);
