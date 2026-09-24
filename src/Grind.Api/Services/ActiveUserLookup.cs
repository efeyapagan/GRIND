using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

/// <summary>
/// Kullanıcı adıyla hedef alınan başka bir kullanıcının çözümü (#281, #282) — tek yerde, "pasif = yok"
/// kuralı servisler arasında ayrışmasın diye.
/// </summary>
internal static class ActiveUserLookup
{
    /// <summary>Pasif hesap, olmayan hesapla aynı 404'ü alır — pasifliği sızmaz.</summary>
    public static async Task<User> GetActiveByUsernameOrThrowAsync(
        this IUserRepository userRepository, string username, CancellationToken cancellationToken)
    {
        var user = await userRepository.GetByUsernameAsync(UsernameNormalizer.Normalize(username), cancellationToken);
        return user is { DeletedAt: null } ? user : throw new NotFoundException("Kullanıcı bulunamadı.");
    }
}
