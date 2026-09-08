using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Exercise;

/// <summary>
/// Bugün <see cref="CreateExerciseRequest"/> ile aynı alanları taşıyor ama bilerek ayrı bir
/// tip: oluşturma ve güncelleme farklı zamanlarda ayrışır (örn. güncellemede ad değiştirmeyi
/// yasaklamak istersek), ve tek tip kullanmak Swagger'da iki işlemi aynı şemaya bağlar.
/// </summary>
public class UpdateExerciseRequest
{
    [Required(ErrorMessage = "Egzersiz adı zorunlu.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Egzersiz adı 2-100 karakter olmalı.")]
    public string Name { get; set; } = string.Empty;

    [EnumDataType(typeof(ExerciseCategory), ErrorMessage = "Geçersiz kategori.")]
    public ExerciseCategory Category { get; set; }
}
