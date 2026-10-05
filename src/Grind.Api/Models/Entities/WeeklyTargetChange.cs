namespace Grind.Api.Models.Entities;

/// <summary>
/// Haftalık hedefin bir değişikliği (#654): <see cref="TargetDays"/>, <see cref="EffectiveFromWeek"/>
/// haftasından (Pazartesi, TR günü; o hafta DAHİL) bir sonraki değişikliğe kadar geçerlidir. Geçmiş
/// haftalar o zamanki hedefleriyle değerlendirilir — hedef serisi ve hedef bildirimi buradan okur.
/// <c>null</c> hedefin kaldırıldığı demektir. Hafta başına tek satır: aynı hafta ikinci değişiklik
/// satırı günceller.
///
/// Güncel hedef <c>User.WeeklyTargetDays</c>'te de durur (arkadaş sıralaması gibi yalnızca bugünü
/// okuyan sorgular için) ve bu tabloyla AYNI <c>SaveChangesAsync</c>'te yazılır. Hiç satırı olmayan
/// kullanıcının hedefi hiç değişmemiştir: güncel değer tüm geçmişe uygulanır (#654 öncesi davranış).
/// </summary>
public class WeeklyTargetChange
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public DateOnly EffectiveFromWeek { get; set; }
    public int? TargetDays { get; set; }

    public User User { get; set; } = null!;
}
