using Grind.Api.Common.Time;

namespace Grind.Tests.Services;

/// <summary>
/// #419: "arkadaşın haftalık hedefini tamamladı" bildiriminin TETİKLEYİCİ ANI. Kural saf bir
/// fonksiyonda (StreakCalculator / BestRecordPicker deseni): testleri veritabanı istemez.
/// </summary>
public class WeeklyGoalCompletionTests
{
    private static readonly DateOnly Pazartesi = new(2026, 9, 21);

    private static (long Id, DateOnly Gun) Oturum(long id, int gunEklenecek)
        => (id, Pazartesi.AddDays(gunEklenecek));

    [Fact]
    public void Hedefe_ulasilan_oturum_dondurulur()
    {
        var oturumlar = new[] { Oturum(1, 0), Oturum(2, 1), Oturum(3, 2), Oturum(4, 3) };

        Assert.Equal(3, WeeklyGoalCompletion.CompletingSessionId(oturumlar, target: 3));
    }

    /// <summary>Aynı gün ikinci antrenman hedefi İLERLETMEZ (gün sayılır, oturum değil).</summary>
    [Fact]
    public void Ayni_gun_ikinci_oturum_hedefi_ilerletmez()
    {
        var oturumlar = new[] { Oturum(1, 0), Oturum(2, 0), Oturum(3, 1), Oturum(4, 2) };

        Assert.Equal(4, WeeklyGoalCompletion.CompletingSessionId(oturumlar, target: 3));
    }

    [Fact]
    public void Hedefe_ulasilmadiysa_null_doner()
    {
        var oturumlar = new[] { Oturum(1, 0), Oturum(2, 0), Oturum(3, 1) };

        Assert.Null(WeeklyGoalCompletion.CompletingSessionId(oturumlar, target: 3));
    }

    [Fact]
    public void Hedef_bir_ise_ilk_oturum_tamamlar()
    {
        var oturumlar = new[] { Oturum(7, 2), Oturum(8, 3) };

        Assert.Equal(7, WeeklyGoalCompletion.CompletingSessionId(oturumlar, target: 1));
    }

    /// <summary>Girdi sırasız gelebilir: tamamlayan oturum GÜN sırasına göre belirlenir.</summary>
    [Fact]
    public void Girdi_sirasiz_olsa_da_tamamlayan_oturum_ayni()
    {
        var oturumlar = new[] { Oturum(3, 2), Oturum(1, 0), Oturum(2, 1) };

        Assert.Equal(3, WeeklyGoalCompletion.CompletingSessionId(oturumlar, target: 3));
    }

    [Fact]
    public void Bos_liste_null_doner()
    {
        Assert.Null(WeeklyGoalCompletion.CompletingSessionId([], target: 1));
    }
}
