using Grind.Api.Models.Dtos.Stats;

namespace Grind.Api.Services;

/// <summary>
/// Hareket ilerleme grafiğinin verisi (dilim 3 spec Karar 2). SALT OKUMA: <c>SaveChangesAsync</c>
/// çağırmaz, yeni tablo YOK — mevcut set satırlarından sorgulanır.
/// </summary>
public interface IExerciseProgressService
{
    /// <summary>
    /// Görünür (kendi ya da global, arşivli dahil) egzersizin oturum başına özeti, eskiden yeniye.
    /// Görünmüyorsa nötr 404; ters aralıkta 400.
    /// </summary>
    Task<ExerciseProgressResponse> GetAsync(
        long exerciseId, StatsRangeQuery query, CancellationToken cancellationToken = default);
}
