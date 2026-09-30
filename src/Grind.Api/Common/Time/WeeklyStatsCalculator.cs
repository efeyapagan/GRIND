using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;

namespace Grind.Api.Common.Time;

/// <summary>
/// #184: setleri Pazartesi–Pazar haftalarına toplar. Saf: DB ve saat bilmez, "bugün" dışarıdan gelir.
/// Hafta sınırı seri hesabıyla aynı (<see cref="StreakCalculator.WeekStart"/>); bir set, oturumunun
/// başladığı TR gününün haftasına düşer.
/// </summary>
public static class WeeklyStatsCalculator
{
    private const int DaysPerWeek = 7;

    public static IReadOnlyList<WeeklyStatsRow> Build(IEnumerable<WeeklySetRow> sets, DateOnly today)
    {
        var byWeek = sets
            .GroupBy(s => StreakCalculator.WeekStart(TurkeyDay.LocalDateOf(s.SessionStartedAt)))
            .ToDictionary(g => g.Key, g => g.ToList());

        if (byWeek.Count == 0)
        {
            return [];
        }

        var first = byWeek.Keys.Min();
        // Gelecek tarihli bir oturum (saat hatası) varsa satır kaybolmasın diye son hafta en az o haftadır.
        var last = new[] { StreakCalculator.WeekStart(today), byWeek.Keys.Max() }.Max();

        var rows = new List<WeeklyStatsRow>();
        for (var week = first; week <= last; week = week.AddDays(DaysPerWeek))
        {
            var weekSets = byWeek.GetValueOrDefault(week) ?? [];
            rows.Add(new WeeklyStatsRow(
                week,
                weekSets.Sum(s => s.Weight * (s.Reps ?? 0)),
                weekSets.Count(s => s.Category == ExerciseCategory.Push),
                weekSets.Count(s => s.Category == ExerciseCategory.Pull),
                weekSets.Count(s => s.Category == ExerciseCategory.Legs),
                weekSets.Count(s => s.Category == ExerciseCategory.Other)));
        }

        return rows;
    }
}
