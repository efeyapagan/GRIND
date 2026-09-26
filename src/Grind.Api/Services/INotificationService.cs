using Grind.Api.Models.Dtos.Notification;

namespace Grind.Api.Services;

/// <summary>Oturum açmış kullanıcının bildirimleri (#325); kimlik token'dan gelir.</summary>
public interface INotificationService
{
    Task<IReadOnlyList<NotificationResponse>> GetAsync(CancellationToken cancellationToken = default);

    /// <summary><see cref="GetAsync"/> ile aynı hattan sayılır — liste ile rozet ayrışamaz.</summary>
    Task<UnreadNotificationCountResponse> GetUnreadCountAsync(CancellationToken cancellationToken = default);

    Task MarkSeenAsync(CancellationToken cancellationToken = default);
}
