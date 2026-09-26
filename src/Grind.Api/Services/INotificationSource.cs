using Grind.Api.Models.Dtos.Notification;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;

namespace Grind.Api.Services;

/// <summary>Bir bildirim türünün ham öğesi; okundu durumu ve kişi özeti servis tarafından eklenir.</summary>
public record NotificationItem(
    NotificationKind Kind, DateTime OccurredAt, long SourceId, UserRef Actor,
    IReadOnlyList<NotificationRecordResponse>? Records);

/// <summary>
/// Bir bildirim türünün kaynağı (#325). Yeni bir tür yeni bir kaynaktır — <see cref="NotificationService"/>
/// değişmez. İleride saklanması gereken bir tür gelirse (push, veride izi olmayan olay), o tabloyu okuyan
/// kaynak da bu arayüzü uygular.
/// </summary>
public interface INotificationSource
{
    /// <summary><paramref name="since"/>'ten beri en fazla <paramref name="limit"/> öğe, en yeni önce.</summary>
    Task<IReadOnlyList<NotificationItem>> GetAsync(
        long userId, DateTime since, int limit, CancellationToken cancellationToken = default);
}
