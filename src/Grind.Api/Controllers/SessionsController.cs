using Grind.Api.Models.Dtos.Session;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// İnce kalır: gün sınırı, sahiplik ve ilerleme hesabı servis katmanında,
/// hata çevirisi GlobalExceptionHandler'da. Burada if/try yoktur.
/// </summary>
[ApiController]
[Authorize]
[Route("api/sessions")]
public class SessionsController(IWorkoutSessionService sessionService) : ControllerBase
{
    /// <summary>
    /// Kullanıcının tüm oturumları, yeniden eskiye. DİKKAT: <c>templateId</c>/<c>templateName</c>
    /// dolu gelir ama <c>progress</c> BURADA HER ZAMAN BOŞ LİSTEDİR — N+1'den kaçınmak için bu
    /// uç ilerlemeyi hiç hesaplamaz, şablonlu bir oturum için bile. Gerçek ilerleme gerekiyorsa
    /// <c>GET /api/sessions/{id}</c> veya <c>GET /api/sessions/open</c> çağrılmalı.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SessionResponse>>> GetAll(
        CancellationToken cancellationToken)
        => Ok(await sessionService.GetAllAsync(cancellationToken));

    /// <summary>Bugüne (TR yerel günü) ait açık oturum; yoksa 404.</summary>
    [HttpGet("open")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionResponse>> GetOpen(CancellationToken cancellationToken)
        => Ok(await sessionService.GetOpenAsync(cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionResponse>> GetById(long id, CancellationToken cancellationToken)
        => Ok(await sessionService.GetByIdAsync(id, cancellationToken));

    /// <summary>
    /// Başlatır. Bugüne ait açık bir oturum zaten varsa onu **200** ile döndürür;
    /// yeni açıldıysa **201**. Böylece iki kez tıklamak hata üretmez. DİKKAT: 200 dönen
    /// durumda gövdedeki <c>templateId</c>/<c>notes</c> UYGULANMAZ — var olan açık oturum
    /// olduğu gibi döner, gönderilen not sessizce atılır.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionResponse>> Start(
        [FromBody] StartSessionRequest? request, CancellationToken cancellationToken)
    {
        // Sıfır bayt'lık bir gövde (Content-Length: 0) model binder tarafından varsayılan bir
        // DTO'ya değil null'a bağlanır. Şablonsuz/notsuz başlatmak en sık akış olduğu için bu
        // `??` bir iş kuralı değil, model-binding savunmasıdır (bu yüzden "if yok" kuralını
        // ihlal etmez).
        var result = await sessionService.StartAsync(request ?? new StartSessionRequest(), cancellationToken);

        return result.Created
            ? CreatedAtAction(nameof(GetById), new { id = result.Session.Id }, result.Session)
            : Ok(result.Session);
    }

    [HttpPost("{id:long}/finish")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SessionResponse>> Finish(long id, CancellationToken cancellationToken)
        => Ok(await sessionService.FinishAsync(id, cancellationToken));

    /// <summary>
    /// Notu günceller. DİKKAT — Faz 6'daki <c>PatchTemplateRequest</c>'in aksine, burada
    /// <c>notes: null</c> göndermek "dokunma" değil "notu temizle" demektir (tek alanlı bir
    /// istek için "hangi alan?" belirsizliği yok, bu yüzden iki anlamı ayırmanın faydası yok).
    /// Diğer konvansiyona alışmış bir istemci için bir tuzak olabilir.
    /// </summary>
    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionResponse>> UpdateNotes(
        long id, UpdateSessionNotesRequest request, CancellationToken cancellationToken)
        => Ok(await sessionService.UpdateNotesAsync(id, request, cancellationToken));

    /// <summary>
    /// Antrenmana hareket ekler (#62): sona, hedefsiz. Yanıt güncel ilerlemeyi taşır. Bitmiş antrenman
    /// ya da zaten listede olan hareket 409; arşivlenmiş egzersiz 400.
    /// </summary>
    [HttpPost("{id:long}/exercises")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SessionResponse>> AddExercise(
        long id, AddSessionExerciseRequest request, CancellationToken cancellationToken)
    {
        var session = await sessionService.AddExerciseAsync(id, request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = session.Id }, session);
    }

    /// <summary>
    /// Hareketi antrenmandan kaldırır (#60): o hareketin bu antrenmandaki setleri de silinir ve
    /// rekorları yeniden hesaplanır. Listede olmayan hareket 404; bitmiş antrenman 409.
    /// </summary>
    [HttpDelete("{id:long}/exercises/{exerciseId:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RemoveExercise(long id, long exerciseId, CancellationToken cancellationToken)
    {
        await sessionService.RemoveExerciseAsync(id, exerciseId, cancellationToken);
        return NoContent();
    }

    /// <summary>Siler; bağlı setler CASCADE ile gider.</summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await sessionService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
