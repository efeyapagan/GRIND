using Grind.Api.Common.Exceptions;

namespace Grind.Api.Common.Time;

/// <summary>
/// Sorgu uçlarının ortak tarih aralığı çözümü. Geçmiş ve istatistik servisleri aynı kuralı
/// paylaşsın diye burada: aksi halde "bitiş günü dahil mi" sorusu her serviste yeniden
/// cevaplanır ve iki uç farklı aralıkları raporlar.
/// </summary>
public static class LocalDayRange
{
    /// <summary>
    /// TR yerel günlerinden UTC aralığı üretir: <paramref name="from"/> gününün başlangıcı (dahil)
    /// ile <paramref name="to"/> gününün SONU (ertesi günün başlangıcı, hariç). Null uçlar
    /// sınırsızdır.
    /// </summary>
    /// <exception cref="ValidationException"><paramref name="from"/> > <paramref name="to"/>.</exception>
    public static (DateTime? FromUtcInclusive, DateTime? ToUtcExclusive) Resolve(
        DateOnly? from, DateOnly? to)
    {
        if (from is { } start && to is { } end && start > end)
        {
            // Sessizce boş liste dönmek, kullanıcının parametreleri ters yazdığını gizlerdi.
            throw new ValidationException("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
        }

        return (
            from is { } fromDay ? TurkeyDay.RangeForLocalDate(fromDay).FromUtcInclusive : null,
            to is { } toDay ? TurkeyDay.RangeForLocalDate(toDay).ToUtcExclusive : null);
    }
}
