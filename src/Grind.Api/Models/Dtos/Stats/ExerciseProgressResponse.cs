namespace Grind.Api.Models.Dtos.Stats;

/// <summary>Hareket ilerleme grafiğinin verisi; noktalar eskiden yeniye.</summary>
public record ExerciseProgressResponse(
    long ExerciseId,
    string ExerciseName,
    IReadOnlyList<ExerciseProgressPointResponse> Points);
