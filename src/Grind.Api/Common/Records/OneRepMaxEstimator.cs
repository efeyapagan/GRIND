namespace Grind.Api.Common.Records;

/// <summary>
/// Tahmini tek tekrar maksimumu (1RM), Brzycki formülüyle: <c>ağırlık × 36 / (37 − tekrar)</c>.
/// Saf ve durumsuz — veritabanı, saat, kullanıcı bilmez (<see cref="RecordTracker"/> deseni).
/// Sonuç SAKLANMAZ, sorgu anında hesaplanır: formül değişirse geçmiş satırlar yeniden yazılmaz
/// (dilim 3 spec Karar 1). Epley yerine Brzycki: 10 tekrarın altında daha isabetli ve tekrar
/// tavanıyla birlikte kullanılıyor.
/// </summary>
public static class OneRepMaxEstimator
{
    /// <summary>Bu tekrar sayısının üstünde formül güvenilmez; tahmin yapılmaz.</summary>
    public const int MaxRepsForEstimate = 12;

    /// <summary>
    /// Tahmin edilemiyorsa <c>null</c>: ağırlıksız set (0 kg — barfiks/dips; 1RM anlamsız), 1'den az ya
    /// da <see cref="MaxRepsForEstimate"/>'ten fazla tekrar. Sonuç 2 ondalık, yarım yukarı.
    /// </summary>
    public static decimal? Estimate(decimal weight, int reps)
    {
        if (weight <= 0 || reps < 1 || reps > MaxRepsForEstimate)
        {
            return null;
        }

        return decimal.Round(weight * 36m / (37 - reps), 2, MidpointRounding.AwayFromZero);
    }
}
