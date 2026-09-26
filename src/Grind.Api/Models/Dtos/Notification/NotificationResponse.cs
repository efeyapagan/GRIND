using Grind.Api.Models.Dtos.Social;
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Notification;

/// <summary>
/// Bir bildirim (#325). <see cref="Actor"/> olayı yapan kişi, BAKANIN gözünden (ilişki <c>Friends</c> ise
/// istemci "Artık arkadaşsınız" yazar). <see cref="Records"/> yalnızca <see cref="NotificationKind.Records"/>'da dolu.
/// </summary>
public record NotificationResponse(
    NotificationKind Kind,
    DateTime OccurredAt,
    bool IsUnread,
    UserSummaryResponse Actor,
    IReadOnlyList<NotificationRecordResponse>? Records);
