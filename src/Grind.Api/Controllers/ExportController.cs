using Grind.Api.Models.Dtos.Export;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// İnce kalır: aralık çözümü, birleştirme ve formatlama servis katmanında (Faz 11 spec Karar 3), hata
/// çevirisi GlobalExceptionHandler'da. Burada if/try yoktur.
/// </summary>
[ApiController]
[Authorize]
[Route("api/export")]
public class ExportController(IExportService exportService) : ControllerBase
{
    /// <summary>
    /// Aralığın tam export'u, JSON: oturumlar + setler, tartılar, özet, tüm zamanların rekorları.
    /// <c>from</c>/<c>to</c> TR yerel günüdür, iki ucu da dahil, opsiyonel; verilmezse tüm geçmiş.
    /// Rekorlar ve seriler aralıktan bağımsızdır.
    /// </summary>
    [HttpGet("json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExportResponse>> GetJson(
        [FromQuery] StatsRangeQuery query, CancellationToken cancellationToken)
        => Ok(await exportService.GetAsync(query, cancellationToken));

    /// <summary>
    /// Aynı export, bir yapay zeka ajanına yapıştırılabilir düz metin olarak.
    ///
    /// BİLEREK <c>[Produces("text/plain")]</c> YOK: o bir sonuç filtresidir ve [ApiController]'ın
    /// otomatik 400'ünü de text/plain'e zorlayıp 406'ya çevirir (spec Karar 10). Aşağıdaki
    /// ProducesResponseType yalnızca Swagger meta verisidir.
    /// </summary>
    [HttpGet("text")]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, "text/plain")]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ContentResult> GetText(
        [FromQuery] StatsRangeQuery query, CancellationToken cancellationToken)
        => Content(await exportService.GetTextAsync(query, cancellationToken), "text/plain; charset=utf-8");
}
