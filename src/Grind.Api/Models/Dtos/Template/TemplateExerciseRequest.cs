using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// Şablondaki tek bir satır. <c>OrderIndex</c> BURADA YOK — sıralama dizideki konumdan
/// türetilir, böylece çakışan indeks, boşluk veya negatif değer oluşamaz.
/// </summary>
public class TemplateExerciseRequest
{
    [Range(1, long.MaxValue, ErrorMessage = "Geçerli bir egzersiz seçilmeli.")]
    public long ExerciseId { get; set; }

    /// <summary>Veritabanında da CHECK ile korunuyor (<c>PlannedSets &gt; 0</c>).</summary>
    [Range(1, 50, ErrorMessage = "Hedef set sayısı 1-50 arasında olmalı.")]
    public int PlannedSets { get; set; }
}
