namespace Grind.Api.Models.Enums;

/// <summary>Bildirim türü (#325). Saklanmaz — yalnızca yanıtta; yeni tür = yeni bir <c>INotificationSource</c>.</summary>
public enum NotificationKind
{
    Follow,
    Records,

    /// <summary>Arkadaş haftalık hedefini tamamladı (#419).</summary>
    WeeklyGoal
}
