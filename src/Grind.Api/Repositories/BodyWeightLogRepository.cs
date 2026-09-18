using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class BodyWeightLogRepository(AppDbContext context)
    : Repository<BodyWeightLog>(context), IBodyWeightLogRepository
{
    public Task<BodyWeightLog?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId, cancellationToken);

    public async Task<(IReadOnlyList<BodyWeightLog> Items, int TotalCount)> GetPageAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var query = FilterByRange(userId, fromUtcInclusive, toUtcExclusive);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .AsNoTracking()
            .OrderByDescending(b => b.RecordedAt)
            .ThenByDescending(b => b.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<IReadOnlyList<BodyWeightLog>> GetInRangeAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default)
        => await FilterByRange(userId, fromUtcInclusive, toUtcExclusive)
            .AsNoTracking()
            .OrderBy(b => b.RecordedAt)
            .ThenBy(b => b.Id)
            .ToListAsync(cancellationToken);

    public Task<bool> ExistsWithSameMeasurementAsync(
        long userId,
        DateTime dayFromUtcInclusive,
        DateTime dayToUtcExclusive,
        decimal weight,
        decimal heightCm,
        CancellationToken cancellationToken = default)
        => Set.AnyAsync(b =>
            b.UserId == userId
            && b.RecordedAt >= dayFromUtcInclusive && b.RecordedAt < dayToUtcExclusive
            && b.Weight == weight && b.HeightCm == heightCm,
            cancellationToken);

    private IQueryable<BodyWeightLog> FilterByRange(
        long userId, DateTime? fromUtcInclusive, DateTime? toUtcExclusive)
    {
        var query = Set.Where(b => b.UserId == userId);

        if (fromUtcInclusive is { } from)
        {
            query = query.Where(b => b.RecordedAt >= from);
        }

        if (toUtcExclusive is { } to)
        {
            query = query.Where(b => b.RecordedAt < to);
        }

        return query;
    }
}
