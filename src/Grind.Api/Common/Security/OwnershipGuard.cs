using Grind.Api.Common.Exceptions;

namespace Grind.Api.Common.Security;

/// <summary>
/// CLAUDE.md'nin sahiplik kuralının tek uygulaması. Saf fonksiyonlar — bağımlılığı yok,
/// her servis aynı kararı aynı şekilde verir.
/// </summary>
public static class OwnershipGuard
{
    /// <summary>Okuma/listeleme için: kendi kaydı ya da global (UserId = null).</summary>
    public static bool IsVisibleTo(long? ownerId, long currentUserId)
        => ownerId is null || ownerId == currentUserId;

    /// <summary>
    /// Değiştirme için: yalnızca kullanıcının KENDİ kaydı. Global kayıtlar (null) kimsenin
    /// malı değildir — görülebilirler ama değiştirilemezler.
    /// </summary>
    public static bool IsOwnedBy(long? ownerId, long currentUserId)
        => ownerId == currentUserId;

    /// <summary>
    /// Değiştirme/silme öncesi kapı. Başkasının ÖZEL kaydı buraya hiç ulaşmamalıdır —
    /// repository onu zaten görünmez kılar ve servis öncesinde NotFoundException fırlatır
    /// (varlık bilgisi sızdırılmasın diye). Buraya ulaşan tek "hayır" durumu global kayıttır.
    /// </summary>
    public static void EnsureOwnedBy(long? ownerId, long currentUserId, string resourceName)
    {
        if (!IsOwnedBy(ownerId, currentUserId))
        {
            throw new ForbiddenException($"{resourceName} üzerinde değişiklik yapma izniniz yok.");
        }
    }
}
