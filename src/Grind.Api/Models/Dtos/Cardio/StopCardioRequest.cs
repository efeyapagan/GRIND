namespace Grind.Api.Models.Dtos.Cardio;

/// <summary>#647: Durdur — süre = durdurma anı − başlangıç; sonuçlar ve düzeltilmiş ayarlar gövdede.</summary>
public class StopCardioRequest : CardioValues
{
    /// <summary>#174: Durdur'a cihazda basılan an; verilmezse sunucu saati.</summary>
    public DateTimeOffset? ClientStoppedAt { get; set; }
}
