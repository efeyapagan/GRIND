namespace Grind.Api.Models.Enums;

/// <summary>
/// Bildirim ayarlarındaki kategoriler (#410). Adıyla saklanır: yeni kategori eklemek migration gerektirmez,
/// var olan adı değiştirmek eski satırları okunamaz yapar. <see cref="Interactions"/>, <see cref="Reminders"/>
/// ve <see cref="System"/> altyapıdır: bugün bu kategorilerde bildirim türü yok, istemci onları çizmez.
/// Tür → kategori eşlemesi TEK yerde: <c>NotificationCategories.Of</c>.
/// </summary>
public enum NotificationCategory
{
    FollowsAndFriends,
    Records,
    WeeklyGoals,
    Interactions,
    Reminders,
    System
}
