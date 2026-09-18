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

    [Range(1, 300, ErrorMessage = "Boy 1 ile 300 cm arasında olmalı.")]
    public decimal? HeightCm { get; set; }

    [Range(0.1, 75, ErrorMessage = "Vücut yağ oranı 0,1 ile 75 arasında olmalı.")]
    public decimal? BodyFatPercent { get; set; }

    [Range(1, 250, ErrorMessage = "Bel çevresi 1 ile 250 cm arasında olmalı.")]
    public decimal? WaistCm { get; set; }

    [Range(1, 250, ErrorMessage = "Kalça çevresi 1 ile 250 cm arasında olmalı.")]
    public decimal? HipCm { get; set; }

    public DateTimeOffset? RecordedAt { get; set; }
}
