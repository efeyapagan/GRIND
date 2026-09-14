using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class SessionExerciseRepository(AppDbContext context)
    : Repository<SessionExercise>(context), ISessionExerciseRepository
{
    public async Task<IReadOnlyList<SessionExercise>> GetForSessionAsync(
        long sessionId, CancellationToken cancellationToken = default)
        => await Set
            .Include(se => se.Exercise)
            .Where(se => se.WorkoutSessionId == sessionId)
            .OrderBy(se => se.OrderIndex)
            // Tie-break: sablonda ayni OrderIndex teorik olarak tekrar edebilir; sira sorgudan
            // sorguya degismesin.
            .ThenBy(se => se.Id)
            .ToListAsync(cancellationToken);

    public Task<SessionExercise?> GetAsync(
        long sessionId, long exerciseId, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(
            se => se.WorkoutSessionId == sessionId && se.ExerciseId == exerciseId, cancellationToken);

    public async Task<int> GetNextOrderIndexAsync(long sessionId, CancellationToken cancellationToken = default)
        // (int?) donusumu ZORUNLU: bos listede MaxAsync null'u ancak nullable tipte dondurebilir.
        => (await Set
            .Where(se => se.WorkoutSessionId == sessionId)
            .MaxAsync(se => (int?)se.OrderIndex, cancellationToken) ?? -1) + 1;
}
