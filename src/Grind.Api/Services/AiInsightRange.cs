using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Time;

namespace Grind.Api.Services;

/// <summary>
/// AI yorumunun kapsadığı TR günleri (Faz 12 spec Karar 4). Saf fonksiyon: "bugün" dışarıdan verilir.
/// Export'tan farklı olarak aralık her zaman SOMUTTUR: satırda saklanır (Karar 3) ve maliyet aralıkla
/// büyüdüğü için üstten sınırlıdır.
/// </summary>
public static class AiInsightRange
{
    /// <summary>Varsayılan uzunluk: bitiş günü dahil son 30 gün.</summary>
    public const int DefaultDays = 30;

    /// <summary>İki ucu dahil en fazla bu kadar gün: artık yıl dahil tam bir yıl.</summary>
    public const int MaxDays = 366;

    /// <summary>
    /// <paramref name="to"/> yoksa <paramref name="today"/>; <paramref name="from"/> yoksa
    /// <c>to − 29</c> gün. Ters aralık ve <see cref="MaxDays"/>'ten uzun aralık 400.
    /// </summary>
    /// <exception cref="ValidationException">Ters ya da çok uzun aralık.</exception>
    public static (DateOnly From, DateOnly To) Resolve(DateOnly? from, DateOnly? to, DateOnly today)
    {
        var end = to ?? today;

        // Takvimin ilk 29 gününe düşen bir bitişte AddDays taşar (ArgumentOutOfRangeException, eşlenmediği
        // için 500); başlangıç en erken güne sabitlenir.
        var start = from ?? (end.DayNumber >= DefaultDays - 1
            ? end.AddDays(-(DefaultDays - 1))
            : DateOnly.MinValue);

        LocalDayRange.EnsureOrdered(start, end);

        if (end.DayNumber - start.DayNumber + 1 > MaxDays)
        {
            throw new ValidationException($"Aralık en fazla {MaxDays} gün olabilir.");
        }

        return (start, end);
    }
}
