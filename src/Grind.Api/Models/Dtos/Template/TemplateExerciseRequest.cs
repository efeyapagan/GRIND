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

    /// <summary>
    /// Setler arası dinlenme (saniye), <c>0</c> = sayaç yok. Nullable BİLEREK: gönderilmezse
    /// <see cref="Grind.Api.Models.Entities.TemplateExercise.DefaultRestSeconds"/> yazılır. <c>int</c>
    /// olsaydı alanı göndermeyen bir istemci C#'ın varsayılanı 0'ı, yani "sayaç yok"u sessizce
    /// yazardı. Veritabanında da CHECK ile korunuyor.
    /// DİKKAT: PUT/PATCH bir egzersiz listesiyle geldiğinde satırlar HER SEFERİNDE sıfırdan
    /// yeniden kurulur (Karar 1) — yani bu alanı olmadan gönderilen bir satır "eskisi gibi kalsın"
    /// anlamına GELMEZ, mevcut değer korunmaz; varsayılan değer yeniden yazılır.
    /// </summary>
    [Range(0, 900, ErrorMessage = "Dinlenme süresi 0-900 saniye arasında olmalı.")]
    public int? RestSeconds { get; set; }
}
