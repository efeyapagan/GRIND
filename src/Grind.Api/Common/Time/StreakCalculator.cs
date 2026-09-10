namespace Grind.Api.Common.Time;

/// <summary>
/// Antrenman serisi (streak) hesabının TEK karar noktası. Veritabanı bilmez, saat bilmez —
/// yalnızca antrenman yapılmış TR günlerini ve "bugün"ü görür. <c>RecordTracker</c> ile aynı
/// desen: kural saf bir fonksiyonda yaşar, testleri DB istemez.
/// </summary>
public static class StreakCalculator
{
    /// <summary>
    /// <paramref name="trainedDays"/> sırasız ve yinelenen olabilir (aynı günde birden fazla
    /// oturum olabilir — CLAUDE.md). Dönen <c>Current</c>, bugün antrenman yapılmamışsa dünden
    /// geriye sayılır: gün henüz bitmediği için seri kırılmış sayılmaz (spec Karar 3).
    /// </summary>
    public static (int Current, int Longest) Calculate(
        IEnumerable<DateOnly> trainedDays, DateOnly today)
    {
        var days = trainedDays.ToHashSet();

        if (days.Count == 0)
        {
            return (0, 0);
        }

        return (CurrentStreak(days, today), LongestStreak(days));
    }

    private static int CurrentStreak(HashSet<DateOnly> days, DateOnly today)
    {
        // Bugün antrenman varsa bugünden, yoksa dünden geriye sayılır. Doğrudan bugünden
        // saymak, akşam antrenmanını henüz yapmamış kullanıcıya seriyi 0 gösterirdi.
        var cursor = days.Contains(today) ? today : today.AddDays(-1);
        var streak = 0;

        while (days.Contains(cursor))
        {
            streak++;
            cursor = cursor.AddDays(-1);
        }

        return streak;
    }

    private static int LongestStreak(HashSet<DateOnly> days)
    {
        var longest = 0;
        var run = 0;
        DateOnly? previous = null;

        foreach (var day in days.Order())
        {
            run = previous is { } yesterday && yesterday.AddDays(1) == day ? run + 1 : 1;
            longest = Math.Max(longest, run);
            previous = day;
        }

        return longest;
    }
}
