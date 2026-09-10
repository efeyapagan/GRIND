using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Validation;

namespace Grind.Tests.Common;

/// <summary>
/// Ağırlık sütunları numeric(6,2). Fazla ondalık PostgreSQL'de SESSİZCE yuvarlanır; kural bu
/// yüzden reddeder. Set ağırlığı (Faz 8) ve tartı (Faz 10) aynı kuralı paylaşır.
/// </summary>
public class WeightScaleTests
{
    [Fact]
    public void Iki_ondalik_kabul_edilir()
    {
        Assert.Null(Record.Exception(() => WeightScale.EnsureAtMostTwoDecimals(82.45m)));
    }

    [Fact]
    public void Tam_sayi_ve_sifir_kabul_edilir()
    {
        // 0 set ağırlığında geçerlidir (barfiks/dips); ölçek kuralı onu reddetmemeli.
        Assert.Null(Record.Exception(() => WeightScale.EnsureAtMostTwoDecimals(0m)));
        Assert.Null(Record.Exception(() => WeightScale.EnsureAtMostTwoDecimals(100m)));
    }

    [Fact]
    public void Uc_ondalik_reddedilir()
    {
        Assert.Throws<ValidationException>(() => WeightScale.EnsureAtMostTwoDecimals(82.455m));
    }

    /// <summary>
    /// Kural DEĞERE bakar, yazım ölçeğine değil: 100.100m ile 100.10m aynı değerdir ve saklanınca
    /// hiçbir şey kaybolmaz. Ölçeğe bakan bir uygulama (ör. basamak sayma) bunu yanlışlıkla
    /// reddederdi.
    /// </summary>
    [Fact]
    public void Sondaki_sifir_fazla_ondalik_sayilmaz()
    {
        Assert.Null(Record.Exception(() => WeightScale.EnsureAtMostTwoDecimals(100.100m)));
    }
}
