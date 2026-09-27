namespace Grind.Api.Models.Enums;

/// <summary>
/// Bir hareketin setlerinin neyle ölçüldüğü (#346). Set girişinin hangi alanları istediğini ve rekor
/// kuralını belirler; tip sete değil harekete aittir.
/// <list type="bullet">
/// <item><see cref="WeightReps"/>: kilo + tekrar (+ isteğe bağlı RIR) — varsayılan, #346 öncesi her hareket.</item>
/// <item><see cref="Reps"/>: yalnızca tekrar; kilo "ek ağırlık"tır, boşsa 0 (crunch, leg raise). RIR yok.</item>
/// <item><see cref="Duration"/>: yalnızca süre, saniye (plank, dead hang). Kilo, tekrar, RIR yok.</item>
/// </list>
/// Adıyla saklanır (<c>Category</c> ile aynı desen) — var olan bir adı değiştirmek eski satırları okunamaz yapar.
/// Değerler bilerek 1'den başlar: EF, varsayılan değeri olan bir kolonda CLR varsayılanına (0) eşit seed
/// değerini "verilmedi" sayar ve migration'da boş bir <c>UPDATE ... SET WHERE</c> üretirdi.
/// </summary>
public enum ExerciseMeasurement
{
    WeightReps = 1,
    Reps = 2,
    Duration = 3
}
