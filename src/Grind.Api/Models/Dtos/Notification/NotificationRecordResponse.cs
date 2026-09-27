using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Notification;

/// <summary>
/// Rekor bildiriminde bir hareket: o antrenmandaki en iyi rekor seti. Set ya <see cref="Reps"/> ya
/// <see cref="DurationSeconds"/> taşır (#346, süreli hareket).
/// </summary>
public record NotificationRecordResponse(
    long ExerciseId, string ExerciseName, decimal Weight, int? Reps, int? DurationSeconds, RecordType RecordType);
