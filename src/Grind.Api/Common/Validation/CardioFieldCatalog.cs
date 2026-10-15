using Grind.Api.Models.Enums;

namespace Grind.Api.Common.Validation;

/// <summary>
/// #647: hangi kardiyo makinesinin süre dışında hangi kutuları sorduğu (spec "Araştırma" tablosu). Makineler
/// global seed'de durduğu için eşleme de kodda; veritabanında virgüllü bir kolon 1NF'yi bozardı. İstemci kutuları
/// hareket yanıtındaki <c>cardioFields</c>'tan çizer, makine adına bakmaz. Tabloda olmayan kardiyo hareketi
/// (kullanıcının kendi oluşturduğu) yalnızca mesafe sorar.
/// </summary>
public static class CardioFieldCatalog
{
    private static readonly IReadOnlyList<CardioField> Default = [CardioField.Distance];

    private static readonly Dictionary<long, IReadOnlyList<CardioField>> ByExercise = new()
    {
        [193] = [CardioField.Speed, CardioField.Incline, CardioField.Distance],                         // Treadmill
        [194] = [CardioField.Speed, CardioField.Distance],                                              // Walking Pad
        [195] = [CardioField.Level, CardioField.Distance, CardioField.Cadence],                         // Stationary Bike
        [196] = [CardioField.Level, CardioField.Distance, CardioField.Cadence],                         // Recumbent Bike
        [197] = [CardioField.Level, CardioField.Distance, CardioField.Cadence, CardioField.Watts],      // Spin Bike
        [198] = [CardioField.Distance, CardioField.Cadence, CardioField.Watts],                         // Air Bike
        [199] = [CardioField.Level, CardioField.Incline, CardioField.Distance, CardioField.Cadence],    // Elliptical
        [200] = [CardioField.Level, CardioField.Floors],                                                // Stair Climber
        [201] = [CardioField.Level, CardioField.Steps],                                                 // Stepper
        [202] = [CardioField.Damper, CardioField.Distance, CardioField.Cadence, CardioField.Watts],     // Rowing Machine
        [203] = [CardioField.Damper, CardioField.Distance, CardioField.Cadence, CardioField.Watts],     // Ski Erg
        [204] = [CardioField.Steps],                                                                    // Vertical Climber
        [205] = [CardioField.Jumps],                                                                    // Jump Rope
    };

    /// <summary>Kardiyo olmayan harekette boş liste.</summary>
    public static IReadOnlyList<CardioField> For(long exerciseId, ExerciseMeasurement measurement)
        => measurement != ExerciseMeasurement.Cardio ? [] : ByExercise.GetValueOrDefault(exerciseId) ?? Default;
}
