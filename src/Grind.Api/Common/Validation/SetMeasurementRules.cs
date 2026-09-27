using Grind.Api.Common.Exceptions;
using Grind.Api.Models.Enums;

namespace Grind.Api.Common.Validation;

/// <summary>
/// #346: bir setin hangi alanları taşıyabileceği hareketin ölçüm tipine bağlıdır. Ekleme ve düzeltme aynı
/// kuralları kullanır (DRY); DTO bunu bilemez çünkü tip hareketten gelir.
/// </summary>
public static class SetMeasurementRules
{
    /// <summary>Gönderilen (<c>null</c> olmayan) alanlardan tipe uymayan varsa reddeder.</summary>
    public static void EnsureAllowed(
        ExerciseMeasurement measurement, decimal? weight, int? reps, decimal? rir, int? durationSeconds)
    {
        switch (measurement)
        {
            case ExerciseMeasurement.WeightReps when durationSeconds is not null:
                throw new ValidationException("Bu hareket süreyle değil, ağırlık ve tekrarla kaydedilir.");
            case ExerciseMeasurement.Reps when durationSeconds is not null:
                throw new ValidationException("Bu hareket süreyle değil, tekrarla kaydedilir.");
            case ExerciseMeasurement.Reps when rir is not null:
                throw new ValidationException("Bu harekette RIR girilmez.");
            case ExerciseMeasurement.Duration when reps is not null || rir is not null || weight > 0:
                throw new ValidationException("Bu hareket yalnızca süreyle kaydedilir.");
        }
    }

    /// <summary>Yeni bir sette tipin zorunlu alanları. Metinler #346 öncesi DTO'daki <c>[Required]</c> metinleriyle aynı.</summary>
    public static void EnsureRequired(
        ExerciseMeasurement measurement, decimal? weight, int? reps, int? durationSeconds)
    {
        if (measurement == ExerciseMeasurement.WeightReps && weight is null)
        {
            throw new ValidationException("Ağırlık zorunlu.");
        }

        if (measurement != ExerciseMeasurement.Duration && reps is null)
        {
            throw new ValidationException("Tekrar sayısı zorunlu.");
        }

        if (measurement == ExerciseMeasurement.Duration && durationSeconds is null)
        {
            throw new ValidationException("Süre zorunlu.");
        }
    }
}
