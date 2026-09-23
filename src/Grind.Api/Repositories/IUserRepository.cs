using Grind.Api.Models.Entities;
using Grind.Api.Models.Projections;

namespace Grind.Api.Repositories;

public interface IUserRepository : IRepository<User>
{
    /// <summary>
    /// Tam eşleşme arar. Kullanıcı adları veritabanında her zaman küçük harf durur;
    /// normalizasyon kayıt anında servis katmanında yapılır.
    /// </summary>
    Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>
    /// <paramref name="excludeId"/> verilirse o id'nin kendi satırı sayılmaz -- profilde kullanıcı
    /// adını hiç değiştirmeden (ya da yalnızca büyük/küçük harf normalize ederek) kaydetmek,
    /// kendi kaydıyla çakışıyormuş gibi görünüp sahte bir 409 üretmesin (issue #65).
    /// </summary>
    Task<bool> UsernameExistsAsync(
        string username, long? excludeId = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kullanıcı VAR MI ve AKTİF Mİ (<c>DeletedAt IS NULL</c>). Kimlikli her istekte bir kez çağrılır
    /// (Faz 13 spec Karar 3), bu yüzden entity materyalize etmez: birincil anahtar üzerinde tek
    /// <c>EXISTS</c> sorgusu.
    /// </summary>
    Task<bool> ExistsActiveAsync(long id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kullanıcı adı <paramref name="normalizedPrefix"/> ile başlayan AKTİF kullanıcılar, ada göre
    /// sıralı (#281 arama). <paramref name="excludeId"/> (aramayı yapan) sonuçta yer almaz.
    /// </summary>
    Task<IReadOnlyList<UserRef>> SearchActiveByUsernamePrefixAsync(
        string normalizedPrefix, long excludeId, int take, CancellationToken cancellationToken = default);
}
