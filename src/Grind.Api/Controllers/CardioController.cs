using Grind.Api.Models.Dtos.Cardio;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// #647: kardiyo kayıtları. İnce kalır: akış, sahiplik ve rekor servis katmanında, hata çevirisi
/// GlobalExceptionHandler'da.
/// </summary>
[ApiController]
[Authorize]
[Route("api/cardio")]
public class CardioController(ICardioEntryService cardioService) : ControllerBase
{
    /// <summary>Antrenmanın kardiyo kayıtları, başlangıç sırasıyla. Başkasının antrenmanı 404.</summary>
    [HttpGet("/api/sessions/{sessionId:long}/cardio")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<CardioEntryResponse>>> GetForSession(
        long sessionId, CancellationToken cancellationToken)
        => Ok(await cardioService.GetForSessionAsync(sessionId, cancellationToken));

    /// <summary>
    /// Başlat: açık antrenmanda süre akmaya başlar. Bitmiş antrenman ya da akan başka bir kardiyo 409; kardiyo
    /// olmayan hareket ya da makinenin sormadığı kutu 400.
    /// </summary>
    [HttpPost("/api/sessions/{sessionId:long}/cardio")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CardioEntryResponse>> Start(
        long sessionId, StartCardioRequest request, CancellationToken cancellationToken)
    {
        var olusan = await cardioService.StartAsync(sessionId, request, cancellationToken);
        return CreatedAtAction(nameof(GetForSession), new { sessionId }, olusan);
    }

    /// <summary>Durdur: süreyi yazar, sonuç kutularını kaydeder, rekorları hesaplar. Zaten durmuşsa olduğu gibi döner.</summary>
    [HttpPost("{id:long}/stop")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CardioEntryResponse>> Stop(
        long id, StopCardioRequest request, CancellationToken cancellationToken)
        => Ok(await cardioService.StopAsync(id, request, cancellationToken));

    /// <summary>Bitmiş kaydı düzeltir (tüm kutular + süre). Akan kayıt 409.</summary>
    [HttpPut("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CardioEntryResponse>> Update(
        long id, UpdateCardioRequest request, CancellationToken cancellationToken)
        => Ok(await cardioService.UpdateAsync(id, request, cancellationToken));

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await cardioService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
