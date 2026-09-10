using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/stats")]
public class StatsController(IStatsService statsService) : ControllerBase
{
    /// <summary>TR günü bazında hacim (ağırlık × tekrar), eskiden yeniye.</summary>
    [HttpGet("volume/daily")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<VolumeSummaryResponse<DailyVolumeResponse>>> GetDailyVolume(
        [FromQuery] StatsRangeQuery query, CancellationToken cancellationToken)
        => Ok(await statsService.GetDailyVolumeAsync(query, cancellationToken));

    /// <summary>
    /// Egzersiz bazında hacim, büyükten küçüğe. Gün bazlı uçtan AYRI: tek bir uçta
    /// <c>groupBy</c> parametresi, satırların yarısı boş bir DTO gerektirirdi (spec Karar 4).
    /// </summary>
    [HttpGet("volume/by-exercise")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<VolumeSummaryResponse<ExerciseVolumeResponse>>> GetVolumeByExercise(
        [FromQuery] StatsRangeQuery query, CancellationToken cancellationToken)
        => Ok(await statsService.GetVolumeByExerciseAsync(query, cancellationToken));

    /// <summary>
    /// Antrenman yapılmış günler ve seriler. Seriler aralıktan BAĞIMSIZ, tüm geçmişten
    /// hesaplanır (spec Karar 5).
    /// </summary>
    [HttpGet("calendar")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CalendarResponse>> GetCalendar(
        [FromQuery] StatsRangeQuery query, CancellationToken cancellationToken)
        => Ok(await statsService.GetCalendarAsync(query, cancellationToken));
}
