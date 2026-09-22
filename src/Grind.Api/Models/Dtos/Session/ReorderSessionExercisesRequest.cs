using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Session;

/// <summary>
/// Antrenmanin hareket sirasi (#229): antrenmandaki TUM hareketlerin yeni sirasi. Listenin antrenmanla
/// birebir eslesmesi kurali servis katmanindadir.
/// </summary>
public class ReorderSessionExercisesRequest
{
    [Required(ErrorMessage = "Hareketlerin yeni sırası gönderilmeli.")]
    public List<long>? ExerciseIds { get; set; }
}
