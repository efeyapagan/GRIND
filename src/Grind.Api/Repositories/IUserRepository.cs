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
}
