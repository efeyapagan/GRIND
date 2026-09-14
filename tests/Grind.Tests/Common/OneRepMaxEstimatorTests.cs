using Grind.Api.Common.Records;

namespace Grind.Tests.Common;

public class OneRepMaxEstimatorTests
{
    /// <summary>
    /// Brzycki: ağırlık × 36 / (37 − tekrar). 10.12 × 5 = 11.385 tam orta nokta: banker's rounding
    /// 11.38 verirdi, yarım yukarı 11.39 (kilo gösteriminde projedeki yuvarlama kuralı).
    /// </summary>
    [Theory]
    [InlineData(100.0, 5, 112.5)]
    [InlineData(110.0, 3, 116.47)]
    [InlineData(80.0, 1, 80.0)]
    [InlineData(60.0, 12, 86.4)]
    [InlineData(10.12, 5, 11.39)]
    public void Brzycki_ile_tahmin_eder_ve_yarim_yukari_yuvarlar(double weight, int reps, double expected)
    {
        Assert.Equal<decimal?>((decimal)expected, OneRepMaxEstimator.Estimate((decimal)weight, reps));
    }

    /// <summary>12'nin üstünde formül güvenilmez; 0 kg (barfiks/dips) ve 0 tekrar anlamsız.</summary>
    [Theory]
    [InlineData(100.0, 13)]
    [InlineData(0.0, 5)]
    [InlineData(100.0, 0)]
    public void Tahmin_edilemeyen_setlerde_null_doner(double weight, int reps)
    {
        Assert.Null(OneRepMaxEstimator.Estimate((decimal)weight, reps));
    }
}
