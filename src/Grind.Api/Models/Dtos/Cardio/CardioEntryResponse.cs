namespace Grind.Api.Models.Dtos.Cardio;

/// <summary>
/// #647: bir kardiyo kaydı. <paramref name="DurationSeconds"/> <c>null</c> ise kayıt hâlâ akıyor; istemci sayacı
/// <paramref name="StartedAt"/>'ten hesaplar. Rekor rozetleri yalnızca bitmiş kayıtta anlamlıdır.
/// </summary>
public record CardioEntryResponse(
    long Id,
    long SessionId,
    long ExerciseId,
    string ExerciseName,
    DateTime StartedAt,
    int? DurationSeconds,
    decimal? SpeedKmh,
    decimal? InclinePercent,
    int? Level,
    int? Damper,
    decimal? DistanceKm,
    int? Cadence,
    int? Floors,
    int? Steps,
    int? Jumps,
    int? Watts,
    bool IsDurationRecord,
    bool IsDistanceRecord);
