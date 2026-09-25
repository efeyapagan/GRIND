namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Bir hareketin tek bir oturumdaki özeti (dilim 3 spec Karar 2). <paramref name="Date"/> oturum
/// başlangıcının TR günüdür. <paramref name="TopWeight"/> o oturumun en ağır seti; eşitlikte en çok
/// tekrarlı olan (<paramref name="TopWeightReps"/>). <paramref name="Volume"/> ve
/// <paramref name="SetCount"/> <c>GET /api/history?ExerciseId=</c> ile aynı tanımdır.
/// <paramref name="EstimatedOneRepMax"/> setlerin Brzycki tahminlerinin en büyüğü; hiçbiri tahmin
/// edilemiyorsa <c>null</c>.
/// <paramref name="Position"/> (#230): hareketin o oturumda kaçıncı sırada yapıldığı (1'den başlar,
/// bkz. <c>ExercisePositionCalculator</c>) — sıra performansı etkiler (günün ilk hareketinde daha
/// güçlü olunur), bu yüzden noktalar arasındaki bir sıçrama gerçek bir ilerleme olmayabilir.
/// <paramref name="PositionChanged"/>: bu noktanın pozisyonu, KENDİSİNDEN ÖNCEKİ noktanın
/// pozisyonundan farklıysa <c>true</c> — ilk nokta için her zaman <c>false</c> (kıyaslanacak önceki
/// nokta yok).
/// </summary>
public record ExerciseProgressPointResponse(
    long SessionId,
    DateTime StartedAt,
    DateOnly Date,
    decimal TopWeight,
    int TopWeightReps,
    decimal Volume,
    int SetCount,
    decimal? EstimatedOneRepMax,
    int Position,
    bool PositionChanged);
