using Grind.Api.Models.Enums;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

/// <summary>#628: "sana arkadaşlık isteği gönderdi" — saklanan bir istek satırından türer; kabul/ret edilince kaybolur.</summary>
public class FriendRequestNotificationSource(INotificationRepository repository) : INotificationSource
{
    public async Task<IReadOnlyList<NotificationItem>> GetAsync(
        long userId, DateTime since, int limit, CancellationToken cancellationToken = default)
        => (await repository.GetFriendRequestEventsAsync(userId, since, limit, cancellationToken))
            .Select(e => new NotificationItem(NotificationKind.FriendRequest, e.OccurredAt, e.RequestId, e.Actor, null))
            .ToList();
}
