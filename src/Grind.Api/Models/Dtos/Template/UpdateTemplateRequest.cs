using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// Tam değiştirme (PUT): ad ve egzersiz listesinin tamamı. Yalnızca bir alanı değiştirmek
/// için <see cref="PatchTemplateRequest"/> kullanılır.
/// </summary>
public class UpdateTemplateRequest
{
    [Required(ErrorMessage = "Şablon adı zorunlu.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Şablon adı 2-100 karakter olmalı.")]
    public string Name { get; set; } = string.Empty;

    public List<TemplateExerciseRequest> Exercises { get; set; } = [];
}
