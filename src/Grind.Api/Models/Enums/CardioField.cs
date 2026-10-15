namespace Grind.Api.Models.Enums;

/// <summary>
/// #647: bir kardiyo kaydında süre dışında sorulabilecek kutular. Hangi makinenin hangilerini sorduğu
/// <see cref="Common.Validation.CardioFieldCatalog"/>'ta; her biri <c>CardioEntry</c>'de kendi kolonudur.
/// Ayarlar başlamadan (<see cref="Speed"/>, <see cref="Incline"/>, <see cref="Level"/>, <see cref="Damper"/>),
/// sonuçlar durdurunca (<see cref="Distance"/>, <see cref="Cadence"/>, <see cref="Floors"/>, <see cref="Steps"/>,
/// <see cref="Jumps"/>, <see cref="Watts"/>) girilir.
/// </summary>
public enum CardioField
{
    Speed,
    Incline,
    Level,
    Damper,
    Distance,
    Cadence,
    Floors,
    Steps,
    Jumps,
    Watts
}
