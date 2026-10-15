using Grind.Api.Common.Records;

namespace Grind.Tests.Common;

/// <summary>#647: kardiyo rekoru — süre ve mesafe ayrı çıtalar. DB'siz, saf.</summary>
public class CardioRecordTrackerTests
{
    [Fact]
    public void Ilk_kayit_hem_sure_hem_mesafe_rekorudur()
    {
        Assert.Equal((true, true), new CardioRecordTracker().Apply(1200, 3.2m));
    }

    /// <summary>Kilolu hareketlerdeki kuralın aynısı: çıtaya eşit olmak geçmek değildir.</summary>
    [Fact]
    public void Esit_sure_ya_da_esit_mesafe_rekor_degildir()
    {
        var izleyici = new CardioRecordTracker();
        izleyici.Apply(1200, 3.2m);

        Assert.Equal((false, false), izleyici.Apply(1200, 3.2m));
    }

    [Fact]
    public void Mesafesiz_kayit_mesafe_citasini_etkilemez()
    {
        var izleyici = new CardioRecordTracker();
        izleyici.Apply(600, 2m);

        Assert.Equal((true, false), izleyici.Apply(900, null));
        Assert.Equal((false, true), izleyici.Apply(300, 2.5m));
    }

    /// <summary>Daha kısa ama daha uzağa koşulan kayıt yalnızca mesafe rekorudur; tersi yalnızca süre.</summary>
    [Fact]
    public void Sure_ve_mesafe_birbirinden_bagimsiz_rekor_olur()
    {
        var izleyici = new CardioRecordTracker();
        izleyici.Apply(1800, 4m);

        Assert.Equal((false, true), izleyici.Apply(1500, 4.5m));
        Assert.Equal((true, false), izleyici.Apply(2400, 4.2m));
    }
}
