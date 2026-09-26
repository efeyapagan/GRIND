using Grind.Api.Common.Time;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

/// <summary>
/// Arkadaşın haftalık hedefini tamamlaması (#419) — hafta başına TEK bildirim.
///
/// Bildirim SAKLANMAZ, veriden türetilir (#325): hedefi tamamlayan oturum her okumada yeniden
/// bulunur. Sonucu: kişi hedefini sonradan değiştirirse geçmiş bildirimler GÜNCEL hedefe göre
/// yeniden türetilir — <c>RecordNotificationSource</c>'un rekor rozetlerinde olduğu gibi bilinçli
/// bir davranış.
///
/// Kapı #418'deki kararların aynısı: yalnızca ARKADAŞLAR (karşılıklı takip), gizlilik seviyesi
/// <c>Gizli</c> olan kimse yok, hedefi olmayan için bildirim yok. Ayrıca arkadaşlıktan ÖNCE
/// başlamış oturumlar sayılmaz (RecordNotificationSource ile aynı kural).
/// </summary>
public class WeeklyGoalNotificationSource(INotificationRepository repository) : INotificationSource
{
    public async Task<IReadOnlyList<NotificationItem>> GetAsync(
        long userId, DateTime since, int limit, CancellationToken cancellationToken = default)
    {
        // Pencerenin BASLADIGI haftanin tamami okunur: hafta sinira denk gelirse eksik gun sayisiyla
        // "tamamlanmadi" demek yanlis olurdu. Uretilen bildirim yine de `since`ten yeniyse gosterilir.
        var haftaBasi = StreakCalculator.WeekStart(TurkeyDay.LocalDateOf(since));
        var (okumaBaslangici, _) = TurkeyDay.RangeForLocalDate(haftaBasi);

        var satirlar = await repository.GetFriendGoalSessionsAsync(userId, okumaBaslangici, cancellationToken);
        if (satirlar.Count == 0)
        {
            return [];
        }

        var oturumSaati = satirlar.ToDictionary(s => s.SessionId, s => s.StartedAt);

        return satirlar
            .GroupBy(s => (s.Actor.Id, Hafta: StreakCalculator.WeekStart(TurkeyDay.LocalDateOf(s.StartedAt))))
            .Select(hafta => new
            {
                Grup = hafta,
                TamamlayanId = WeeklyGoalCompletion.CompletingSessionId(
                    hafta.Select(s => (s.SessionId, Day: TurkeyDay.LocalDateOf(s.StartedAt))),
                    hafta.First().WeeklyTargetDays),
            })
            .Where(h => h.TamamlayanId is not null && oturumSaati[h.TamamlayanId.Value] >= since)
            .Select(h => new NotificationItem(
                NotificationKind.WeeklyGoal,
                oturumSaati[h.TamamlayanId!.Value],
                h.TamamlayanId.Value,
                h.Grup.First().Actor,
                null))
            .OrderByDescending(i => i.OccurredAt)
            .Take(limit)
            .ToList();
    }
}
