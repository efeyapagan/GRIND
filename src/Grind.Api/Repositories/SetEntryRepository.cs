using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class SetEntryRepository(AppDbContext context)
    : Repository<SetEntry>(context), ISetEntryRepository
{
    public async Task<IReadOnlyList<SetEntry>> GetForUserAndExerciseAsync(
        long userId, long exerciseId, CancellationToken cancellationToken = default)
        => await Set
            .Where(s => s.ExerciseId == exerciseId && s.WorkoutSession.UserId == userId)
            .OrderBy(s => s.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<long>> GetDistinctExerciseIdsForSessionAsync(
        long sessionId, CancellationToken cancellationToken = default)
        => await Set
            .Where(s => s.WorkoutSessionId == sessionId)
            .Select(s => s.ExerciseId)
            .Distinct()
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyDictionary<long, int>> GetCompletedSetCountsAsync(
        long sessionId, CancellationToken cancellationToken = default)
        => await Set
            .Where(s => s.WorkoutSessionId == sessionId)
            .GroupBy(s => s.ExerciseId)
            .ToDictionaryAsync(g => g.Key, g => g.Count(), cancellationToken);
}
