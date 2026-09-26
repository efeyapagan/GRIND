using Grind.Api.Models.Projections;

namespace Grind.Api.Repositories;

/// <summary>
/// Bildirimlerin kaynağı olan satırlar (#325). Bildirim tablosu yok: sorgular <c>Follow</c>,
/// <c>WorkoutSession</c> ve <c>SetEntry</c>'den okur; işi yapan kişi pasifse satır dışarıda kalır.
/// </summary>
public interface INotificationRepository
{
    /// <summary><paramref name="userId"/>'yi takip edenler, <paramref name="since"/>'ten beri, en yeni önce.</summary>
    Task<IReadOnlyList<FollowEvent>> GetFollowEventsAsync(
        long userId, DateTime since, int take, CancellationToken cancellationToken = default);

    /// <summary>
    /// <paramref name="userId"/>'nin takip ettiklerinin, takipten SONRA bitmiş ve en az bir rekor seti olan
    /// antrenmanları, en yeni önce.
    /// </summary>
    Task<IReadOnlyList<RecordSessionEvent>> GetRecordSessionEventsAsync(
        long userId, DateTime since, int take, CancellationToken cancellationToken = default);

    /// <summary>Verilen antrenmanların rekor setleri (<c>RecordType != None</c>).</summary>
    Task<IReadOnlyList<RecordSetRow>> GetRecordSetsAsync(
        IReadOnlyCollection<long> sessionIds, CancellationToken cancellationToken = default);
}
