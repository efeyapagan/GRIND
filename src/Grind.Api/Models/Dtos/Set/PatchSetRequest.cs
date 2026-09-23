using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Set;

/// <summary>
/// Kısmi güncelleme. <c>null</c> = "bu alana dokunma". <c>PUT</c> BİLEREK YOK: tam
/// değiştirme, gövdede gönderilmeyen <c>Rir</c>'i sessizce siler — aynı tuzak Faz 4 ve
/// Faz 6'da iki kez gerçek veri kaybı üretti (spec Soru 3/A).
/// Bedeli kabul edildi: <c>Rir</c>'i temizlemenin yolu yok.
/// </summary>
public class PatchSetRequest
{
    [Range(0, 9999.99, ErrorMessage = "Ağırlık 0 ile 9999,99 arasında olmalı.")]
    public decimal? Weight { get; set; }

    [Range(1, 1000, ErrorMessage = "Tekrar 1 ile 1000 arasında olmalı.")]
    public int? Reps { get; set; }

    [Range(0, 5, ErrorMessage = "RIR 0 ile 5 arasında olmalı (5 = 4+).")]
    public decimal? Rir { get; set; }
}
