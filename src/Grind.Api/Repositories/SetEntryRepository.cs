using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
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

    public async Task<IReadOnlyList<SetEntry>> GetRecordCarryingSetsAsync(
        long userId, CancellationToken cancellationToken = default)
        => await Set
            .Include(s => s.Exercise)
            .Where(s => s.WorkoutSession.UserId == userId && s.RecordType != RecordType.None)
            .OrderBy(s => s.CreatedAt)
            .ThenBy(s => s.Id)
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
}
