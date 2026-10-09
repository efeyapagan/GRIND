using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Notifications;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Notification;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class NotificationService(
    IEnumerable<INotificationSource> sources,
    IUserRepository userRepository,
    IMutedNotificationCategoryRepository mutedCategoryRepository,
    IUserSummaryBuilder summaryBuilder,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : INotificationService
{
    public static readonly TimeSpan Window = TimeSpan.FromDays(30);
    public const int Limit = 50;

    public async Task<IReadOnlyList<NotificationResponse>> GetAsync(CancellationToken cancellationToken = default)
    {
        var (items, seenAt, kapali) = await CollectAsync(cancellationToken);
        var actors = items.Select(i => i.Actor).DistinctBy(a => a.Id).ToList();
        var summaries = (await summaryBuilder.BuildAsync(actors, cancellationToken))
            .Zip(actors, (summary, actor) => (actor.Id, summary))
            .ToDictionary(p => p.Id, p => p.summary);

        return items
            .Select(i => new NotificationResponse(i.Kind, i.OccurredAt, IsUnread(i, seenAt, kapali), summaries[i.Actor.Id], i.Records))
            .ToList();
    }

    public async Task<UnreadNotificationCountResponse> GetUnreadCountAsync(CancellationToken cancellationToken = default)
    {
        var (items, seenAt, kapali) = await CollectAsync(cancellationToken);
        return new UnreadNotificationCountResponse(items.Count(i => IsUnread(i, seenAt, kapali)));
    }

    public async Task MarkSeenAsync(CancellationToken cancellationToken = default)
    {
        var user = await CurrentUserAsync(cancellationToken);
        user.NotificationsSeenAt = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Kapalı kategoride listede kalan bildirim (arkadaşlık isteği) okunmamış SAYILMAZ: rozet yanmaz.</summary>
    private static bool IsUnread(NotificationItem item, DateTime? seenAt, HashSet<NotificationCategory> muted)
        => !muted.Contains(NotificationCategories.Of(item.Kind)) && (seenAt is null || item.OccurredAt > seenAt);

    private async Task<(IReadOnlyList<NotificationItem> Items, DateTime? SeenAt, HashSet<NotificationCategory> Muted)> CollectAsync(
        CancellationToken cancellationToken)
    {
        var user = await CurrentUserAsync(cancellationToken);
        var since = timeProvider.GetUtcNow().UtcDateTime - Window;

        // DbContext eşzamanlı sorgu kaldırmaz — kaynaklar sırayla.
        var all = new List<NotificationItem>();
        foreach (var source in sources)
            all.AddRange(await source.GetAsync(user.Id, since, Limit, cancellationToken));

        // #410: kapatılan kategorinin bildirimleri listeden düşer (listede kalması gereken türler hariç).
        // Süzgeç `Take`ten ÖNCE: kapalı bir kategori, açık olanların yerini kapmasın.
        var kapali = (await mutedCategoryRepository.GetForUserAsync(user.Id, cancellationToken))
            .Select(m => m.Category)
            .ToHashSet();

        var items = all
            .Where(i => !kapali.Contains(NotificationCategories.Of(i.Kind))
                        || NotificationCategories.StaysListedWhenMuted(i.Kind))
            .OrderByDescending(i => i.OccurredAt).ThenBy(i => i.Kind).ThenByDescending(i => i.SourceId)
            .Take(Limit)
            .ToList();
        return (items, user.NotificationsSeenAt, kapali);
    }

    private async Task<User> CurrentUserAsync(CancellationToken cancellationToken)
        => await userRepository.GetByIdAsync(currentUser.UserId, cancellationToken)
           ?? throw new NotFoundException("Kullanıcı bulunamadı.");
}
