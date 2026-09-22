namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Platodaki bir hareket (#72): tahmini 1RM <see cref="Weeks"/> haftadır <see cref="BestOneRepMax"/>'ı
/// geçmedi. <see cref="BestOn"/> en iyiye ilk ulaşılan TR günüdür.
/// </summary>
public record PlateauResponse(
    long ExerciseId,
    string ExerciseName,
    decimal BestOneRepMax,
    DateOnly BestOn,
    int Weeks);
