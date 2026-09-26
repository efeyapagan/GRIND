using Grind.Api.Models.Enums;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

/// <summary>"Seni takip etti" — satır silinince (takip bırakılınca) bildirim de yoktur.</summary>
public class FollowNotificationSource(INotificationRepository repository) : INotificationSource
{
    public async Task<IReadOnlyList<NotificationItem>> GetAsync(
        long userId, DateTime since, int limit, CancellationToken cancellationToken = default)
        => (await repository.GetFollowEventsAsync(userId, since, limit, cancellationToken))
            .Select(e => new NotificationItem(NotificationKind.Follow, e.OccurredAt, e.FollowId, e.Actor, null))
            .ToList();
}
