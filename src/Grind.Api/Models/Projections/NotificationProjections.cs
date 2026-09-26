using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Projections;

/// <summary>Beni takip eden birinin <c>Follow</c> satırı (#325) — repository'nin okuma modeli.</summary>
public record FollowEvent(long FollowId, DateTime OccurredAt, UserRef Actor);

/// <summary>Takip ettiğim birinin rekorlu, bitmiş antrenmanı; <see cref="OccurredAt"/> = <c>EndedAt</c>.</summary>
public record RecordSessionEvent(long SessionId, DateTime OccurredAt, UserRef Actor);

/// <summary>
/// Rekorlu antrenmanlardaki bir rekor seti. <see cref="OrderIndex"/> hareketin o antrenmandaki sırası;
/// hareket antrenmanın listesinde yoksa <c>null</c>.
/// </summary>
public record RecordSetRow(
    long SessionId, long ExerciseId, string ExerciseName, decimal Weight, int Reps,
    RecordType RecordType, DateTime CreatedAt, int? OrderIndex);
