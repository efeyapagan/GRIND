using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Record;

/// <summary>
/// Bir egzersizin tüm zamanlar özeti. İki ayrı "en iyi" var çünkü tek bir sette
/// buluşmak zorunda değiller: en ağır set 100 kg × 3 iken en çok tekrar 60 kg × 25
/// olabilir — ikisini tek satıra sıkıştırmak bilgiyi kaybettirir.
///
/// #346: süreli (<see cref="ExerciseMeasurement.Duration"/>) harekette özet yalnızca süreli setlerden kurulur
/// ve anlamlı alan <paramref name="BestDurationSeconds"/>'tır; kilo alanları 0, tekrar alanları <c>null</c>,
/// tarihler en uzun setin tarihidir. Diğer tiplerde <paramref name="BestDurationSeconds"/> <c>null</c>.
/// İstemci gösterimi <paramref name="Measurement"/>'a göre seçer.
/// </summary>
public record ExerciseRecordResponse(
    long ExerciseId,
    string ExerciseName,
    ExerciseCategory Category,
    decimal BestWeight,
    int? BestWeightReps,
    DateTime BestWeightAt,
    int? BestReps,
    decimal BestRepsWeight,
    DateTime BestRepsAt,
    ExerciseMeasurement Measurement,
    int? BestDurationSeconds);
