using Grind.Api.Common.Exceptions;

namespace Grind.Api.Common.Validation;

/// <summary>
/// Ağırlık sütunları (<c>SetEntry.Weight</c>, <c>BodyWeightLog.Weight</c>) numeric(6,2): daha fazla
/// ondalık PostgreSQL tarafından SESSİZCE yuvarlanır ve kullanıcının girdiği değer ile saklanan değer
/// ayrışır (set ağırlığında ayrıca rekor kararı yuvarlanmamış değer üzerinden verilir ve ağırlık
/// kovası kayar). Bu yüzden yuvarlamak yerine reddediyoruz. Kural tek yerde yaşıyor ki iki servis
/// onu iki kez yazmasın.
/// </summary>
public static class WeightScale
{
    public static void EnsureAtMostTwoDecimals(decimal weight)
    {
        if (decimal.Round(weight, 2) != weight)
        {
            throw new ValidationException("Ağırlık en fazla iki ondalık basamak taşıyabilir.");
        }
    }
}
