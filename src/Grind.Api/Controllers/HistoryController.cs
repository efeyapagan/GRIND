using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// İnce kalır: tarih aralığı çözümü, sahiplik ve toplamlar servis katmanında,
/// hata çevirisi GlobalExceptionHandler'da. Burada if/try yoktur.
/// </summary>
[ApiController]
[Authorize]
[Route("api/history")]
public class HistoryController(IWorkoutHistoryService historyService) : ControllerBase
{
    /// <summary>
    /// Antrenman geçmişi, yeniden eskiye, setleriyle. <c>from</c>/<c>to</c> TR yerel günüdür ve
    /// iki ucu da dahildir. <c>exerciseId</c> verilirse yalnızca o egzersizi içeren oturumlar
    /// döner ve oturum toplamları da o egzersize göre hesaplanır.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResponse<HistorySessionResponse>>> Get(
        [FromQuery] HistoryQuery query, CancellationToken cancellationToken)
        => Ok(await historyService.GetAsync(query, cancellationToken));
}
