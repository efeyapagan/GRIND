namespace Grind.Api.Models.Dtos.Common;

/// <summary>
/// Tarih aralıklı, sayfalı liste uçlarının ortak parametreleri (geçmiş, tartı listesi). Sayfalama
/// <see cref="PagedQuery"/>'den gelir. <c>From</c>/<c>To</c> TR yerel GÜNÜDÜR (<c>2026-03-01</c>) ve İKİ
/// UCU DA DAHİLDİR. <c>DateOnly</c> bilinçli: <c>DateTime</c> olsaydı istemcinin gönderdiği
/// <c>2026-03-01T00:00:00Z</c> sessizce TR 03:00'e denk gelir ve gecenin ilk üç saatindeki kayıtlar
/// aralığın dışında kalırdı.
/// </summary>
public class PagedRangeQuery : PagedQuery
{
    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }
}
