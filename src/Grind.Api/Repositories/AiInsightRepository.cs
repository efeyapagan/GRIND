using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class AiInsightRepository(AppDbContext context)
    : Repository<AiInsight>(context), IAiInsightRepository
{
    public Task<AiInsight?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, cancellationToken);

    public async Task<(IReadOnlyList<AiInsight> Items, int TotalCount)> GetPageAsync(
        long userId,
        AiInsightKind? kind,
        long? workoutSessionId,
        long? setEntryId,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var query = Set.Where(a => a.UserId == userId);

        if (kind is { } k)
        {
            query = query.Where(a => a.Kind == k);
        }

        if (workoutSessionId is { } sessionId)
        {
            query = query.Where(a => a.WorkoutSessionId == sessionId);
        }

        if (setEntryId is { } setId)
        {
            query = query.Where(a => a.SetEntryId == setId);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }
}
