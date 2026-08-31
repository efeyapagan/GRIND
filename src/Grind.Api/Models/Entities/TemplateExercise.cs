namespace Grind.Api.Models.Entities;

public class TemplateExercise
{
    public long Id { get; set; }
    public long WorkoutTemplateId { get; set; }
    public long ExerciseId { get; set; }
    public int OrderIndex { get; set; }

    /// <summary>Hedeflenen set sayısı. Ağırlık/tekrar burada YOKTUR — onlar SetEntry'de yaşar.</summary>
    public int PlannedSets { get; set; }

    public WorkoutTemplate WorkoutTemplate { get; set; } = null!;
    public Exercise Exercise { get; set; } = null!;
}
