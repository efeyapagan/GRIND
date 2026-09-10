using Grind.Api.Models.Dtos.Set;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// İnce kalır: rekor mantığı, oturum bulma/açma ve sahiplik servis katmanında,
/// hata çevirisi GlobalExceptionHandler'da. Burada if/try yoktur.
/// </summary>
[ApiController]
[Authorize]
[Route("api/sets")]
public class SetsController(ISetEntryService setEntryService) : ControllerBase
{
    /// <summary>
    /// Set kaydeder. Oturum belirtilmez: servis bugüne ait açık oturumu bulur, yoksa açar
    /// (CLAUDE.md). Hangi oturuma düştüğü yanıttaki <c>sessionId</c>'dedir.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SetEntryResponse>> Create(
        CreateSetRequest request, CancellationToken cancellationToken)
    {
        var olusan = await setEntryService.CreateAsync(request, cancellationToken);

        return CreatedAtAction(nameof(GetForSession),
            new { sessionId = olusan.SessionId }, olusan);
    }

    /// <summary>
    /// Bir oturumun setleri, kronolojik. Mutlak yol: kaynak olarak oturumun altında
    /// yaşıyor ama servisi bu controller'ın — Faz 7'nin SessionsController'ına
    /// dokunmamak için (spec Soru 4/A).
    /// </summary>
    [HttpGet("/api/sessions/{sessionId:long}/sets")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<SetEntryResponse>>> GetForSession(
        long sessionId, CancellationToken cancellationToken)
        => Ok(await setEntryService.GetForSessionAsync(sessionId, cancellationToken));

    /// <summary>
    /// Kısmi düzeltme. PUT BİLEREK YOK: tam değiştirme, gövdede gönderilmeyen
    /// <c>rir</c>'i sessizce silerdi (spec Soru 3/A).
    /// </summary>
    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SetEntryResponse>> Patch(
        long id, PatchSetRequest request, CancellationToken cancellationToken)
        => Ok(await setEntryService.PatchAsync(id, request, cancellationToken));

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await setEntryService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
