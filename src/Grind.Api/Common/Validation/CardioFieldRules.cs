using Grind.Api.Common.Exceptions;
using Grind.Api.Models.Dtos.Cardio;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;

namespace Grind.Api.Common.Validation;

/// <summary>
/// #647: kardiyo kaydının kutuları hareketin sorduğu kutularla sınırlı (<see cref="CardioFieldCatalog"/>) —
/// set girişindeki <see cref="SetMeasurementRules"/> ile aynı fikir. Aralıklar DTO'da denetlenir.
/// </summary>
public static class CardioFieldRules
{
    public static void EnsureAllowed(IReadOnlyList<CardioField> allowed, CardioValues values)
    {
        foreach (var (field, value) in Filled(values))
        {
            if (value is not null && !allowed.Contains(field))
            {
                throw new ValidationException($"Bu hareket için {field} girilemez.");
            }
        }
    }

    /// <summary>Kutuları kayda yazar; boş gelen kutu silinir (form hep tüm kutuları gönderir).</summary>
    public static void Apply(CardioEntry entry, CardioValues values)
    {
        entry.SpeedKmh = values.SpeedKmh;
        entry.InclinePercent = values.InclinePercent;
        entry.Level = values.Level;
        entry.Damper = values.Damper;
        entry.DistanceKm = values.DistanceKm;
        entry.Cadence = values.Cadence;
        entry.Floors = values.Floors;
        entry.Steps = values.Steps;
        entry.Jumps = values.Jumps;
        entry.Watts = values.Watts;
    }

    private static IEnumerable<(CardioField Field, object? Value)> Filled(CardioValues v) =>
    [
        (CardioField.Speed, v.SpeedKmh),
        (CardioField.Incline, v.InclinePercent),
        (CardioField.Level, v.Level),
        (CardioField.Damper, v.Damper),
        (CardioField.Distance, v.DistanceKm),
        (CardioField.Cadence, v.Cadence),
        (CardioField.Floors, v.Floors),
        (CardioField.Steps, v.Steps),
        (CardioField.Jumps, v.Jumps),
        (CardioField.Watts, v.Watts),
    ];
}
