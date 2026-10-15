namespace Grind.Api.Models.Enums;

public enum RecordType
{
    None,
    Weight,
    Reps,

    /// <summary>#346: süreli harekette (<see cref="ExerciseMeasurement.Duration"/>) en uzun süre.</summary>
    Duration,

    /// <summary>#647: kardiyo kaydında en uzun mesafe. Yalnızca bildirimde görünür; kardiyo kaydının kendisi iki bool taşır.</summary>
    Distance
}
