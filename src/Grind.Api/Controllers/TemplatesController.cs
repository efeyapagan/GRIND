using Grind.Api.Models.Dtos.Template;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// İnce kalır: sahiplik, isim çakışması ve egzersiz doğrulaması servis katmanında,
/// hata çevirisi GlobalExceptionHandler'da. Burada if/try yoktur.
/// </summary>
[ApiController]
[Authorize]
[Route("api/templates")]
public class TemplatesController(IWorkoutTemplateService templateService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TemplateResponse>>> GetAll(
        CancellationToken cancellationToken)
        => Ok(await templateService.GetAllAsync(cancellationToken));

    /// <summary>
    /// Şablon sırasını toptan yazar (#344). Gövde kullanıcının TÜM şablon id'lerini istenen
    /// sırayla taşır; yanıt yeni sıradaki listedir — istemci ayrıca GET atmaz.
    /// Rota <c>{id:long}</c> kalıbıyla çakışmaz: "order" long'a parse edilmez.
    /// </summary>
    [HttpPut("order")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<TemplateResponse>>> Reorder(
        ReorderTemplatesRequest request, CancellationToken cancellationToken)
        => Ok(await templateService.ReorderAsync(request, cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TemplateResponse>> GetById(long id, CancellationToken cancellationToken)
        => Ok(await templateService.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TemplateResponse>> Create(
        CreateTemplateRequest request, CancellationToken cancellationToken)
    {
        var created = await templateService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>Tam değiştirme: ad ve egzersiz listesinin tamamı gönderilir.</summary>
    [HttpPut("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TemplateResponse>> Update(
        long id, UpdateTemplateRequest request, CancellationToken cancellationToken)
        => Ok(await templateService.UpdateAsync(id, request, cancellationToken));

    /// <summary>
    /// Kısmi güncelleme: yalnızca gönderilen alan değişir. Sadece yeniden adlandırmak için
    /// <c>{ "name": "..." }</c> yeterlidir — PUT ile bunu yapmak tüm egzersiz listesini
    /// göndermeyi gerektirir.
    /// </summary>
    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TemplateResponse>> Patch(
        long id, PatchTemplateRequest request, CancellationToken cancellationToken)
        => Ok(await templateService.PatchAsync(id, request, cancellationToken));

    /// <summary>
    /// GERÇEK siler (egzersizlerin aksine). Şablon satırları CASCADE ile gider; o şablondan
    /// başlatılmış oturumlar SİLİNMEZ, yalnızca şablon referansını kaybeder.
    /// </summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await templateService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
