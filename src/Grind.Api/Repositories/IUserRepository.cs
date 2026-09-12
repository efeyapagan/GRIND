using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

public interface IUserRepository : IRepository<User>
{
    /// <summary>
    /// Tam eşleşme arar. Kullanıcı adları veritabanında her zaman küçük harf durur;
    /// normalizasyon kayıt anında servis katmanında yapılır.
    /// </summary>
    Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default);

    Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kullanıcı VAR MI ve AKTİF Mİ (<c>DeletedAt IS NULL</c>). Kimlikli her istekte bir kez çağrılır
    /// (Faz 13 spec Karar 3), bu yüzden entity materyalize etmez: birincil anahtar üzerinde tek
    /// <c>EXISTS</c> sorgusu.
    /// </summary>
    Task<bool> ExistsActiveAsync(long id, CancellationToken cancellationToken = default);
}
