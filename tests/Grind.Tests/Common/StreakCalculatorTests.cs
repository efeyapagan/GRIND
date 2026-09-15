using Grind.Api.Common.Time;

namespace Grind.Tests.Common;

/// <summary>
/// Seri kuralı (#96): seri HAFTA sayar. Hafta = TR günleriyle Pazartesi–Pazar; bir hafta en az
/// <c>minDaysPerWeek</c> FARKLI antrenman günü varsa seriye dahildir (gün = en az bir set girilmiş TR
/// günü; bu filtre sorguda yapılır, burada girdi olarak gelir). Dinlenme günleri seriyi bozmaz. MEVCUT
/// seri, içinde bulunulan hafta henüz şartı sağlamıyorsa KIRILMAZ — hafta henüz bitmedi.
/// Hedef serisi (#97) aynı hesaptır, yalnızca <c>minDaysPerWeek</c> kullanıcının haftalık hedefidir.
/// </summary>
public class StreakCalculatorTests
{
    /// <summary>Perşembe. Bu hafta: Pazartesi 9 Mart – Pazar 15 Mart 2026.</summary>
    private static readonly DateOnly Bugun = new(2026, 3, 12);

    [Fact]
    public void Hic_antrenman_yoksa_seriler_sifirdir()
    {
        Assert.Equal((0, 0), StreakCalculator.Calculate([], Bugun));
    }

    [Fact]
    public void Ayni_haftadaki_gunler_tek_hafta_sayilir()
    {
        // Pazartesi 9 Mart ve Perşembe 12 Mart: ikisi de bu hafta.
        var gunler = new[] { new DateOnly(2026, 3, 9), Bugun };

        Assert.Equal((1, 1), StreakCalculator.Calculate(gunler, Bugun));
    }

    /// <summary>
    /// ISSUE #96'NIN MANŞETİ: aradaki boş günler (dinlenme) seriyi bozmaz. Günlük seride bu girdi
    /// 1 olurdu.
    /// </summary>
    [Fact]
    public void Dinlenme_gunleri_seriyi_bozmaz()
    {
        var gunler = new[]
        {
            Bugun,                          // bu hafta, Perşembe
            new DateOnly(2026, 3, 2),       // geçen hafta, Pazartesi
            new DateOnly(2026, 2, 27)       // iki hafta önce, Cuma
        };

        Assert.Equal((3, 3), StreakCalculator.Calculate(gunler, Bugun));
    }

    /// <summary>Bu hafta henüz antrenman yokken seri korunur: hafta bitmedi.</summary>
    [Fact]
    public void Bu_hafta_antrenman_yoksa_seri_gecen_haftadan_sayilir()
    {
        var gunler = new[] { new DateOnly(2026, 3, 6), new DateOnly(2026, 2, 25) };

        var (mevcut, _) = StreakCalculator.Calculate(gunler, Bugun);

        Assert.Equal(2, mevcut);
    }

    /// <summary>Ama geçen hafta da boşsa seri gerçekten kırılmıştır; geçmişteki seri kaybolmaz.</summary>
    [Fact]
    public void Gecen_hafta_da_bossa_mevcut_seri_sifirdir_en_uzun_korunur()
    {
        var gunler = new[] { new DateOnly(2026, 2, 25), new DateOnly(2026, 2, 18) };

        Assert.Equal((0, 2), StreakCalculator.Calculate(gunler, Bugun));
    }

    [Fact]
    public void Hafta_pazartesi_baslar()
    {
        // Pazar 8 Mart ve Pazartesi 9 Mart ARDIŞIK iki haftadır...
        Assert.Equal((2, 2), StreakCalculator.Calculate([new DateOnly(2026, 3, 8), new DateOnly(2026, 3, 9)], Bugun));

        // ...Pazartesi 2 Mart ve Pazar 8 Mart ise AYNI hafta.
        var pazar = new DateOnly(2026, 3, 8);
        Assert.Equal((1, 1), StreakCalculator.Calculate([new DateOnly(2026, 3, 2), pazar], pazar));
    }

    /// <summary>
    /// Hedef serisi (#97): hafta en az N FARKLI gün ister. Aynı gün iki oturum (sabah/akşam) tek gün
    /// sayılır, yoksa "haftada 2 gün" hedefi tek günde tutturulmuş olurdu.
    /// </summary>
    [Fact]
    public void Hedef_haftada_en_az_n_farkli_gun_ister()
    {
        var gunler = new[]
        {
            new DateOnly(2026, 3, 9), Bugun,                        // bu hafta: 2 farklı gün
            new DateOnly(2026, 3, 4), new DateOnly(2026, 3, 4)      // geçen hafta: aynı gün iki kez
        };

        Assert.Equal((1, 1), StreakCalculator.Calculate(gunler, Bugun, minDaysPerWeek: 2));
    }

    /// <summary>Bu haftanın hedefi henüz tutmadıysa hedef serisi kırılmaz, geçen haftadan sayılır.</summary>
    [Fact]
    public void Hedef_bu_hafta_henuz_tutmadiysa_seri_kirilmaz()
    {
        var gunler = new[]
        {
            new DateOnly(2026, 3, 9),                               // bu hafta: 1 gün (hedef 2)
            new DateOnly(2026, 3, 2), new DateOnly(2026, 3, 5)      // geçen hafta: 2 gün
        };

        Assert.Equal((1, 1), StreakCalculator.Calculate(gunler, Bugun, minDaysPerWeek: 2));
    }
}
