using Grind.Api.Common.Time;

namespace Grind.Tests.Common;

/// <summary>Saf hesaplayıcı, veritabanı yok (issue #73).</summary>
public class DurationCalculatorTests
{
    [Fact]
    public void Acik_oturumda_sure_null_doner()
    {
        var sure = DurationCalculator.SecondsBetween(
            new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc), null);

        Assert.Null(sure);
    }

    [Fact]
    public void Kapanmis_oturumda_sure_saniye_cinsinden_hesaplanir()
    {
        var baslangic = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        var sure = DurationCalculator.SecondsBetween(baslangic, baslangic.AddMinutes(90));

        Assert.Equal(90 * 60, sure);
    }

    [Fact]
    public void Bos_listede_ozet_sifirdir()
    {
        var ozet = DurationCalculator.Summarize([]);

        Assert.Null(ozet.MedianSeconds);
        Assert.Equal(0, ozet.TotalSeconds);
        Assert.Equal(0, ozet.SessionCount);
        Assert.Equal(0, ozet.LikelyForgottenCount);
    }

    [Fact]
    public void Tek_degerin_medyani_kendisidir()
    {
        var ozet = DurationCalculator.Summarize([1800]);

        Assert.Equal(1800, ozet.MedianSeconds);
        Assert.Equal(1800, ozet.TotalSeconds);
        Assert.Equal(1, ozet.SessionCount);
    }

    [Fact]
    public void Tek_sayida_deger_ortanca_elemani_verir()
    {
        var ozet = DurationCalculator.Summarize([1000, 3000, 2000]);

        Assert.Equal(2000, ozet.MedianSeconds);
        Assert.Equal(6000, ozet.TotalSeconds);
    }

    [Fact]
    public void Cift_sayida_deger_ortadaki_ikisinin_ortalamasidir()
    {
        var ozet = DurationCalculator.Summarize([1000, 2000, 3000, 4000]);

        Assert.Equal(2500, ozet.MedianSeconds);
    }

    /// <summary>
    /// LOAD-BEARING (issue #73 kullanıcı kararı): kapatmayı unutulan tek bir aşırı uzun oturum
    /// MEDYANI neredeyse hiç etkilemez -- ortalama olsaydı ciddi şekilde şişerdi.
    /// </summary>
    [Fact]
    public void Asiri_uzun_tek_deger_medyani_neredeyse_etkilemez()
    {
        // 30, 35, 40 dakikalık üç normal antrenman + 10 saatlik "unutulmuş" bir oturum.
        long[] normal = [1800, 2100, 2400];
        var unutulmus = (long)TimeSpan.FromHours(10).TotalSeconds;

        var ozet = DurationCalculator.Summarize([.. normal, unutulmus]);

        // 4 eleman: medyan ortadaki ikisinin (2100, 2400) ortalaması -- 10 saatlik değer dışarıda.
        Assert.Equal(2250, ozet.MedianSeconds);
        Assert.Equal(1, ozet.LikelyForgottenCount);
        // Toplam GERÇEK toplamdır -- aykırı değer burada ÇIKARILMAZ.
        Assert.Equal(normal.Sum() + unutulmus, ozet.TotalSeconds);
    }

    [Fact]
    public void Esik_degerin_tam_ustu_muhtemelen_unutulmus_sayilir()
    {
        var esikUstu = (long)DurationCalculator.LikelyForgottenThreshold.TotalSeconds + 1;

        var ozet = DurationCalculator.Summarize([esikUstu]);

        Assert.Equal(1, ozet.LikelyForgottenCount);
    }

    /// <summary>Tam sınırda (4 saat) "aşan" değil -- unutulmuş sayılmaz.</summary>
    [Fact]
    public void Esik_degerin_tam_kendisi_unutulmus_sayilmaz()
    {
        var tamEsik = (long)DurationCalculator.LikelyForgottenThreshold.TotalSeconds;

        var ozet = DurationCalculator.Summarize([tamEsik]);

        Assert.Equal(0, ozet.LikelyForgottenCount);
    }
}
