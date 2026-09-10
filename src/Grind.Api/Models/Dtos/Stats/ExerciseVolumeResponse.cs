namespace Grind.Api.Models.Dtos.Stats;

/// <summary>Bir egzersizin aralıktaki toplam hacmi. Liste hacme göre büyükten küçüğe sıralıdır.</summary>
public record ExerciseVolumeResponse(
    long ExerciseId, string ExerciseName, decimal Volume, int SetCount);
