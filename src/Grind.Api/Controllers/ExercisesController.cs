using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// İnce kalır: sahiplik kararı ve isim çakışması servis katmanında, hata çevirisi
/// GlobalExceptionHandler'da. Burada if/try yoktur.
/// </summary>
[ApiController]
[Authorize]
[Route("api/exercises")]
public class ExercisesController(IExerciseService exerciseService) : ControllerBase
{
    /// <summary>Kullanıcının kendi egzersizleri + global egzersizler, isme göre sıralı.</summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ExerciseResponse>>> GetAll(
        [FromQuery] bool includeArchived = false, CancellationToken cancellationToken = default)
        => Ok(await exerciseService.GetAllAsync(includeArchived, cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExerciseResponse>> GetById(
        long id, CancellationToken cancellationToken)
        => Ok(await exerciseService.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ExerciseResponse>> Create(
        CreateExerciseRequest request, CancellationToken cancellationToken)
    {
        var created = await exerciseService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ExerciseResponse>> Update(
        long id, UpdateExerciseRequest request, CancellationToken cancellationToken)
        => Ok(await exerciseService.UpdateAsync(id, request, cancellationToken));

    /// <summary>
    /// Kısmi güncelleme: yalnızca gönderilen alan değişir. Sadece kategoriyi düzeltmek için
    /// <c>{ "category": "Pull" }</c> yeterlidir — PUT ile bunu yapmak adı da göndermeyi
    /// gerektirir ve yanlış gönderirsen adı ezersin.
    /// </summary>
    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ExerciseResponse>> Patch(
        long id, PatchExerciseRequest request, CancellationToken cancellationToken)
        => Ok(await exerciseService.PatchAsync(id, request, cancellationToken));

    /// <summary>Arşivler (soft delete) — geçmiş kayıtlar bozulmasın diye satır silinmez.</summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Archive(long id, CancellationToken cancellationToken)
    {
        await exerciseService.ArchiveAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:long}/restore")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Restore(long id, CancellationToken cancellationToken)
    {
        await exerciseService.RestoreAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:long}/media")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExerciseMediaResponse>> AddMedia(
        long id, AddMediaRequest request, CancellationToken cancellationToken)
    {
        var media = await exerciseService.AddMediaAsync(id, request, cancellationToken);

        // Location bilerek EBEVEYN egzersize işaret ediyor, gövdedeki ExerciseMediaResponse'a
        // değil: tek bir medyayı döndüren bir GET endpoint'i yok, o yüzden gerçek anlamda
        // doğru bir Location üretilemez. Ama GetById'nin döndürdüğü egzersiz temsili yeni
        // eklenen medyayı da İÇERİR — yani link kırık değil, takip edilebilir ve faydalı.
        return CreatedAtAction(nameof(GetById), new { id }, media);
    }

    [HttpDelete("{id:long}/media/{mediaId:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveMedia(
        long id, long mediaId, CancellationToken cancellationToken)
    {
        await exerciseService.RemoveMediaAsync(id, mediaId, cancellationToken);
        return NoContent();
    }
}
