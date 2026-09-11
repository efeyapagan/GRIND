using Grind.Api.Services.Ai;

namespace Grind.Tests.Services.Ai;

/// <summary>LLM çağrısının tahmini maliyeti (Faz 12 spec Karar 10). Saf fonksiyon.</summary>
public class AiCostCalculatorTests
{
    /// <summary>Varsayılan model fiyatları: 1M girdi 5 USD + 1M çıktı 25 USD.</summary>
    [Fact]
    public void Milyon_token_fiyatlari_toplanir()
    {
        Assert.Equal(30m, AiCostCalculator.Estimate(1_000_000, 1_000_000, 5m, 25m));
    }

    /// <summary>
    /// AYIRT EDİCİ: 0,0000005 USD, sütun ölçeğine (6 ondalık) yuvarlanırken AwayFromZero ile 0,000001
    /// olur; .NET'in varsayılanı (banker's rounding) 0 verirdi.
    /// </summary>
    [Fact]
    public void Sonuc_alti_ondaliga_uzaga_yuvarlanir()
    {
        Assert.Equal(0.000001m, AiCostCalculator.Estimate(1, 0, 0.5m, 0m));
        Assert.Equal(0.020345m, AiCostCalculator.Estimate(1234, 567, 5m, 25m));
    }

    [Fact]
    public void Fiyat_bilinmiyorsa_maliyet_null_kalir()
    {
        Assert.Null(AiCostCalculator.Estimate(1000, 1000, null, 25m));
        Assert.Null(AiCostCalculator.Estimate(1000, 1000, 5m, null));
    }
}
