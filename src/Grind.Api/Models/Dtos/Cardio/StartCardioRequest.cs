using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Cardio;

/// <summary>#647: Başlat — makinenin ayarlarıyla (hız, eğim, seviye, damper) açılır; süre akmaya başlar.</summary>
public class StartCardioRequest : CardioValues
{
    [Required(ErrorMessage = "Egzersiz zorunlu.")]
    public long? ExerciseId { get; set; }

    /// <summary>#174: Başlat'a cihazda basılan an; verilmezse sunucu saati, gelecekteki zaman reddedilir.</summary>
    public DateTimeOffset? ClientStartedAt { get; set; }

    public Guid? ClientRequestId { get; set; }
}
