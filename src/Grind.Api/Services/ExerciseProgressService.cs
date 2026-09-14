using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Records;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class ExerciseProgressService(
    IExerciseRepository exerciseRepository,
    ISetEntryRepository setEntryRepository,
    ICurrentUserService currentUser) : IExerciseProgressService
{
    /// <summary>Sahiplik hakkında hiçbir şey söylemeyen TEK metin (geçmiş ucuyla aynı).</summary>
    private const string ExerciseNotFound = "Egzersiz bulunamadı.";

    public async Task<ExerciseProgressResponse> GetAsync(
        long exerciseId, StatsRangeQuery query, CancellationToken cancellationToken = default)
    {
        var (fromUtc, toUtc) = LocalDayRange.Resolve(query.From, query.To);

        // IDOR: kendi ya da global egzersiz; başkasının özel egzersizi nötr 404 (CLAUDE.md).
        var exercise = await exerciseRepository.GetVisibleByIdAsync(
                           exerciseId, currentUser.UserId, cancellationToken: cancellationToken)
                       ?? throw new NotFoundException(ExerciseNotFound);

        var sets = await setEntryRepository.GetForExerciseInRangeAsync(
            currentUser.UserId, exerciseId, fromUtc, toUtc, cancellationToken);

        // Gruplama bellekte: tek kullanıcının tek egzersize ait setleri küçük; TR günü kuralının SQL'de
        // ikinci bir kopyası yazılmaz (Faz 9 Karar 6).
        var points = sets
            .GroupBy(s => s.WorkoutSessionId)
            .Select(g =>
            {
                var startedAt = g.First().WorkoutSession.StartedAt;
                var top = g.OrderByDescending(s => s.Weight).ThenByDescending(s => s.Reps).First();
                return new ExerciseProgressPointResponse(
                    g.Key,
                    startedAt,
                    TurkeyDay.LocalDateOf(startedAt),
                    top.Weight,
                    top.Reps,
                    g.Sum(s => s.Weight * s.Reps),
                    g.Count(),
                    // Max, null değerleri yok sayar; hepsi null ise null döner.
                    g.Max(s => OneRepMaxEstimator.Estimate(s.Weight, s.Reps)));
            })
            .OrderBy(p => p.StartedAt)
            .ThenBy(p => p.SessionId)
            .ToList();

        return new ExerciseProgressResponse(exercise.Id, exercise.Name, points);
    }
}
