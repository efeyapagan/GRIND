using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Projections;

/// <summary>Beni takip eden birinin <c>Follow</c> satırı (#325) — repository'nin okuma modeli.</summary>
public record FollowEvent(long FollowId, DateTime OccurredAt, UserRef Actor);

/// <summary>Takip ettiğim birinin rekorlu, bitmiş antrenmanı; <see cref="OccurredAt"/> = <c>EndedAt</c>.</summary>
public record RecordSessionEvent(long SessionId, DateTime OccurredAt, UserRef Actor);

/// <summary>
/// Rekorlu antrenmanlardaki bir rekor seti. <see cref="OrderIndex"/> hareketin o antrenmandaki sırası;
/// hareket antrenmanın listesinde yoksa <c>null</c>. Set ya <see cref="Reps"/> ya
/// <see cref="DurationSeconds"/> taşır (#346).
/// </summary>
public record RecordSetRow(
    long SessionId, long ExerciseId, string ExerciseName, decimal Weight, int? Reps, int? DurationSeconds,
    RecordType RecordType, DateTime CreatedAt, int? OrderIndex, ExerciseMeasurement Measurement);

/// <summary>
/// #419: bir arkadaşın haftalık hedefe sayılabilecek bir antrenmanı. Hangi oturumun hedefi
/// TAMAMLADIĞI burada değil <c>WeeklyGoalCompletion</c>'da karara bağlanır -- sorgu yalnızca ham
/// satırları getirir (hedef de satırla birlikte gelir ki kişi başına ikinci sorgu gerekmesin).
/// </summary>
public record FriendSessionDayRow(long SessionId, DateTime StartedAt, int? WeeklyTargetDays, UserRef Actor);

/// <summary>Bana gelen bekleyen arkadaşlık isteği (#628); <see cref="OccurredAt"/> = <c>CreatedAt</c>.</summary>
public record FriendRequestEvent(long RequestId, DateTime OccurredAt, UserRef Actor);
