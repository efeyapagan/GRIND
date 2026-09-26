using Grind.Api.Models.Dtos.Notification;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// Oturum açmış kullanıcının bildirimleri (#325): son 30 gün, en fazla 50. Bildirimler saklanmaz, mevcut
/// satırlardan türetilir; kimlik her zaman token'dan gelir.
/// </summary>
[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController(INotificationService notificationService) : ControllerBase
{
    /// <summary>Yeniden eskiye; <c>isUnread</c> son görülme anına göre.</summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<NotificationResponse>>> Get(CancellationToken cancellationToken)
        => Ok(await notificationService.GetAsync(cancellationToken));

    /// <summary>Zil rozeti için okunmamış sayısı.</summary>
    [HttpGet("unread-count")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<UnreadNotificationCountResponse>> GetUnreadCount(CancellationToken cancellationToken)
        => Ok(await notificationService.GetUnreadCountAsync(cancellationToken));

    /// <summary>Ekran açıldı: şu ana kadarki her bildirim okundu sayılır.</summary>
    [HttpPost("seen")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkSeen(CancellationToken cancellationToken)
    {
        await notificationService.MarkSeenAsync(cancellationToken);
        return NoContent();
    }
}
