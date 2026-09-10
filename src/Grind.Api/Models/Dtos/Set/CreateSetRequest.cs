using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Set;

/// <summary>
/// DİKKAT: alanlar nullable + [Required]. Non-nullable olsalardı gövdede HİÇ
/// gönderilmediklerinde sessizce varsayılana (0) bağlanırlardı — ve <c>Weight = 0</c>
/// bu domende GEÇERLİ bir değer olduğu için (barfiks/dips) hata hiç fark edilmezdi.
/// Faz 4'te aynı tuzak enum alanında gerçek veri kaybı üretmişti.
/// </summary>
public class CreateSetRequest
{
    [Required(ErrorMessage = "Egzersiz zorunlu.")]
    public long? ExerciseId { get; set; }

    [Required(ErrorMessage = "Ağırlık zorunlu.")]
    [Range(0, 9999.99, ErrorMessage = "Ağırlık 0 ile 9999,99 arasında olmalı.")]
    public decimal? Weight { get; set; }

    [Required(ErrorMessage = "Tekrar sayısı zorunlu.")]
    [Range(1, 1000, ErrorMessage = "Tekrar 1 ile 1000 arasında olmalı.")]
    public int? Reps { get; set; }

    /// <summary>Reps in Reserve — opsiyonel.</summary>
    [Range(0, 100, ErrorMessage = "RIR 0 ile 100 arasında olmalı.")]
    public int? Rir { get; set; }
}
