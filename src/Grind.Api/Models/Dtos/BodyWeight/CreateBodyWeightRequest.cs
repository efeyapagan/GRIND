using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.BodyWeight;

/// <summary>
/// Tartı kaydı. <c>Weight</c> nullable + <c>[Required]</c>: non-nullable olsaydı gövdede hiç
/// gönderilmediğinde sessizce 0'a bağlanırdı (Faz 8'in <c>CreateSetRequest</c> dersi).
/// Alt sınır veritabanındaki <c>"Weight" &gt; 0</c> kısıtıyla hizalı — kısıt ihlali 400 yerine 500
/// üretirdi.
/// </summary>
public class CreateBodyWeightRequest
{
    [Required(ErrorMessage = "Kilo zorunlu.")]
    [Range(0.01, 999.99, ErrorMessage = "Kilo 0,01 ile 999,99 arasında olmalı.")]
    public decimal? Weight { get; set; }

    /// <summary>
    /// Opsiyonel; verilmezse şimdi. OFFSET İLE gönderilmeli (<c>2026-03-10T08:00:00+03:00</c> veya
    /// <c>...Z</c>) — offset'siz bir değer serileştirici tarafından sunucunun yerel saat dilimiyle
    /// yorumlanır. Tip <c>DateTimeOffset</c>, <c>DateTime</c> değil: offset'siz bir <c>DateTime</c>
    /// <c>Kind=Unspecified</c> bağlanır ve Npgsql onu <c>timestamptz</c>'ye yazmayı reddeder (500).
    /// Şimdiden 5 dakikadan fazla ileride bir zaman reddedilir (spec Karar 2).
    /// </summary>
    public DateTimeOffset? RecordedAt { get; set; }
}
