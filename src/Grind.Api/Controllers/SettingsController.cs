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
}
