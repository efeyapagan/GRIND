using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Projections;

/// <summary>
/// #176: aşırı yüklenme analizi için bir set — oturumun başlangıcı (dönemi o belirler), bitip bitmediği ve
/// zorluğu, hareketin adı ve ölçüm tipi, kilo/tekrar/RIR. Repository'nin okuma modeli.
/// </summary>
public record OverreachingSetRow(
    long SessionId, DateTime SessionStartedAt, bool SessionEnded, SessionDifficulty? Difficulty,
    long ExerciseId, string ExerciseName, ExerciseMeasurement Measurement,
    decimal Weight, int? Reps, decimal? Rir);
