using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Set;

/// <summary>
/// <c>SessionId</c> yanıtta yer alıyor çünkü set ekleme oturumu KENDİSİ açmış olabilir —
/// istemci hangi oturuma düştüğünü ancak buradan öğrenir.
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
    DateTime CreatedAt);
