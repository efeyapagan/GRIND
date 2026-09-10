using Grind.Api.Common.Exceptions;

namespace Grind.Api.Common.Time;

/// <summary>
/// Sorgu uçlarının ortak tarih aralığı çözümü. Geçmiş, istatistik ve tartı listesi servisleri
/// aynı kuralı paylaşsın diye burada: aksi halde "bitiş günü dahil mi" sorusu her serviste
/// yeniden cevaplanır ve uçlar farklı aralıkları raporlar.
/// </summary>
public static class LocalDayRange
{
    /// <summary>
    /// TR yerel günlerinden UTC aralığı üretir: <paramref name="from"/> gününün başlangıcı (dahil)
    /// ile <paramref name="to"/> gününün SONU (ertesi günün başlangıcı, hariç). Null uçlar
    /// sınırsızdır.
    /// </summary>
    /// <exception cref="ValidationException">
    /// <paramref name="from"/> > <paramref name="to"/>; veya <paramref name="from"/>
    /// <see cref="DateOnly.MaxValue"/>.
    /// </exception>
    public static (DateTime? FromUtcInclusive, DateTime? ToUtcExclusive) Resolve(
        DateOnly? from, DateOnly? to)
    {
        if (from is { } start && to is { } end && start > end)
        {
            // Sessizce boş liste dönmek, kullanıcının parametreleri ters yazdığını gizlerdi.
            throw new ValidationException("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
        }

        // DateOnly.MaxValue (9999-12-31) TEK sorunlu değer: TurkeyDay bir sonraki günün
        // başlangıcını hesaplamak için AddDays(1) çağırır ve DateTime.MaxValue'yu aşar
        // (ArgumentOutOfRangeException, model binding'i geçtiği ve GlobalExceptionHandler
        // tarafından eşlenmediği için 500 olarak dışarı sızar). DateOnly.MinValue güvenlidir;
        // sorun sadece üst sınırda ve sadece bu tek değerde.
        //
        // Üst sınırda (to): "sınır yok" olarak yorumlanır, reddedilmez. "9999-12-31 dahil son
        // gün" ile "üst sınır yok" aynı satırları seçer — davranış korunur, sadece 500 yerine
        // doğru sonuç döner.
        //
        // Alt sınırda (from): aynı yorum burada GEÇERSİZ olurdu ("başlangıç sınırı yok" değil,
        // "9999-12-31'den itibaren" anlamına gelir — pratikte boş sonuç, ama anlamı farklı).
        // Anlamsız bir istek olduğu için 400 ile reddedilir; asla 500 olmamalı.
        if (from == DateOnly.MaxValue)
        {
            throw new ValidationException("Başlangıç tarihi olarak 9999-12-31 kullanılamaz.");
        }

        return (
            from is { } fromDay ? TurkeyDay.RangeForLocalDate(fromDay).FromUtcInclusive : null,
            to is { } toDay && toDay != DateOnly.MaxValue
                ? TurkeyDay.RangeForLocalDate(toDay).ToUtcExclusive
                : null);
    }
}
