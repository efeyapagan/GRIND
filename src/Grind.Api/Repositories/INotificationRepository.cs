using Grind.Api.Models.Projections;

namespace Grind.Api.Repositories;

/// <summary>
/// Bildirimlerin kaynağı olan satırlar (#325). Bildirim tablosu yok: sorgular <c>Follow</c>,
/// <c>WorkoutSession</c> ve <c>SetEntry</c>'den okur; işi yapan kişi pasifse satır dışarıda kalır.
/// #628: sessize alınan aktörler (benim → onun takip satırında <c>NotificationsMuted</c>) HER sorguda dışarıda kalır.
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

    /// <summary>
    /// #419: <paramref name="userId"/>'nin ARKADAŞLARININ (karşılıklı takip) hedefe sayılabilecek
    /// antrenmanları -- seti olan, arkadaşlıktan sonra başlamış oturumlar. Hedefi olmayan ve
    /// gizlilik seviyesi <c>Gizli</c> olan kişiler sorguda elenir. Hangi oturumun hedefi
    /// tamamladığı çağıranın kararıdır (bkz. WeeklyGoalCompletion); burada ham satırlar döner.
    /// </summary>
    Task<IReadOnlyList<FriendSessionDayRow>> GetFriendGoalSessionsAsync(
        long userId, DateTime since, CancellationToken cancellationToken = default);

    /// <summary>Verilen antrenmanların rekor setleri (<c>RecordType != None</c>).</summary>
    Task<IReadOnlyList<RecordSetRow>> GetRecordSetsAsync(
        IReadOnlyCollection<long> sessionIds, CancellationToken cancellationToken = default);

    /// <summary>#628: bana gelen BEKLEYEN arkadaşlık istekleri, en yeni önce; gönderen pasifse dışarıda.</summary>
    Task<IReadOnlyList<FriendRequestEvent>> GetFriendRequestEventsAsync(
        long userId, DateTime since, int take, CancellationToken cancellationToken = default);
}
