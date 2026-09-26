namespace Grind.Api.Common.Time;

/// <summary>
/// "Haftalık hedef bu oturumda tamamlandı" kararının TEK yeri (#419). Veritabanı bilmez, saat
/// bilmez — yalnızca bir haftanın oturumlarını (kimlik + TR günü) ve hedefi görür.
/// <see cref="StreakCalculator"/> ile aynı desen: kural saf bir fonksiyonda yaşar.
///
/// Hedefi tamamlayan oturum, FARKLI gün sayısını hedefe ulaştıran ilk oturumdur; aynı gün
/// içindeki ikinci antrenman sayacı ilerletmez (takvim/seri kuralıyla aynı). Hedefe hiç
/// ulaşılmadıysa <c>null</c> döner — bildirim de üretilmez.
/// </summary>
public static class WeeklyGoalCompletion
{
    public static long? CompletingSessionId(
        IEnumerable<(long Id, DateOnly Day)> sessionsInWeek, int target)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(target, 1);

        var gorulenGunler = new HashSet<DateOnly>();

        // Gün sırası belirleyicidir; aynı gün içinde kimlik sırayı kararlı kılar.
        foreach (var oturum in sessionsInWeek.OrderBy(o => o.Day).ThenBy(o => o.Id))
        {
            if (gorulenGunler.Add(oturum.Day) && gorulenGunler.Count == target)
            {
                return oturum.Id;
            }
        }

        return null;
    }
}
