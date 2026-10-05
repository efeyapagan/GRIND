namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Takvim/katılım özeti. <see cref="TrainedDayCount"/> ARALIĞA aittir, ama seriler TÜM GEÇMİŞTEN
/// hesaplanır (spec Karar 5): aksi halde "bu ay" filtresi uzun bir seriyi yapay olarak kırardı.
///
/// Seriler HAFTA sayar (#96): <see cref="CurrentWeekStreak"/> / <see cref="LongestWeekStreak"/> en az bir
/// antrenman günü olan ardışık haftalardır ve BUGÜNE göredir.
///
/// Hedef alanları (#654) GÖSTERİLEN dönemi izler: <see cref="ThisWeekTrainedDays"/>,
/// <see cref="WeeklyTargetDays"/> ve <see cref="CurrentTargetStreak"/> aralığın son gününün haftasına
/// (bugünü aşmaz; aralık yoksa bu hafta) aittir -- geçmiş bir haftaya bakılınca o haftanın gün sayısı,
/// o hafta geçerli hedef ve o haftaya kadarki hedef serisi döner. Hedef o hafta yoksa
/// <see cref="WeeklyTargetDays"/> ve <see cref="CurrentTargetStreak"/> <c>null</c>'dır.
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
