using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class CardioEntryRepository(AppDbContext context)
    : Repository<CardioEntry>(context), ICardioEntryRepository
{
    public async Task<CardioEntry?> GetOwnedByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
        => await Set
            .Include(c => c.Exercise)
            .FirstOrDefaultAsync(c => c.Id == id && c.WorkoutSession.UserId == userId, cancellationToken);

    public async Task<IReadOnlyList<CardioEntry>> GetForSessionAsync(
        long sessionId, long userId, CancellationToken cancellationToken = default)
        => await Set
            .Include(c => c.Exercise)
            .Where(c => c.WorkoutSessionId == sessionId && c.WorkoutSession.UserId == userId)
            .OrderBy(c => c.StartedAt).ThenBy(c => c.Id)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<CardioEntry>> GetForSessionsAsync(
        IReadOnlyCollection<long> sessionIds, long userId, CancellationToken cancellationToken = default)
        => await Set
            .AsNoTracking()
            .Include(c => c.Exercise)
            .Where(c => sessionIds.Contains(c.WorkoutSessionId) && c.WorkoutSession.UserId == userId)
            .OrderBy(c => c.StartedAt).ThenBy(c => c.Id)
            .ToListAsync(cancellationToken);

    public async Task<CardioEntry?> GetRunningForSessionAsync(long sessionId, CancellationToken cancellationToken = default)
        => await Set
            .Include(c => c.Exercise)
            .FirstOrDefaultAsync(c => c.WorkoutSessionId == sessionId && c.DurationSeconds == null, cancellationToken);

    public async Task<IReadOnlyList<CardioEntry>> GetForUserAndExerciseAsync(
        long userId, long exerciseId, CancellationToken cancellationToken = default)
        => await Set
            .Where(c => c.ExerciseId == exerciseId && c.WorkoutSession.UserId == userId)
            .OrderBy(c => c.StartedAt).ThenBy(c => c.Id)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<CardioEntry>> GetFinishedForUserAsync(long userId, CancellationToken cancellationToken = default)
        => await Set
            .AsNoTracking()
            .Include(c => c.Exercise)
            .Where(c => c.WorkoutSession.UserId == userId && c.DurationSeconds != null)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyDictionary<long, int>> GetFinishedCountsAsync(
        long sessionId, CancellationToken cancellationToken = default)
        => await Set
            .Where(c => c.WorkoutSessionId == sessionId && c.DurationSeconds != null)
            .GroupBy(c => c.ExerciseId)
            .ToDictionaryAsync(g => g.Key, g => g.Count(), cancellationToken);

    public async Task<IReadOnlyList<long>> GetDistinctExerciseIdsForSessionAsync(
        long sessionId, CancellationToken cancellationToken = default)
        => await Set
            .Where(c => c.WorkoutSessionId == sessionId)
            .Select(c => c.ExerciseId)
            .Distinct()
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<WeeklySetRow>> GetWeeklyRowsAsync(long userId, CancellationToken cancellationToken = default)
        => await Set
            .Where(c => c.WorkoutSession.UserId == userId && c.DurationSeconds != null)
            .Select(c => new WeeklySetRow(c.WorkoutSession.StartedAt, 0m, null, ExerciseCategory.Cardio))
            .ToListAsync(cancellationToken);
}
