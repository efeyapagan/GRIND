using Grind.Api.Models.Enums;

namespace Grind.Api.Common.Notifications;

/// <summary>
/// Hangi bildirim türünün hangi ayar kategorisine ait olduğu (#410) — tek karar noktası. Yeni bir
/// <see cref="NotificationKind"/> buraya eklenmeden derlenir ama testte patlar (kategorisiz tür kalamaz).
/// </summary>
public static class NotificationCategories
{
    public static NotificationCategory Of(NotificationKind kind) => kind switch
    {
        NotificationKind.Follow => NotificationCategory.FollowsAndFriends,
        NotificationKind.FriendRequest => NotificationCategory.FollowsAndFriends,
        NotificationKind.Records => NotificationCategory.Records,
        NotificationKind.WeeklyGoal => NotificationCategory.WeeklyGoals,
        _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, "Bildirim türünün kategorisi tanımlı değil.")
    };

    /// <summary>
    /// Kategorisi kapalıyken de LİSTEDE kalan türler (kullanıcı kararı, #410): arkadaşlık isteği yalnızca
    /// bildirim listesinden kabul/ret edilir — gizlenirse kullanıcı isteğe hiç ulaşamazdı. Okunmamış sayılmaz.
    /// </summary>
    public static bool StaysListedWhenMuted(NotificationKind kind) => kind == NotificationKind.FriendRequest;
}
