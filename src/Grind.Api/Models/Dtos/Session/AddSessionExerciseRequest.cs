using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Session;

/// <summary>
/// Antrenmana hareket ekleme (#62). Hareket sona, hedefsiz eklenir; gorunurluk, arsiv ve tekrar
/// kurallari servis katmanindadir.
/// </summary>
public class AddSessionExerciseRequest
{
    [Required(ErrorMessage = "Bir hareket seçilmeli.")]
    [Range(1, long.MaxValue, ErrorMessage = "Geçerli bir hareket seçilmeli.")]
    public long? ExerciseId { get; set; }
}
