namespace Grind.Api.Models.Entities;

public class TemplateExercise
{
    /// <summary>
    /// Dinlenme süresi gönderilmezse kullanılan değer (saniye). Servis ve kolon varsayılanı
    /// (dolayısıyla migration) aynı sabiti kullanır; frontend'deki VARSAYILAN_DINLENME_SN bunun aynasıdır.
    /// </summary>
    public const int DefaultRestSeconds = 90;

    public long Id { get; set; }
    public long WorkoutTemplateId { get; set; }
    public long ExerciseId { get; set; }
    public int OrderIndex { get; set; }

    /// <summary>Hedeflenen set sayısı. Ağırlık/tekrar burada YOKTUR — onlar SetEntry'de yaşar.</summary>
    public int PlannedSets { get; set; }

    /// <summary>Setler arası dinlenme (saniye), 0-900. <c>0</c> = bu harekette dinlenme sayacı yok.</summary>
    public int RestSeconds { get; set; } = DefaultRestSeconds;

    public WorkoutTemplate WorkoutTemplate { get; set; } = null!;
    public Exercise Exercise { get; set; } = null!;
}
