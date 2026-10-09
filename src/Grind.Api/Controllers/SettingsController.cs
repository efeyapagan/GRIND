using Grind.Api.Models.Dtos.Settings;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/settings")]
public class SettingsController(ISettingsService settingsService) : ControllerBase
{
    /// <summary>
    /// Haftalık antrenman hedefini (1–7 gün) ayarlar; <c>null</c> hedefi kaldırır (#97). Güncel hedef ve
    /// hedef serisi <c>GET /api/stats/calendar</c> yanıtında döner.
    /// </summary>
    [HttpPut("weekly-target")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> PutWeeklyTarget(
        UpdateWeeklyTargetRequest request, CancellationToken cancellationToken)
    {
        await settingsService.SetWeeklyTargetAsync(request, cancellationToken);

        return NoContent();
    }

    /// <summary>
    /// Antrenman geçmişi ve rekorların başkalarına görünürlüğünü ayarlar (#294). Güncel değer
    /// <c>GET /api/profile</c> yanıtında döner.
    /// </summary>
    [HttpPut("privacy-level")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> PutPrivacyLevel(
        UpdatePrivacyLevelRequest request, CancellationToken cancellationToken)
    {
        await settingsService.SetPrivacyLevelAsync(request, cancellationToken);

        return NoContent();
    }

    /// <summary>
    /// Antrenman hedefini ayarlar (#444); <c>null</c> hedefi kaldırır. Güncel değer
    /// <c>GET /api/profile</c> yanıtında döner. Hedef, AI yorumunun prompt'una girer.
    /// </summary>
    [HttpPut("training-goal")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> PutTrainingGoal(
        UpdateTrainingGoalRequest request, CancellationToken cancellationToken)
    {
        await settingsService.SetTrainingGoalAsync(request, cancellationToken);

        return NoContent();
    }

    /// <summary>Kapalı bildirim kategorileri (#410); listede olmayan her kategori açıktır.</summary>
    [HttpGet("notification-categories")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<NotificationCategoriesResponse>> GetNotificationCategories(
        CancellationToken cancellationToken)
        => Ok(await settingsService.GetNotificationCategoriesAsync(cancellationToken));

    /// <summary>Bir bildirim kategorisini açar ya da kapatır (#410). İdempotent.</summary>
    [HttpPut("notification-categories")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> PutNotificationCategory(
        UpdateNotificationCategoryRequest request, CancellationToken cancellationToken)
    {
        await settingsService.SetNotificationCategoryAsync(request, cancellationToken);

        return NoContent();
    }
}
