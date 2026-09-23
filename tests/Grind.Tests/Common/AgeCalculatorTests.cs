using Grind.Api.Common.Time;

namespace Grind.Tests.Common;

/// <summary>#280: yaş saklanmaz, doğum tarihinden sorgu anında hesaplanır.</summary>
public class AgeCalculatorTests
{
    /// <summary>
    /// Doğum günü sınırı: o gün yaş dolar, bir gün önce dolmaz. 29 Şubat doğumlu, artık olmayan yılda
    /// 28 Şubat'ta yaşını doldurur (<see cref="DateOnly.AddYears"/> davranışı).
    /// </summary>
    [Theory]
    [InlineData("2000-09-24", "2026-09-24", 26)]
    [InlineData("2000-09-24", "2026-09-23", 25)]
    [InlineData("2004-02-29", "2027-02-28", 23)]
    [InlineData("2004-02-29", "2027-02-27", 22)]
    public void Yas_dogum_gunu_sinirina_gore_hesaplanir(string dogum, string bugun, int beklenen)
    {
        Assert.Equal(beklenen, AgeCalculator.AgeOn(DateOnly.Parse(dogum), DateOnly.Parse(bugun)));
    }
}
