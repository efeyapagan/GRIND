using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Set;

/// <summary>
/// <c>SessionId</c> yanıtta yer alıyor çünkü set ekleme oturumu KENDİSİ açmış olabilir —
/// istemci hangi oturuma düştüğünü ancak buradan öğrenir.
/// <paramref name="RestSeconds"/> (#71): oturumdaki bir önceki setten bu yana geçen GERÇEK süre, sorgu
/// anında hesaplanır; oturumun ilk setinde <c>null</c>. Bkz. <c>RestIntervalCalculator</c>.
/// <paramref name="ExercisePosition"/> (#230): bu hareketin o oturumda kaçıncı sırada yapıldığı
/// (1'den başlar) — <c>ExercisePositionCalculator</c>, oturumun TÜM setlerinden hesaplanır.
/// <paramref name="Reps"/> / <paramref name="DurationSeconds"/> (#346): set ya tekrarla ya süreyle ölçülür,
/// diğeri <c>null</c>. <paramref name="Measurement"/> hareketin ölçüm tipidir: istemci ağırlıksız setin
/// "0 kg × 20" değil "20 tekrar" diye yazılacağını buradan bilir. Süre önceliklidir — tip #346'yla süreliye
/// dönen hareketin süresiz eski setleri eskisi gibi "kg × tekrar" görünür.
/// </summary>
public record SetEntryResponse(
    long Id,
    long SessionId,
    long ExerciseId,
    string ExerciseName,
    int ExercisePosition,
    decimal Weight,
    int? Reps,
    int? DurationSeconds,
    RecordType RecordType,
    decimal? Rir,
    DateTime CreatedAt,
    int? RestSeconds,
    ExerciseMeasurement Measurement);
