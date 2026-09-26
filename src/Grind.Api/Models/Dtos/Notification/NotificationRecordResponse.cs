using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Notification;

/// <summary>Rekor bildiriminde bir hareket: o antrenmandaki en iyi rekor seti.</summary>
public record NotificationRecordResponse(
    long ExerciseId, string ExerciseName, decimal Weight, int Reps, RecordType RecordType);
