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

    /// <summary>Kullanıcının tüm oturumları, yeniden eskiye.</summary>
    Task<IReadOnlyList<WorkoutSession>> GetAllAsync(
        long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Başkasının oturumunda null döner (IDOR koruması). Şablonu ve şablonun egzersizlerini
    /// de yükler — ilerleme hesabı hedef set sayılarına ve egzersiz adlarına ihtiyaç duyuyor.
    /// </summary>
    Task<WorkoutSession?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default);
}
