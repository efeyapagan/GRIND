using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;

namespace Grind.Api.Common.Records;

/// <summary>
/// Aşırı yüklenme (overreaching) tespitinin TEK karar noktası (#176). Saf ve durumsuz —
/// <see cref="PlateauDetector"/> deseni; sonuç SAKLANMAZ. Sinyal = "daha az kaldırıyorum ama daha çok
/// zorlanıyorum": en az <see cref="MinDroppingExercises"/> harekette tahmini 1RM'in son dönemdeki en iyisi
/// önceki dönemin en iyisinden ≥ %<see cref="DropThresholdPercent"/> düşük VE efor arttı (RIR düştü ya da
/// oturumlar Zor/Maksimal). Efor verisi hiç girilmemişse sinyal yanmaz: yalnızca performans düşüşü bilinçli
/// deload, hastalık ya da tatil sonrasında da görülür.
/// </summary>
public static class OverreachingDetector
{
    public const int RecentDays = 14;
    public const int PreviousDays = 28;
    public const decimal DropThresholdPercent = 5m;
    public const int MinDroppingExercises = 2;
    public const decimal MinRirDrop = 1m;
    public const int MinRirSets = 2;
    public const int MinRatedSessions = 2;

    /// <summary>Kaydırıcının "4+" durağı 5 saklanır; #266 öncesi büyük eski değerler de 5 sayılır.</summary>
    private const decimal MaxRir = 5m;

    /// <summary>Önceki dönemin ilk TR günü — repository bu günden itibaren okur.</summary>
    public static DateOnly WindowStart(DateOnly today) => today.AddDays(-(RecentDays + PreviousDays - 1));

    public static OverreachingSignalResponse? Detect(IEnumerable<OverreachingSetRow> rows, DateOnly today)
    {
        var recentStart = today.AddDays(-(RecentDays - 1));
        var windowStart = WindowStart(today);

        var dated = rows
            .Select(r => (Row: r, Day: TurkeyDay.LocalDateOf(r.SessionStartedAt)))
            .Where(x => x.Day >= windowStart && x.Day <= today)
            .Select(x => (x.Row, Recent: x.Day >= recentStart))
            .ToList();

        var drops = Drops(dated);
        if (drops.Count < MinDroppingExercises)
        {
            return null;
        }

        var (rirBefore, rirRecent) = RirAverages(dated);
        var rirRose = rirBefore is { } before && rirRecent is { } recent && before - recent >= MinRirDrop;

        var rated = dated
            .Where(x => x.Recent && x.Row.SessionEnded && x.Row.Difficulty is not null)
            .GroupBy(x => x.Row.SessionId)
            .Select(g => g.First().Row.Difficulty!.Value)
            .ToList();
        var hard = rated.Count(d => d is SessionDifficulty.Hard or SessionDifficulty.Maximal);
        var difficultyRose = rated.Count >= MinRatedSessions && hard * 2 >= rated.Count;

        if (!rirRose && !difficultyRose)
        {
            return null;
        }

        return new OverreachingSignalResponse(
            drops,
            rirBefore is null ? null : decimal.Round(rirBefore.Value, 1, MidpointRounding.AwayFromZero),
            rirRecent is null ? null : decimal.Round(rirRecent.Value, 1, MidpointRounding.AwayFromZero),
            hard,
            rated.Count);
    }

    private static List<ExerciseDropResponse> Drops(List<(OverreachingSetRow Row, bool Recent)> dated) =>
        dated
            .Where(x => x.Row.Measurement == ExerciseMeasurement.WeightReps && x.Row.Reps is not null)
            .Select(x => (x.Row, x.Recent, OneRepMax: OneRepMaxEstimator.Estimate(x.Row.Weight, x.Row.Reps!.Value)))
            .Where(x => x.OneRepMax is not null)
            .GroupBy(x => x.Row.ExerciseId)
            .Select(g =>
            {
                var previous = g.Where(x => !x.Recent).Select(x => x.OneRepMax!.Value).ToList();
                var recent = g.Where(x => x.Recent).Select(x => x.OneRepMax!.Value).ToList();
                if (previous.Count == 0 || recent.Count == 0)
                {
                    return null;
                }

                var previousBest = previous.Max();
                var recentBest = recent.Max();
                // Eşik YUVARLANMAMIŞ oranla karşılaştırılır: %4,95 "%5,0" yazılsa da düşüş sayılmaz.
                var drop = (previousBest - recentBest) / previousBest * 100m;
                return drop >= DropThresholdPercent
                    ? new ExerciseDropResponse(g.Key, g.First().Row.ExerciseName, previousBest, recentBest,
                        decimal.Round(drop, 1, MidpointRounding.AwayFromZero))
                    : null;
            })
            .OfType<ExerciseDropResponse>()
            .OrderByDescending(d => d.DropPercent)
            .ThenBy(d => d.ExerciseName)
            .ToList();

    private static (decimal? Before, decimal? Recent) RirAverages(List<(OverreachingSetRow Row, bool Recent)> dated)
    {
        var before = dated.Where(x => !x.Recent && x.Row.Rir is not null)
            .Select(x => Math.Min(x.Row.Rir!.Value, MaxRir)).ToList();
        var recent = dated.Where(x => x.Recent && x.Row.Rir is not null)
            .Select(x => Math.Min(x.Row.Rir!.Value, MaxRir)).ToList();

        return before.Count >= MinRirSets && recent.Count >= MinRirSets
            ? (before.Average(), recent.Average())
            : (null, null);
    }
}
