using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Set;

/// <summary>
/// <c>SessionId</c> yanıtta yer alıyor çünkü set ekleme oturumu KENDİSİ açmış olabilir —
/// istemci hangi oturuma düştüğünü ancak buradan öğrenir.
/// <paramref name="RestSeconds"/> (#71): oturumdaki bir önceki setten bu yana geçen GERÇEK süre, sorgu
/// anında hesaplanır; oturumun ilk setinde <c>null</c>. Bkz. <c>RestIntervalCalculator</c>.
/// </summary>
public record SetEntryResponse(
    long Id,
    long SessionId,
    long ExerciseId,
    string ExerciseName,
    decimal Weight,
    int Reps,
    RecordType RecordType,
    int? Rir,
    DateTime CreatedAt,
    int? RestSeconds);
