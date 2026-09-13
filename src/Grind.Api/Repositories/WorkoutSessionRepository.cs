using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Projections;
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
        // Yalnızca şablon adı için Include(Template) — koleksiyon Include'u yok, tek bir
        // LEFT JOIN'e mal olur, kartezyen patlama veya N+1 yaratmaz. `progress` listede
        // bilerek boş kalır (bkz. WorkoutSessionService.GetAllAsync yorumu).
        => await Set
            .Include(s => s.Template)
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

    public async Task<(IReadOnlyList<WorkoutSession> Sessions, int TotalCount)> GetHistoryPageAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        long? exerciseId,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var query = FilterHistory(userId, fromUtcInclusive, toUtcExclusive, exerciseId);

        var totalCount = await query.CountAsync(cancellationToken);

        var sessions = await query
            // Yalnızca şablon adı için tek LEFT JOIN — koleksiyon Include'u yok (kartezyen
            // patlama olmasın); setler ayrı bir sorguda toplu çekilir (N+1 yok).
            .Include(s => s.Template)
            .OrderByDescending(s => s.StartedAt)
            .ThenByDescending(s => s.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        return (sessions, totalCount);
    }

    public async Task<IReadOnlyList<SessionAggregate>> GetSessionAggregatesAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default)
    {
        // Önce anonim tipe projekte edip sonra record'a çevirmek bilinçli: aggregate'li bir
        // GroupBy/Select ifadesinde doğrudan record kurucusu kullanmak, EF'in sorguyu
        // çeviremediği durumda sessizce istemci tarafı değerlendirmeye kayma riski taşır.
        var rows = await FilterByRange(userId, fromUtcInclusive, toUtcExclusive)
            .Where(s => s.SetEntries.Any())
            .Select(s => new
            {
                s.Id,
                s.StartedAt,
                SetCount = s.SetEntries.Count(),
                Volume = s.SetEntries.Sum(e => e.Weight * e.Reps)
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(r => new SessionAggregate(r.Id, r.StartedAt, r.SetCount, r.Volume))
            .ToList();
    }

    public async Task<IReadOnlyList<DateTime>> GetTrainedSessionStartsAsync(
        long userId, CancellationToken cancellationToken = default)
        => await Set
            .Where(s => s.UserId == userId && s.SetEntries.Any())
            .Select(s => s.StartedAt)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<WorkoutSession>> GetInRangeAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default)
        => await FilterByRange(userId, fromUtcInclusive, toUtcExclusive)
            .AsNoTracking()
            // Yalnızca şablon adı için tek LEFT JOIN; setler ayrı sorguda toplu çekilir.
            .Include(s => s.Template)
            .OrderBy(s => s.StartedAt)
            .ThenBy(s => s.Id)
            .ToListAsync(cancellationToken);

    private IQueryable<WorkoutSession> FilterHistory(
        long userId, DateTime? fromUtcInclusive, DateTime? toUtcExclusive, long? exerciseId)
    {
        var query = FilterByRange(userId, fromUtcInclusive, toUtcExclusive);

        if (exerciseId is { } id)
        {
            query = query.Where(s => s.SetEntries.Any(e => e.ExerciseId == id));
        }

        return query;
    }

    private IQueryable<WorkoutSession> FilterByRange(
        long userId, DateTime? fromUtcInclusive, DateTime? toUtcExclusive)
    {
        var query = Set.Where(s => s.UserId == userId);

        if (fromUtcInclusive is { } from)
        {
            query = query.Where(s => s.StartedAt >= from);
        }

        if (toUtcExclusive is { } to)
        {
            query = query.Where(s => s.StartedAt < to);
        }

        return query;
    }
}
