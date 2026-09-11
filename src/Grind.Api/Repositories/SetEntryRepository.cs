using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Projections;
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
            // Tie-break ZORUNLU: sahte saatle girilen setlerin CreatedAt'i aynıdır ve
            // PostgreSQL eşit anahtarlarda sıra garantisi vermez. Belirsiz sıra =
            // sorgudan sorguya değişen rekor sonucu.
            .ThenBy(s => s.Id)
            .ToListAsync(cancellationToken);

    public async Task<SetEntry?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default)
        => await Set
            .Include(s => s.Exercise)
            .FirstOrDefaultAsync(
                s => s.Id == id && s.WorkoutSession.UserId == userId, cancellationToken);

    public async Task<IReadOnlyList<SetEntry>> GetForSessionAsync(
        long sessionId, long userId, CancellationToken cancellationToken = default)
        => await Set
            .Include(s => s.Exercise)
            .Where(s => s.WorkoutSessionId == sessionId && s.WorkoutSession.UserId == userId)
            .OrderBy(s => s.CreatedAt)
            .ThenBy(s => s.Id)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<SetEntry>> GetAllForUserAsync(
        long userId, CancellationToken cancellationToken = default)
        => await Set
            .Include(s => s.Exercise)
            .Where(s => s.WorkoutSession.UserId == userId)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<long>> GetDistinctExerciseIdsForSessionAsync(
        long sessionId, CancellationToken cancellationToken = default)
        => await Set
            .Where(s => s.WorkoutSessionId == sessionId)
            .Select(s => s.ExerciseId)
            .Distinct()
            .ToListAsync(cancellationToken);

    // ToDictionaryAsync'in seçicileri Func'tur, Expression<Func> değil — aradaki Select
    // olmadan EF, GroupBy + Count'u sunucuya (GROUP BY / count(*)) çeviremez; tüm satırlar
    // istemciye çekilip sayım bellekte yapılırdı. Bu Select'i kaldırma.
    public async Task<IReadOnlyDictionary<long, int>> GetCompletedSetCountsAsync(
        long sessionId, CancellationToken cancellationToken = default)
        => await Set
            .Where(s => s.WorkoutSessionId == sessionId)
            .GroupBy(s => s.ExerciseId)
            .Select(g => new { ExerciseId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ExerciseId, x => x.Count, cancellationToken);

    public async Task<IReadOnlyList<ExerciseVolume>> GetVolumeByExerciseAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default)
    {
        // Anonim tipe projekte edip sonra record'a çevirmek bilinçli (bkz. GetSessionAggregatesAsync).
        var rows = await FilterBySessionRange(userId, fromUtcInclusive, toUtcExclusive)
            .GroupBy(s => new { s.ExerciseId, s.Exercise.Name })
            .Select(g => new
            {
                g.Key.ExerciseId,
                g.Key.Name,
                Volume = g.Sum(s => s.Weight * s.Reps),
                SetCount = g.Count()
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(r => new ExerciseVolume(r.ExerciseId, r.Name, r.Volume, r.SetCount))
            .ToList();
    }

    public async Task<IReadOnlyList<SetEntry>> GetForSessionsAsync(
        IReadOnlyCollection<long> sessionIds,
        long userId,
        long? exerciseId,
        CancellationToken cancellationToken = default)
    {
        if (sessionIds.Count == 0)
        {
            // Boş sayfa: sorguyu hiç çalıştırma (boş IN listesi anlamsız).
            return [];
        }

        var query = Set
            .Include(s => s.Exercise)
            .Where(s => sessionIds.Contains(s.WorkoutSessionId) && s.WorkoutSession.UserId == userId);

        if (exerciseId is { } id)
        {
            query = query.Where(s => s.ExerciseId == id);
        }

        return await query
            .OrderBy(s => s.CreatedAt)
            .ThenBy(s => s.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SetEntry>> GetInRangeAsync(
        long userId,
        DateTime? fromUtcInclusive,
        DateTime? toUtcExclusive,
        CancellationToken cancellationToken = default)
        => await FilterBySessionRange(userId, fromUtcInclusive, toUtcExclusive)
            .AsNoTracking()
            .Include(s => s.Exercise)
            .OrderBy(s => s.CreatedAt)
            .ThenBy(s => s.Id)
            .ToListAsync(cancellationToken);

    /// <summary>
    /// Kullanıcının, oturumu verilen UTC aralığında BAŞLAMIŞ setleri. Egzersiz hacmi (Faz 9) ve
    /// export (Faz 11) aynı filtreyi paylaşır: iki kopya bir gün sessizce ayrışırdı.
    /// </summary>
    private IQueryable<SetEntry> FilterBySessionRange(
        long userId, DateTime? fromUtcInclusive, DateTime? toUtcExclusive)
    {
        var query = Set.Where(s => s.WorkoutSession.UserId == userId);

        if (fromUtcInclusive is { } from)
        {
            query = query.Where(s => s.WorkoutSession.StartedAt >= from);
        }

        if (toUtcExclusive is { } to)
        {
            query = query.Where(s => s.WorkoutSession.StartedAt < to);
        }

        return query;
    }
}
