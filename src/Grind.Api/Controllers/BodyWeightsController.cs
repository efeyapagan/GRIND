using Grind.Api.Models.Dtos.BodyWeight;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// İnce kalır: ağırlık kuralları, zaman doğrulaması ve sahiplik servis katmanında, hata çevirisi
/// GlobalExceptionHandler'da. Burada if/try yoktur.
/// </summary>
[ApiController]
[Authorize]
[Route("api/body-weights")]
public class BodyWeightsController(IBodyWeightLogService bodyWeightService) : ControllerBase
{
    /// <summary>
    /// Tartı kaydeder. <c>recordedAt</c> opsiyoneldir (verilmezse şimdi) ve OFFSET ile gönderilmeli
    /// (<c>+03:00</c> veya <c>Z</c>); şimdiden 5 dakikadan fazla ileride bir zaman 400 alır.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BodyWeightLogResponse>> Create(
        CreateBodyWeightRequest request, CancellationToken cancellationToken)
    {
        var olusan = await bodyWeightService.CreateAsync(request, cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = olusan.Id }, olusan);
    }

    /// <summary>Tartılar, yeniden eskiye, sayfalı. <c>from</c>/<c>to</c> TR yerel günü, iki ucu dahil.</summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<BodyWeightLogResponse>>> GetPage(
        [FromQuery] PagedRangeQuery query, CancellationToken cancellationToken)
        => Ok(await bodyWeightService.GetPageAsync(query, cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BodyWeightLogResponse>> GetById(
        long id, CancellationToken cancellationToken)
        => Ok(await bodyWeightService.GetByIdAsync(id, cancellationToken));

    /// <summary>Kısmi düzeltme; en az bir alan zorunlu. PUT yok (spec Karar 5).</summary>
    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BodyWeightLogResponse>> Patch(
        long id, PatchBodyWeightRequest request, CancellationToken cancellationToken)
        => Ok(await bodyWeightService.PatchAsync(id, request, cancellationToken));

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await bodyWeightService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
