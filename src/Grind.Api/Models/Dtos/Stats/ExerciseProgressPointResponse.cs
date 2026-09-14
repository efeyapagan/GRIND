namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Bir hareketin tek bir oturumdaki özeti (dilim 3 spec Karar 2). <paramref name="Date"/> oturum
/// başlangıcının TR günüdür. <paramref name="TopWeight"/> o oturumun en ağır seti; eşitlikte en çok
/// tekrarlı olan (<paramref name="TopWeightReps"/>). <paramref name="Volume"/> ve
/// <paramref name="SetCount"/> <c>GET /api/history?ExerciseId=</c> ile aynı tanımdır.
/// <paramref name="EstimatedOneRepMax"/> setlerin Brzycki tahminlerinin en büyüğü; hiçbiri tahmin
/// edilemiyorsa <c>null</c>.
/// </summary>
public record ExerciseProgressPointResponse(
    long SessionId,
    DateTime StartedAt,
    DateOnly Date,
    decimal TopWeight,
    int TopWeightReps,
    decimal Volume,
    int SetCount,
    decimal? EstimatedOneRepMax);
