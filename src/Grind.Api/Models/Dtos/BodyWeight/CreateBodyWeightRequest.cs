using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.BodyWeight;

/// <summary>
/// Vücut ölçüsü kaydı (issue #119, kullanıcı kararıyla revize edildi). <see cref="Weight"/> ve
/// <see cref="HeightCm"/> ZORUNLUDUR (BMI benzeri bir taban ölçü çifti); <see cref="BodyFatPercent"/>,
/// <see cref="WaistCm"/> ve <see cref="HipCm"/> opsiyoneldir. Alanlar bilerek <c>decimal?</c> +
/// <c>[Required]</c>: non-nullable olsaydı gövdede hiç gönderilmediğinde sessizce 0'a bağlanırdı
/// (Faz 8'in <c>CreateSetRequest</c> dersi).
/// </summary>
public class CreateBodyWeightRequest
{
    [Required(ErrorMessage = "Kilo zorunlu.")]
    [Range(0.01, 999.99, ErrorMessage = "Kilo 0,01 ile 999,99 arasında olmalı.")]
    public decimal? Weight { get; set; }

    [Required(ErrorMessage = "Boy zorunlu.")]
    [Range(1, 300, ErrorMessage = "Boy 1 ile 300 cm arasında olmalı.")]
    public decimal? HeightCm { get; set; }

    [Range(0.1, 75, ErrorMessage = "Vücut yağ oranı 0,1 ile 75 arasında olmalı.")]
    public decimal? BodyFatPercent { get; set; }

    [Range(1, 250, ErrorMessage = "Bel çevresi 1 ile 250 cm arasında olmalı.")]
    public decimal? WaistCm { get; set; }

    [Range(1, 250, ErrorMessage = "Kalça çevresi 1 ile 250 cm arasında olmalı.")]
    public decimal? HipCm { get; set; }

    /// <summary>
    /// Opsiyonel; verilmezse şimdi. OFFSET İLE gönderilmeli (<c>2026-03-10T08:00:00+03:00</c> veya
    /// <c>...Z</c>) — offset'siz bir değer serileştirici tarafından sunucunun yerel saat dilimiyle
    /// yorumlanır. Tip <c>DateTimeOffset</c>, <c>DateTime</c> değil: offset'siz bir <c>DateTime</c>
    /// <c>Kind=Unspecified</c> bağlanır ve Npgsql onu <c>timestamptz</c>'ye yazmayı reddeder (500).
    /// Şimdiden 5 dakikadan fazla ileride bir zaman reddedilir (spec Karar 2).
    /// </summary>
    public DateTimeOffset? RecordedAt { get; set; }
}
