using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/stats")]
public class StatsController(IStatsService statsService, IExerciseProgressService exerciseProgressService)
    : ControllerBase
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

    /// <summary>
    /// Kilo (günlük ortalama) ve hacim, aynı zaman ekseninde iki ayrı seri. Hacim serisi
    /// <c>volume/daily</c> ile birebir aynıdır (spec Karar 3).
    /// </summary>
    [HttpGet("body-weight-trend")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BodyWeightTrendResponse>> GetBodyWeightTrend(
        [FromQuery] StatsRangeQuery query, CancellationToken cancellationToken)
        => Ok(await statsService.GetBodyWeightTrendAsync(query, cancellationToken));

    /// <summary>Antrenman süresi özeti — medyan/toplam, açık oturumlar hariç (issue #73).</summary>
    [HttpGet("duration")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DurationSummaryResponse>> GetDurationSummary(
        [FromQuery] StatsRangeQuery query, CancellationToken cancellationToken)
        => Ok(await statsService.GetDurationSummaryAsync(query, cancellationToken));

    /// <summary>
    /// Platodaki hareketler (#72): tahmini 1RM'i son 6 haftada geçilmemiş, son 6 haftada çalışılmış
    /// hareketler, en uzun platodan başlayarak. Aralıktan bağımsız.
    /// </summary>
    [HttpGet("plateaus")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PlateauResponse>>> GetPlateaus(CancellationToken cancellationToken)
        => Ok(await statsService.GetPlateausAsync(cancellationToken));

    /// <summary>
    /// Bir hareketin oturum başına en ağır seti, hacmi ve tahmini 1RM'i, eskiden yeniye (dilim 3).
    /// Egzersiz görünmüyorsa nötr 404.
    /// </summary>
    [HttpGet("exercises/{exerciseId:long}/progress")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExerciseProgressResponse>> GetExerciseProgress(
        long exerciseId, [FromQuery] StatsRangeQuery query, CancellationToken cancellationToken)
        => Ok(await exerciseProgressService.GetAsync(exerciseId, query, cancellationToken));
}
