namespace Grind.Api.Models.Enums;

public enum ExerciseCategory
{
    Push,
    Pull,
    Legs,

    /// <summary>#647: kardiyo makineleri. Adıyla saklanır; istemcide Other'dan önce gelir (enum sırası).</summary>
    Cardio,

    Other
}
