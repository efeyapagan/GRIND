using Grind.Api.Models.Dtos.Stats;

namespace Grind.Api.Models.Dtos.Export;

/// <summary>
/// Aralık özeti. Hepsi mevcut istatistik yollarından gelir, export kendi toplamını HESAPLAMAZ (spec
/// Karar 4). Değerler <c>GET /api/stats/calendar</c> ve <c>volume/by-exercise</c> ile birebir aynıdır.
///
/// Yalnızca EN AZ BİR SETİ olan oturumlar sayılır (spec Karar 8). Oturum listesi ise setsiz
/// oturumları da içerir: liste bir günlük, özet bir antrenman özetidir. Seriler aralıktan bağımsız,
/// tüm geçmişten hesaplanır (Faz 9 Karar 5).
/// </summary>
public record ExportSummaryResponse(
    int TrainedDayCount,
    int SessionCount,
    int SetCount,
    decimal TotalVolume,
    int CurrentStreak,
    int LongestStreak,
    IReadOnlyList<ExerciseVolumeResponse> VolumeByExercise);
