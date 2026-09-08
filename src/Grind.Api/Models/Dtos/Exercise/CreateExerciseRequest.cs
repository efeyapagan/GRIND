using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Exercise;

public class CreateExerciseRequest
{
    [Required(ErrorMessage = "Egzersiz adı zorunlu.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Egzersiz adı 2-100 karakter olmalı.")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// [EnumDataType], System.Text.Json'ın tanımsız bir SAYI değerini (örn. 99) sessizce
    /// bağlamasını yakalar, JsonStringEnumConverter açıkken bile. Ama alan hiç GÖNDERİLMEZSE
    /// bunu yakalayamaz: model binder, non-nullable bir enum'u sessizce 0'da (geçerli bir üye —
    /// burada <see cref="ExerciseCategory.Push"/>) bırakır. Onu yakalayan [Required] — ve
    /// [Required]'in "alan yok" ile "alan var ama boş" farkını görebilmesi için Category
    /// nullable olmak ZORUNDA; non-nullable bir enum üzerinde [Required] hiçbir zaman tetiklenmez.
    /// </summary>
    [Required(ErrorMessage = "Kategori zorunlu.")]
    [EnumDataType(typeof(ExerciseCategory), ErrorMessage = "Geçersiz kategori.")]
    public ExerciseCategory? Category { get; set; }
}
