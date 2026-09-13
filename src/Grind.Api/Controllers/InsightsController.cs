using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Insight;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// İnce kalır: aralık, sağlayıcı çağrısı ve sahiplik servis katmanında, hata çevirisi
/// GlobalExceptionHandler'da. Burada if/try yoktur.
/// </summary>
[ApiController]
[Authorize]
[Route("api/insights")]
public class InsightsController(IAiInsightService insightService) : ControllerBase
{
    /// <summary>
    /// Aralığın antrenman verisini AI'ya yorumlatır ve saklar. Gövde opsiyoneldir: <c>from</c>/<c>to</c> TR
    /// yerel günü, iki ucu dahil; verilmezse son 30 gün, en fazla 366 gün. AI kapalıysa (varsayılan) ya da
    /// sağlayıcı yanıt veremezse 503.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<AiInsightResponse>> Generate(
        [FromBody] GenerateInsightRequest? request, CancellationToken cancellationToken)
    {
        // Sıfır baytlık gövde model binder tarafından null'a bağlanır. Aralıksız üretmek en sık akış olduğu
        // için bu `??` bir iş kuralı değil model-binding savunmasıdır (SessionsController.Start ile aynı).
        var olusan = await insightService.GenerateAsync(request ?? new GenerateInsightRequest(), cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = olusan.Id }, olusan);
    }

    /// <summary>
    /// Kendi yorumların, yeniden eskiye, sayfalı. <c>kind</c>, <c>workoutSessionId</c> ve <c>setEntryId</c>
    /// ile süzülebilir; başkasının oturum/set id'si boş sayfa verir.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<AiInsightResponse>>> GetPage(
        [FromQuery] AiInsightQuery query, CancellationToken cancellationToken)
        => Ok(await insightService.GetPageAsync(query, cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AiInsightResponse>> GetById(long id, CancellationToken cancellationToken)
        => Ok(await insightService.GetByIdAsync(id, cancellationToken));

    /// <summary>
    /// Yorumu kalıcı olarak siler. Düzenleme ucu YOK: yorum, modelin ne dediğinin kaydıdır (spec Karar 2).
    /// </summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await insightService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
