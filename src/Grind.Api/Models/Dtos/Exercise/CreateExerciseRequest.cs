using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Exercise;

public class CreateExerciseRequest
{
    [Required(ErrorMessage = "Egzersiz adı zorunlu.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Egzersiz adı 2-100 karakter olmalı.")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// [EnumDataType] şart: System.Text.Json tanımsız bir sayı değerini (örn. 99) sessizce
    /// bağlıyor, JsonStringEnumConverter açıkken bile.
    /// </summary>
    [EnumDataType(typeof(ExerciseCategory), ErrorMessage = "Geçersiz kategori.")]
    public ExerciseCategory Category { get; set; }
}
