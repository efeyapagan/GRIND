using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Common;

/// <summary>
/// Tarih aralıklı, sayfalı liste uçlarının ortak parametreleri (geçmiş, tartı listesi).
/// <c>From</c>/<c>To</c> TR yerel GÜNÜDÜR (<c>2026-03-01</c>) ve İKİ UCU DA DAHİLDİR. <c>DateOnly</c>
/// bilinçli: <c>DateTime</c> olsaydı istemcinin gönderdiği <c>2026-03-01T00:00:00Z</c> sessizce TR
/// 03:00'e denk gelir ve gecenin ilk üç saatindeki kayıtlar aralığın dışında kalırdı.
/// </summary>
public class PagedRangeQuery
{
    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Sayfa numarası 1'den küçük olamaz.")]
    public int Page { get; set; } = 1;

    [Range(1, 100, ErrorMessage = "Sayfa boyutu 1 ile 100 arasında olmalı.")]
    public int PageSize { get; set; } = 20;

    /// <summary>
    /// Atlanacak satır sayısı. <c>(Page - 1) * PageSize</c> denetimsiz (unchecked) bir int çarpımı
    /// olsaydı — proje <c>CheckForOverflowUnderflow</c> açmıyor, taşma exception fırlatmak yerine
    /// sessizce sarar — <c>[Range(1, int.MaxValue)]</c>'ın izin verdiği büyük bir sayfa numarası
    /// negatif bir değer üretir; <c>.Skip()</c> bunu PostgreSQL'e negatif bir OFFSET olarak iletir ve
    /// "OFFSET must not be negative" ile 500'e çıkar (Faz 9 final inceleme bulgusu). <c>long</c>'a
    /// genişletip <c>int.MaxValue</c>'da sınırlamak bunu önler; sonuç zaten mevcut satır sayısını
    /// fazlasıyla aştığı için "sayfanın sonunu geçmiş" boş sonuçla aynı davranışı verir.
    /// Özellik değil METOT: model binder yalnızca ayarlanabilir özellikleri bağlar ve API
    /// belgelemesi bir get-only özelliği sahte bir sorgu parametresi olarak gösterebilirdi.
    /// </summary>
    public int Skip() => (int)Math.Min((long)(Page - 1) * PageSize, int.MaxValue);
}
