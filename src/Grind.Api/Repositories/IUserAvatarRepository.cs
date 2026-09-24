using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

public interface IUserAvatarRepository : IRepository<UserAvatar>
{
    /// <summary>Kullanıcının fotoğraf satırı (izlenen; değiştirmek ya da silmek için), yoksa <c>null</c>.</summary>
    Task<UserAvatar?> GetByUserIdAsync(long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Fotoğrafın son yükleme anı, yoksa <c>null</c> — baytları okumaz (profil yanıtı yalnızca
    /// "var mı, hangi sürüm" ister).
    /// </summary>
    Task<DateTime?> GetUpdatedAtAsync(long userId, CancellationToken cancellationToken = default);

    /// <summary>Verilen kullanıcıların fotoğraf yükleme anları (#284 satırları), tek sorgu; fotoğrafsız olan sözlükte yok.</summary>
    Task<IReadOnlyDictionary<long, DateTime>> GetUpdatedAtsAsync(
        IReadOnlyCollection<long> userIds, CancellationToken cancellationToken = default);

    /// <summary>
    /// AKTİF bir kullanıcının fotoğrafı, izlenmeden; kullanıcı yok, pasif ya da fotoğrafsızsa <c>null</c>.
    /// <paramref name="normalizedUsername"/> küçük harfe çevrilmiş olmalı.
    /// </summary>
    Task<UserAvatar?> GetByActiveUsernameAsync(string normalizedUsername, CancellationToken cancellationToken = default);
}
