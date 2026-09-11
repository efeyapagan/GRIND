namespace Grind.Api.Services.Ai;

/// <summary>
/// LLM çağrısının tahmini maliyeti (Faz 12 spec Karar 10). Saf fonksiyon; fiyatlar yapılandırmadan
/// gelir, burada sabit fiyat YOK — model değişince kod değişmesin.
/// </summary>
public static class AiCostCalculator
{
    private const decimal TokensPerMillion = 1_000_000m;

    /// <summary>
    /// Fiyatlardan biri bilinmiyorsa null (bilinmeyen maliyet, yanlış bir sayıdan iyidir). Sonuç sütunun
    /// ölçeğine (<c>numeric(10,6)</c>) <see cref="MidpointRounding.AwayFromZero"/> ile yuvarlanır.
    /// </summary>
    public static decimal? Estimate(
        long inputTokens, long outputTokens, decimal? inputUsdPerMillion, decimal? outputUsdPerMillion)
    {
        if (inputUsdPerMillion is not { } inputPrice || outputUsdPerMillion is not { } outputPrice)
        {
            return null;
        }

        var cost = inputTokens * inputPrice / TokensPerMillion + outputTokens * outputPrice / TokensPerMillion;

        return Math.Round(cost, 6, MidpointRounding.AwayFromZero);
    }
}
