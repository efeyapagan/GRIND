namespace Grind.Api.Common.Time;

/// <summary>
/// Antrenman süresi özetinin TEK karar noktası (issue #73). Veritabanı bilmez — yalnızca
/// KAPANMIŞ oturumların süresini (saniye) görür; açık oturumları (<c>EndedAt</c> null)
/// filtrelemek çağıranın işidir, burada hiç görünmezler (<c>StreakCalculator</c> ile aynı desen:
/// kural saf bir fonksiyonda yaşar, testleri DB istemez).
///
/// Karar: ORTALAMA yerine MEDYAN raporlanır — kapatmayı unutulan tek bir oturum (saatlerce süren)
/// ortalamayı anlamsızlaştırırdı; medyan tek bir aykırı değerden etkilenmez.
/// <see cref="LikelyForgottenThreshold"/>'u AŞAN oturumlar hesaptan ÇIKARILMAZ (
/// <see cref="DurationSummary.TotalSeconds"/> hâlâ gerçek toplam antrenman süresidir) — sadece
/// şeffaflık için AYRICA sayılır.
/// </summary>
public static class DurationCalculator
{
    /// <summary>4 saat: "muhtemelen kapatmayı unutmuş" eşiği (issue #73'ün kendi önerisi).</summary>
    public static readonly TimeSpan LikelyForgottenThreshold = TimeSpan.FromHours(4);

    /// <summary>Açık oturum (<paramref name="endedAt"/> null) için süre hesaplanamaz → null.</summary>
    public static long? SecondsBetween(DateTime startedAt, DateTime? endedAt) =>
        endedAt is { } end ? (long)(end - startedAt).TotalSeconds : null;

    public static DurationSummary Summarize(IReadOnlyList<long> closedSessionSeconds)
    {
        if (closedSessionSeconds.Count == 0)
        {
            return new DurationSummary(null, 0, 0, 0);
        }

        var sorted = closedSessionSeconds.Order().ToList();
        var likelyForgotten = closedSessionSeconds.Count(s => s > LikelyForgottenThreshold.TotalSeconds);

        return new DurationSummary(Median(sorted), sorted.Sum(), sorted.Count, likelyForgotten);
    }

    private static long Median(IReadOnlyList<long> sorted)
    {
        var mid = sorted.Count / 2;
        return sorted.Count % 2 == 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
}

public record DurationSummary(long? MedianSeconds, long TotalSeconds, int SessionCount, int LikelyForgottenCount);
