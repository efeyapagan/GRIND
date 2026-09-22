namespace Grind.Api.Common.Records;

/// <summary>Bir hareketin platosu: takılı kalınan en iyi tahmini 1RM, ona ilk ulaşılan TR günü ve o günden bu yana geçen tam hafta.</summary>
public readonly record struct Plateau(decimal BestOneRepMax, DateOnly BestOn, int Weeks);

/// <summary>
/// Plato (durağanlık) tespitinin TEK karar noktası (#72). Saf ve durumsuz — veritabanı, saat, kullanıcı
/// bilmez (<see cref="OneRepMaxEstimator"/> / <c>StreakCalculator</c> deseni); sonuç SAKLANMAZ.
///
/// Ölçüt tahmini 1RM'dir, rekor rozeti (<c>RecordType</c>) DEĞİL: tekrar rekoru ağırlık başına sayılır,
/// hafif bir ağırlıktaki önemsiz rekor platoyu kırılmış gösterirdi. Son <see cref="Weeks"/> haftada 1RM'i
/// hesaplanabilir hiç seti olmayan hareket bırakılmıştır, platoda değil — değerlendirilmez.
/// </summary>
public static class PlateauDetector
{
    /// <summary>Eşik (issue #72 kararı): sabit, sorgu parametresi değil.</summary>
    public const int Weeks = 6;

    private const int DaysPerWeek = 7;

    /// <summary>
    /// <paramref name="sets"/> bir hareketin setleridir, sırasız olabilir; <c>Day</c> setin TR günüdür.
    /// Son <see cref="Weeks"/> hafta bugün dahil son 42 gündür. Platoda değilse <c>null</c>.
    /// </summary>
    public static Plateau? Detect(IEnumerable<(DateOnly Day, decimal Weight, int Reps)> sets, DateOnly today)
    {
        var windowStart = today.AddDays(-(Weeks * DaysPerWeek - 1));

        var estimates = sets
            .Select(s => (s.Day, OneRepMax: OneRepMaxEstimator.Estimate(s.Weight, s.Reps)))
            .Where(s => s.OneRepMax is not null)
            .Select(s => (s.Day, OneRepMax: s.OneRepMax!.Value))
            .ToList();

        if (!estimates.Any(s => s.Day >= windowStart))
        {
            return null;
        }

        // En iyiye İLK ulaşılan gün: sonraki eşitlemeler onu geçmez, süreyi sıfırlamaz.
        var best = estimates.OrderByDescending(s => s.OneRepMax).ThenBy(s => s.Day).First();

        if (best.Day >= windowStart)
        {
            return null;
        }

        return new Plateau(best.OneRepMax, best.Day, (today.DayNumber - best.Day.DayNumber) / DaysPerWeek);
    }
}
