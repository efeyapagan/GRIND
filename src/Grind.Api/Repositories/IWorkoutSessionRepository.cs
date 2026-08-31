using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

public interface IWorkoutSessionRepository : IRepository<WorkoutSession>
{
    /// <summary>
    /// Kullanıcının verilen UTC aralığında başlamış ve hâlâ açık (EndedAt null) oturumu.
    /// Aralığı TR yerel gününden hesaplamak servisin işidir — saat dilimi politikası
    /// bu katmana ait değildir.
    /// </summary>
    Task<WorkoutSession?> GetOpenSessionStartedBetweenAsync(
        long userId,
        DateTime fromUtcInclusive,
        DateTime toUtcExclusive,
        CancellationToken cancellationToken = default);
}
