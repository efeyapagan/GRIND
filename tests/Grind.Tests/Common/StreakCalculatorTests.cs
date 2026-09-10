using Grind.Api.Common.Time;

namespace Grind.Tests.Common;

/// <summary>
/// Seri kuralı (spec Karar 3): gün = en az bir set girilmiş TR günü (bu filtre sorguda yapılır,
/// burada girdi olarak gelir). MEVCUT seri bugün antrenman yoksa KIRILMAZ — gün henüz bitmedi.
/// </summary>
public class StreakCalculatorTests
{
    private static readonly DateOnly Bugun = new(2026, 3, 12);

    [Fact]
    public void Hic_antrenman_yoksa_seriler_sifirdir()
    {
        Assert.Equal((0, 0), StreakCalculator.Calculate([], Bugun));
    }

    [Fact]
    public void Bugun_yapilan_antrenman_seriyi_bire_cikarir()
    {
        Assert.Equal((1, 1), StreakCalculator.Calculate([Bugun], Bugun));
    }

    [Fact]
    public void Ardisik_gunler_toplanir()
    {
        var gunler = new[] { Bugun, Bugun.AddDays(-1), Bugun.AddDays(-2) };

        Assert.Equal((3, 3), StreakCalculator.Calculate(gunler, Bugun));
    }

    /// <summary>
    /// MANŞET KURAL: bugün henüz antrenman yapılmamışken seri korunur. Bu test kırmızıya
    /// dönerse kullanıcı sabah uygulamayı açtığında serisini 0 görür.
    /// </summary>
    [Fact]
    public void Bugun_antrenman_yoksa_seri_dunden_geriye_sayilir()
    {
        var gunler = new[] { Bugun.AddDays(-1), Bugun.AddDays(-2), Bugun.AddDays(-3) };

        var (mevcut, _) = StreakCalculator.Calculate(gunler, Bugun);

        Assert.Equal(3, mevcut);
    }

    /// <summary>Ama dün de yoksa seri gerçekten kırılmıştır.</summary>
    [Fact]
    public void Dun_de_yoksa_mevcut_seri_sifirdir()
    {
        var gunler = new[] { Bugun.AddDays(-2), Bugun.AddDays(-3) };

        var (mevcut, enUzun) = StreakCalculator.Calculate(gunler, Bugun);

        Assert.Equal(0, mevcut);
        Assert.Equal(2, enUzun);   // geçmişteki seri kaybolmaz
    }

    [Fact]
    public void Bosluk_seriyi_kirar()
    {
        // Bugün, dün, [boşluk], 4 ve 5 gün önce.
        var gunler = new[] { Bugun, Bugun.AddDays(-1), Bugun.AddDays(-4), Bugun.AddDays(-5) };

        Assert.Equal((2, 2), StreakCalculator.Calculate(gunler, Bugun));
    }

    /// <summary>En uzun seri geçmişte kalmış olabilir; mevcut seriyle karıştırılmamalı.</summary>
    [Fact]
    public void En_uzun_seri_gecmiste_kalabilir()
    {
        var gunler = new[]
        {
            Bugun, Bugun.AddDays(-1),
            Bugun.AddDays(-10), Bugun.AddDays(-11), Bugun.AddDays(-12), Bugun.AddDays(-13)
        };

        Assert.Equal((2, 4), StreakCalculator.Calculate(gunler, Bugun));
    }

    /// <summary>
    /// Aynı gün birden fazla oturum olabilir (CLAUDE.md: sabah/akşam). Sorgu aynı günü iki kez
    /// verirse seri iki gün sayılmamalı.
    /// </summary>
    [Fact]
    public void Ayni_gun_tekrar_gelirse_bir_kez_sayilir()
    {
        var gunler = new[] { Bugun, Bugun, Bugun.AddDays(-1) };

        Assert.Equal((2, 2), StreakCalculator.Calculate(gunler, Bugun));
    }

    /// <summary>Girdi sırasız gelebilir (sorgu sıralama garantisi vermiyor).</summary>
    [Fact]
    public void Sirasiz_girdi_ayni_sonucu_verir()
    {
        var gunler = new[] { Bugun.AddDays(-2), Bugun, Bugun.AddDays(-1) };

        Assert.Equal((3, 3), StreakCalculator.Calculate(gunler, Bugun));
    }
}
