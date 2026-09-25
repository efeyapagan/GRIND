using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Set;

/// <summary>
/// <c>SessionId</c> yanıtta yer alıyor çünkü set ekleme oturumu KENDİSİ açmış olabilir —
/// istemci hangi oturuma düştüğünü ancak buradan öğrenir.
/// <paramref name="RestSeconds"/> (#71): oturumdaki bir önceki setten bu yana geçen GERÇEK süre, sorgu
/// anında hesaplanır; oturumun ilk setinde <c>null</c>. Bkz. <c>RestIntervalCalculator</c>.
/// <paramref name="ExercisePosition"/> (#230): bu hareketin o oturumda kaçıncı sırada yapıldığı
/// (1'den başlar) — <c>ExercisePositionCalculator</c>, oturumun TÜM setlerinden hesaplanır.
/// </summary>
public record SetEntryResponse(
    long Id,
    long SessionId,
    long ExerciseId,
    string ExerciseName,
    int ExercisePosition,
    decimal Weight,
    int Reps,
    RecordType RecordType,
    decimal? Rir,
    DateTime CreatedAt,
    int? RestSeconds);
