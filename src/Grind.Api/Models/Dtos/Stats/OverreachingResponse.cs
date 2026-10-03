namespace Grind.Api.Models.Dtos.Stats;

/// <summary>#176: bir hareketin düşüşü — önceki ve son dönemdeki en iyi tahmini 1RM, yüzde (7.3 = %7,3).</summary>
public record ExerciseDropResponse(
    long ExerciseId, string ExerciseName, decimal PreviousBest, decimal RecentBest, decimal DropPercent);

/// <summary>
/// #176: yanan sinyal. <paramref name="Drops"/> düşüşü büyükten küçüğe. RIR ortalamaları yalnızca RIR kuralı
/// değerlendirilebildiyse (iki dönemde de ≥ 2 RIR'lı set) dolu. Zorluk sayıları son dönemin bitmiş oturumları.
/// </summary>
public record OverreachingSignalResponse(
    IReadOnlyList<ExerciseDropResponse> Drops,
    decimal? RirBefore,
    decimal? RirRecent,
    int HardSessions,
    int RatedSessions);

/// <summary>#176: <c>GET /api/stats/overreaching</c>; sinyal yoksa <c>Signal</c> null.</summary>
public record OverreachingResponse(OverreachingSignalResponse? Signal);
