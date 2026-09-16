namespace Grind.Api.Common.Time;

/// <summary>
/// Antrenman serisi (streak) hesabının TEK karar noktası. Veritabanı bilmez, saat bilmez —
/// yalnızca antrenman yapılmış TR günlerini ve "bugün"ü görür. <c>RecordTracker</c> ile aynı
/// desen: kural saf bir fonksiyonda yaşar, testleri DB istemez.
///
/// Seri HAFTA sayar (#96): hafta Pazartesi–Pazar; dinlenme günleri seriyi bozmaz. Hedef serisi (#97)
/// aynı hesaptır, yalnızca bir haftanın sayılması için gereken FARKLI gün sayısı kullanıcının haftalık
/// hedefidir — ayrı bir hesaplayıcı yazılmaz (DRY).
/// </summary>
public static class StreakCalculator
{
    private const int DaysPerWeek = 7;

    /// <summary>
    /// <paramref name="trainedDays"/> sırasız ve yinelenen olabilir (aynı günde birden fazla oturum
    /// olabilir — CLAUDE.md); aynı gün bir kez sayılır. Bir hafta, içinde en az
    /// <paramref name="minDaysPerWeek"/> farklı antrenman günü varsa seriye dahildir. Dönen
    /// <c>Current</c>, içinde bulunulan hafta henüz şartı sağlamıyorsa geçen haftadan geriye sayılır:
    /// hafta henüz bitmediği için seri kırılmış sayılmaz.
    /// </summary>
    public static (int Current, int Longest) Calculate(
        IEnumerable<DateOnly> trainedDays, DateOnly today, int minDaysPerWeek = 1)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(minDaysPerWeek, 1);

        var weeks = trainedDays
            .Distinct()
            .GroupBy(WeekStart)
            .Where(week => week.Count() >= minDaysPerWeek)
            .Select(week => week.Key)
            .ToHashSet();

        if (weeks.Count == 0)
        {
            return (0, 0);
        }

        return (CurrentStreak(weeks, WeekStart(today)), LongestStreak(weeks));
    }

    /// <summary>Günün dahil olduğu haftanın Pazartesisi.</summary>
    public static DateOnly WeekStart(DateOnly day) =>
        day.AddDays(-(((int)day.DayOfWeek + 6) % DaysPerWeek));

    /// <summary>Günün haftasındaki FARKLI antrenman günü sayısı ("bu hafta 2 / 4 gün").</summary>
    public static int TrainedDaysInWeekOf(IEnumerable<DateOnly> trainedDays, DateOnly day)
    {
        var start = WeekStart(day);
        return trainedDays.Distinct().Count(trained => WeekStart(trained) == start);
    }

    private static int CurrentStreak(HashSet<DateOnly> weeks, DateOnly thisWeek)
    {
        // Bu hafta sayılıyorsa bu haftadan, yoksa geçen haftadan geriye sayılır. Doğrudan bu haftadan
        // saymak, Pazartesi sabahı uygulamayı açan kullanıcıya seriyi 0 gösterirdi.
        var cursor = weeks.Contains(thisWeek) ? thisWeek : thisWeek.AddDays(-DaysPerWeek);
        var streak = 0;

        while (weeks.Contains(cursor))
        {
            streak++;
            cursor = cursor.AddDays(-DaysPerWeek);
        }

        return streak;
    }

    private static int LongestStreak(HashSet<DateOnly> weeks)
    {
        var longest = 0;
        var run = 0;
        DateOnly? previous = null;

        foreach (var week in weeks.Order())
        {
            run = previous is { } lastWeek && lastWeek.AddDays(DaysPerWeek) == week ? run + 1 : 1;
            longest = Math.Max(longest, run);
            previous = week;
        }

        return longest;
    }
}
