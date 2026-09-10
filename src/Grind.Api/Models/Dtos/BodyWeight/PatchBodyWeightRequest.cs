using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.BodyWeight;

/// <summary>
/// Kısmi güncelleme. <c>null</c> = "bu alana dokunma"; en az bir alan gönderilmeli. <c>PUT</c>
/// yok — Faz 8'in <c>SetEntry</c> deseniyle aynı (spec Karar 5). <c>RecordedAt</c> için
/// <see cref="CreateBodyWeightRequest.RecordedAt"/>'teki offset kuralı geçerli.
/// </summary>
public class PatchBodyWeightRequest
{
    [Range(0.01, 999.99, ErrorMessage = "Kilo 0,01 ile 999,99 arasında olmalı.")]
    public decimal? Weight { get; set; }

    public DateTimeOffset? RecordedAt { get; set; }
}
