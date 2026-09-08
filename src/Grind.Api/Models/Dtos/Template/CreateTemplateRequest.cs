using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Template;

public class CreateTemplateRequest
{
    [Required(ErrorMessage = "Şablon adı zorunlu.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Şablon adı 2-100 karakter olmalı.")]
    public string Name { get; set; } = string.Empty;

    /// <summary>Boş olabilir: önce şablonu açıp sonra doldurmak doğal bir akış.</summary>
    public List<TemplateExerciseRequest> Exercises { get; set; } = [];
}
