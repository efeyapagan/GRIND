using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Set;

/// <summary>
/// DİKKAT: alanlar nullable + [Required]. Non-nullable olsalardı gövdede HİÇ
/// gönderilmediklerinde sessizce varsayılana (0) bağlanırlardı — ve <c>Weight = 0</c>
/// bu domende GEÇERLİ bir değer olduğu için (barfiks/dips) hata hiç fark edilmezdi.
/// Faz 4'te aynı tuzak enum alanında gerçek veri kaybı üretmişti.
///
/// #346: <c>Weight</c>, <c>Reps</c> ve <c>DurationSeconds</c>'ın zorunluluğu hareketin ölçüm tipine bağlı
/// (kilolu harekette ağırlık + tekrar, ağırlıksızda tekrar, süreli harekette süre); DTO tipi bilmediği için
/// <c>[Required]</c> yerine <c>SetMeasurementRules</c> serviste denetler. Nullable kalmaları hâlâ şart:
/// "gönderilmedi" ile "0" ayırt edilmeli.
/// </summary>
public class CreateSetRequest
{
    [Required(ErrorMessage = "Egzersiz zorunlu.")]
    public long? ExerciseId { get; set; }

    [Range(0, 9999.99, ErrorMessage = "Ağırlık 0 ile 9999,99 arasında olmalı.")]
    public decimal? Weight { get; set; }

    [Range(1, 1000, ErrorMessage = "Tekrar 1 ile 1000 arasında olmalı.")]
    public int? Reps { get; set; }

    /// <summary>Reps in Reserve — opsiyonel.</summary>
    [Range(0, 5, ErrorMessage = "RIR 0 ile 5 arasında olmalı (5 = 4+).")]
    public decimal? Rir { get; set; }

    /// <summary>Süreli harekette (#346) setin süresi, saniye.</summary>
    [Range(1, 3600, ErrorMessage = "Süre 1 ile 3600 saniye arasında olmalı.")]
    public int? DurationSeconds { get; set; }
}
