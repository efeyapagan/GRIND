using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Cardio;

/// <summary>#647: bitmiş kaydı düzeltme — süre de düzeltilebilir (Başlat'a geç basıldıysa).</summary>
public class UpdateCardioRequest : CardioValues
{
    [Required(ErrorMessage = "Süre zorunlu.")]
    [Range(1, 14400, ErrorMessage = "Süre 1 ile 14400 saniye arasında olmalı.")]
    public int? DurationSeconds { get; set; }
}
