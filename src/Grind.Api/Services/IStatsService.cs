using Grind.Api.Models.Dtos.Stats;

namespace Grind.Api.Services;

/// <summary>
/// Hacim ve katılım istatistikleri. SALT OKUMA: <c>SaveChangesAsync</c> çağırmaz.
/// Yeni tablo YOKTUR — hepsi mevcut oturum/set satırlarından sorgulanır (CLAUDE.md).
/// </summary>
public interface IStatsService
{
    /// <summary>TR günü bazında hacim, eskiden yeniye.</summary>
    Task<VolumeSummaryResponse<DailyVolumeResponse>> GetDailyVolumeAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default);

    /// <summary>Egzersiz bazında hacim, büyükten küçüğe.</summary>
    Task<VolumeSummaryResponse<ExerciseVolumeResponse>> GetVolumeByExerciseAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default);

    /// <summary>
    /// Aralıktaki antrenman günleri + seriler. Seriler aralıktan BAĞIMSIZ (spec Karar 5).
    /// </summary>
    Task<CalendarResponse> GetCalendarAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kilo (günlük ortalama) ve hacim, iki ayrı seri. Hacim serisi <see cref="GetDailyVolumeAsync"/>
    /// ile aynı hesap yolundan gelir.
    /// </summary>
    Task<BodyWeightTrendResponse> GetBodyWeightTrendAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default);

    /// <summary>
    /// Antrenman süresi özeti — medyan/toplam (issue #73). Açık oturumlar hariçtir; bkz.
    /// <see cref="DurationSummaryResponse"/>.
    /// </summary>
    Task<DurationSummaryResponse> GetDurationSummaryAsync(
        StatsRangeQuery query, CancellationToken cancellationToken = default);
}
