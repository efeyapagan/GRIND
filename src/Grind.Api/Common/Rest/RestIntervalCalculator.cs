using Grind.Api.Models.Entities;

namespace Grind.Api.Common.Rest;

/// <summary>
/// Setler arası GERÇEK dinlenme (#71): bir setin <c>CreatedAt</c>'i ile oturumdaki bir önceki setin
/// <c>CreatedAt</c>'i arasındaki fark. Şablondaki hedef süreyle (<c>RestSeconds</c>, geri sayım) karıştırılmasın.
/// Saf ve durumsuz (<see cref="Records.OneRepMaxEstimator"/> deseni); sonuç SAKLANMAZ, sorgu anında hesaplanır
/// — set silinse ya da düzeltilse de süreler kendiliğinden doğru kalır.
///
/// Ölçü aynı hareketin önceki seti DEĞİL, oturumdaki önceki settir: superset (A-B-A-B) yapan kullanıcı
/// gerçekte iki set arasındaki boşluk kadar dinlenir. <c>CreatedAt</c> setin YAPILDIĞI değil KAYDEDİLDİĞİ
/// andır; topluca girilen setler kısa, unutulan telefon uzun değer üretir — özet bu yüzden ortalama değil
/// <see cref="Median"/>'dır.
/// </summary>
public static class RestIntervalCalculator
{
    /// <summary>
    /// Tek bir oturumun TÜM setleri (sıra fark etmez) → set id'si başına dinlenme saniyesi (aşağı yuvarlanır).
    /// İlk setin dinlenmesi <c>null</c>: öncesinde set yok, "0 sn" yanlış bir sayı olurdu. Filtrelenmiş bir
    /// alt küme VERİLMEMELİ — arada kalan başka hareketin setleri görünmezse süre uzar.
    /// </summary>
    public static IReadOnlyDictionary<long, int?> ForSession(IEnumerable<SetEntry> sets)
    {
        var result = new Dictionary<long, int?>();
        DateTime? previous = null;

        // Tie-break repository sorgularıyla aynı: eşit CreatedAt'te Id.
        foreach (var set in sets.OrderBy(s => s.CreatedAt).ThenBy(s => s.Id))
        {
            result[set.Id] = previous is { } p ? (int)(set.CreatedAt - p).TotalSeconds : null;
            previous = set.CreatedAt;
        }

        return result;
    }

    /// <summary>
    /// <c>null</c>'ları atlayan medyan; çift sayıda değerde ortadaki ikisinin ortalaması (yarım yukarı). Hiç
    /// değer yoksa <c>null</c>.
    /// </summary>
    public static int? Median(IEnumerable<int?> restSeconds)
    {
        var sorted = restSeconds.OfType<int>().Order().ToList();

        if (sorted.Count == 0)
        {
            return null;
        }

        var middle = sorted.Count / 2;

        return sorted.Count % 2 == 1
            ? sorted[middle]
            : (int)Math.Round((sorted[middle - 1] + sorted[middle]) / 2.0, MidpointRounding.AwayFromZero);
    }
}
