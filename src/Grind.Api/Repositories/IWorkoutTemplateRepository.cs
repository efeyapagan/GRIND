using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

/// <summary>
/// Exercise'ın aksine şablonun global hâli YOKTUR (<c>UserId</c> nullable değil), bu yüzden
/// metot adları "Visible" değil "Owned": görünür olan zaten sahip olunandır.
/// </summary>
public interface IWorkoutTemplateRepository : IRepository<WorkoutTemplate>
{
    Task<IReadOnlyList<WorkoutTemplate>> GetAllAsync(
        long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Egzersiz listesini <c>OrderIndex</c> sırasıyla ve her satırın <c>Exercise</c>'ıyla
    /// birlikte yükler — yanıt DTO'su egzersizin adını ve kategorisini gösteriyor.
    /// Başkasının şablonunda null döner (IDOR koruması).
    /// </summary>
    Task<WorkoutTemplate?> GetOwnedByIdAsync(
        long id, long userId, CancellationToken cancellationToken = default);

    /// <summary>Büyük/küçük harf gözetmez. <paramref name="excludeId"/> verilirse o kayıt sayılmaz.</summary>
    Task<bool> NameExistsAsync(
        long userId, string name, long? excludeId = null, CancellationToken cancellationToken = default);
}
