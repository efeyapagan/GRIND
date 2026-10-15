using Grind.Api.Models.Dtos.Cardio;
using Grind.Api.Models.Entities;

namespace Grind.Api.Services;

/// <summary>#647: kardiyo kaydı → yanıt. <c>Exercise</c> yüklü olmalı.</summary>
public static class CardioMapping
{
    public static CardioEntryResponse ToResponse(CardioEntry c) => new(
        c.Id, c.WorkoutSessionId, c.ExerciseId, c.Exercise.Name, c.StartedAt, c.DurationSeconds,
        c.SpeedKmh, c.InclinePercent, c.Level, c.Damper, c.DistanceKm, c.Cadence, c.Floors, c.Steps, c.Jumps, c.Watts,
        c.IsDurationRecord, c.IsDistanceRecord);
}
