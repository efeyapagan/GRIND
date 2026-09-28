using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Time;

namespace Grind.Api.Services;

/// <summary>
/// Arkadaş sıralamasının dönemi (#420). Saf fonksiyon: "bugün" dışarıdan verilir
/// (<see cref="AiInsightRange"/> ile aynı desen).
/// </summary>
public static class StandingRange
{
    /// <summary>
    /// En uzun takvim dönemi bir ay: iki ucu dahil en fazla bu kadar gün. Daha uzunu istenmez —
    /// sıralama sınırsız bir geçmişi taramaya dönüşmesin.
    /// </summary>
    public const int MaxDays = 31;

    /// <summary>
    /// İkisi de yoksa bugünün Pazartesi–Pazar haftası. Tek uç, ters aralık ve
    /// <see cref="MaxDays"/>'ten uzun aralık 400.
    /// </summary>
    /// <exception cref="ValidationException">Tek uçlu, ters ya da çok uzun aralık.</exception>
    public static (DateOnly From, DateOnly To) Resolve(DateOnly? from, DateOnly? to, DateOnly today)
    {
        if (from is null && to is null)
        {
            var haftaBasi = StreakCalculator.WeekStart(today);
            return (haftaBasi, haftaBasi.AddDays(6));
        }

        if (from is not { } start || to is not { } end)
        {
            throw new ValidationException("Dönemin iki ucu birlikte verilmeli.");
        }

        LocalDayRange.EnsureOrdered(start, end);

        if (end.DayNumber - start.DayNumber + 1 > MaxDays)
        {
            throw new ValidationException($"Dönem en fazla {MaxDays} gün olabilir.");
        }

        return (start, end);
    }
}
