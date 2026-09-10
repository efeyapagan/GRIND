using Grind.Api.Models.Dtos.Record;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/records")]
public class RecordsController(IPersonalRecordService recordService) : ControllerBase
{
    /// <summary>
    /// Tüm zamanların rekorları. Yeni veri gerektirmez — mevcut SetEntry'den sorgulanır
    /// (CLAUDE.md). Hiç seti olmayan egzersiz listede yer almaz.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ExerciseRecordResponse>>> GetAll(
        CancellationToken cancellationToken)
        => Ok(await recordService.GetAllTimeAsync(cancellationToken));
}
