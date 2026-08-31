using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

public interface IExerciseRepository : IRepository<Exercise>
{
    /// <summary>Kullanıcının kendi egzersizleri + global egzersizler, isme göre sıralı.</summary>
    Task<IReadOnlyList<Exercise>> GetVisibleAsync(
        long userId, bool includeArchived = false, CancellationToken cancellationToken = default);

    /// <summary>
    /// Yalnızca kullanıcının erişebildiği bir egzersizi döndürür; başkasının özel
    /// egzersizinde null döner (IDOR koruması).
    /// </summary>
    Task<Exercise?> GetVisibleByIdAsync(long id, long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bu isim kullanıcı için zaten dolu mu — kendi egzersizlerinde veya globallerde,
    /// büyük/küçük harf gözetmeden, arşivliler dâhil.
    /// </summary>
    Task<bool> NameExistsAsync(long userId, string name, CancellationToken cancellationToken = default);
}
