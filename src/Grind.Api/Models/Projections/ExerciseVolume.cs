namespace Grind.Api.Models.Projections;

/// <summary>
/// Egzersiz başına hacim toplamı — repository'nin OKUMA MODELİ, DTO DEĞİL. Toplama tamamen
/// SQL'de yapılır; bu tip yalnızca sonucu taşır.
/// </summary>
public record ExerciseVolume(long ExerciseId, string ExerciseName, decimal Volume, int SetCount);
