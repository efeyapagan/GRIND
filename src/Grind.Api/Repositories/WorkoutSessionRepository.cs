using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class WorkoutSessionRepository(AppDbContext context)
    : Repository<WorkoutSession>(context), IWorkoutSessionRepository
{
    public Task<WorkoutSession?> GetOpenSessionStartedBetweenAsync(
        long userId,
        DateTime fromUtcInclusive,
        DateTime toUtcExclusive,
        CancellationToken cancellationToken = default)
        => Set
            .Where(s => s.UserId == userId
                        && s.EndedAt == null
                        && s.StartedAt >= fromUtcInclusive
                        && s.StartedAt < toUtcExclusive)
            .OrderByDescending(s => s.StartedAt)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<WorkoutSession>> GetAllAsync(
        long userId, CancellationToken cancellationToken = default)
        => await Set
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.StartedAt)
            .ToListAsync(cancellationToken);

    public Task<WorkoutSession?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default)
        => Set
            .Include(s => s.Template!)
                .ThenInclude(t => t.TemplateExercises.OrderBy(te => te.OrderIndex))
                    .ThenInclude(te => te.Exercise)
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, cancellationToken);
}
