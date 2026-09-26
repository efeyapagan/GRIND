using Grind.Api.Models.Enums;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

/// <summary>
/// Takip ettiğin birinin rekorlu antrenmanı — antrenman bitince tek bildirim. Rekor rozetleri
/// (<c>RecordType</c>) yeniden hesaplanırsa bildirim güncel durumu gösterir.
/// </summary>
public class RecordNotificationSource(INotificationRepository repository) : INotificationSource
{
    public async Task<IReadOnlyList<NotificationItem>> GetAsync(
        long userId, DateTime since, int limit, CancellationToken cancellationToken = default)
    {
        var sessions = await repository.GetRecordSessionEventsAsync(userId, since, limit, cancellationToken);
        if (sessions.Count == 0)
            return [];

        var sets = (await repository.GetRecordSetsAsync(sessions.Select(s => s.SessionId).ToList(), cancellationToken))
            .ToLookup(s => s.SessionId);

        return sessions
            .Select(s => new NotificationItem(
                NotificationKind.Records, s.OccurredAt, s.SessionId, s.Actor, BestRecordPicker.Pick(sets[s.SessionId])))
            .ToList();
    }
}
