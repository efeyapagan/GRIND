using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.History;

/// <summary>
/// Geçmiş sorgusu. <c>From</c>/<c>To</c> TR yerel GÜNÜDÜR (<c>2026-03-01</c>) ve İKİ UCU DA
/// DAHİLDİR. <c>DateOnly</c> bilinçli: <c>DateTime</c> olsaydı istemcinin gönderdiği
/// <c>2026-03-01T00:00:00Z</c> sessizce TR 03:00'e denk gelir ve gecenin ilk üç saatindeki
/// antrenmanlar aralığın dışında kalırdı.
/// </summary>
public class HistoryQuery
{
    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }

    public long? ExerciseId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Sayfa numarası 1'den küçük olamaz.")]
    public int Page { get; set; } = 1;

    [Range(1, 100, ErrorMessage = "Sayfa boyutu 1 ile 100 arasında olmalı.")]
    public int PageSize { get; set; } = 20;
}
