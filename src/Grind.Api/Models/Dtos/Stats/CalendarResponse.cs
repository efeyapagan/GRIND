namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Takvim/katılım özeti. <see cref="TrainedDayCount"/> ARALIĞA aittir, ama seriler TÜM GEÇMİŞTEN
/// hesaplanır (spec Karar 5): aksi halde "bu ay" filtresi uzun bir seriyi yapay olarak kırardı.
///
/// Seriler HAFTA sayar (#96): <see cref="CurrentWeekStreak"/> / <see cref="LongestWeekStreak"/> en az bir
/// antrenman günü olan ardışık haftalardır. <see cref="ThisWeekTrainedDays"/> bugünün haftasındaki farklı
/// antrenman günüdür (aralıktan bağımsız). Hedef (#97) kullanıcının güncel kaydından okunur;
/// <see cref="WeeklyTargetDays"/> <c>null</c> ise <see cref="CurrentTargetStreak"/> da <c>null</c>'dır.
/// </summary>
public record CalendarResponse(
    DateOnly? From,
    DateOnly? To,
    IReadOnlyList<CalendarDayResponse> Days,
    int TrainedDayCount,
    int CurrentWeekStreak,
    int LongestWeekStreak,
    int ThisWeekTrainedDays,
    int? WeeklyTargetDays,
    int? CurrentTargetStreak);
