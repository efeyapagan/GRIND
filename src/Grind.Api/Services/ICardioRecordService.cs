namespace Grind.Api.Services;

/// <summary>
/// #647: kardiyo rekorlarını yeniden tarar (geçerli kullanıcı). Kaydetmez — çağıran işlemi tek
/// <c>SaveChangesAsync</c>'te bitirir. Hem kardiyo uçları hem antrenman bitirme/silme kullanır.
/// </summary>
public interface ICardioRecordService
{
    Task RecalculateAsync(
        long exerciseId,
        long? excludeEntryId = null,
        long? excludeSessionId = null,
        CancellationToken cancellationToken = default);
}
