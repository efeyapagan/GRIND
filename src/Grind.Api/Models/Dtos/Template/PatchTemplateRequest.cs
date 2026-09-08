using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// Kısmi güncelleme: yalnızca GÖNDERİLEN alan değişir. <c>null</c> "bu alana dokunma"
/// demektir. <c>Exercises</c> gönderilirse liste TOPTAN değişir (kısmi liste birleştirme
/// yok — hangi satırın kalacağı belirsiz olurdu).
/// </summary>
public class PatchTemplateRequest
{
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Şablon adı 2-100 karakter olmalı.")]
    public string? Name { get; set; }

    public List<TemplateExerciseRequest>? Exercises { get; set; }
}
