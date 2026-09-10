namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Takvim/katılım özeti. <see cref="TrainedDayCount"/> ARALIĞA aittir, ama
/// <see cref="CurrentStreak"/> ve <see cref="LongestStreak"/> TÜM GEÇMİŞTEN hesaplanır
/// (spec Karar 5): aksi halde "bu ay" filtresi 40 günlük bir seriyi yapay olarak kırardı.
/// </summary>
public record CalendarResponse(
    DateOnly? From,
    DateOnly? To,
    IReadOnlyList<CalendarDayResponse> Days,
    int TrainedDayCount,
    int CurrentStreak,
    int LongestStreak);
