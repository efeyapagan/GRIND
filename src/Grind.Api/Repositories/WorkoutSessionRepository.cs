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
}
