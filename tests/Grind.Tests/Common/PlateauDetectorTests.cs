using Grind.Api.Common.Records;

namespace Grind.Tests.Common;

/// <summary>
/// Plato kuralı (#72): bir hareketin tüm zamanların en iyi TAHMİNİ 1RM'i son
/// <see cref="PlateauDetector.Weeks"/> haftada (bugün dahil son 42 TR günü) geçilmediyse hareket
/// platodadır. Rekor rozeti (<c>RecordType</c>) ölçüt değildir: tekrar rekoru ağırlık başına sayıldığı
/// için hafif bir ağırlıktaki önemsiz rekor platoyu kırılmış gösterirdi. Son 6 haftada 1RM'i
/// hesaplanabilir hiç seti olmayan hareket platoda değil, bırakılmıştır — değerlendirilmez.
/// </summary>
public class PlateauDetectorTests
{
    /// <summary>Perşembe. Son 6 hafta: 30 Ocak – 12 Mart 2026 (iki uç dahil).</summary>
    private static readonly DateOnly Bugun = new(2026, 3, 12);

    private static readonly DateOnly SekizHaftaOnce = new(2026, 1, 15);

    private static (DateOnly Day, decimal Weight, int Reps) Set(DateOnly gun, decimal agirlik, int tekrar)
        => (gun, agirlik, tekrar);

    [Fact]
    public void Son_alti_haftada_1RM_gecilmediyse_platodur()
    {
        var setler = new[]
        {
            Set(SekizHaftaOnce, 100m, 5),           // 1RM 112,50 — en iyi
            Set(new DateOnly(2026, 3, 5), 100m, 4)  // 1RM 109,09 — son 6 haftada, geçemedi
        };

        var plato = PlateauDetector.Detect(setler, Bugun);

        Assert.Equal(new Plateau(112.50m, SekizHaftaOnce, 8), plato);
    }

    [Fact]
    public void Son_alti_haftada_1RM_gecildiyse_plato_degildir()
    {
        var setler = new[]
        {
            Set(SekizHaftaOnce, 100m, 5),           // 1RM 112,50
            Set(new DateOnly(2026, 3, 5), 100m, 6)  // 1RM 116,13
        };

        Assert.Null(PlateauDetector.Detect(setler, Bugun));
    }

    /// <summary>
    /// ISSUE #72'NİN MANŞETİ: 40 kg × 12, 40 kg × 11'in üstünde bir TEKRAR rekorudur ama tahmini 1RM'i
    /// (57,60) 100 kg × 5'in (112,50) çok altında kalır — ilerleme sayılmaz.
    /// </summary>
    [Fact]
    public void Hafif_agirlikta_tekrar_rekoru_platoyu_kirmaz()
    {
        var setler = new[]
        {
            Set(SekizHaftaOnce, 100m, 5),
            Set(SekizHaftaOnce, 40m, 11),
            Set(new DateOnly(2026, 3, 5), 40m, 12)
        };

        Assert.Equal(new Plateau(112.50m, SekizHaftaOnce, 8), PlateauDetector.Detect(setler, Bugun));
    }

    /// <summary>
    /// En iyiye yeniden ulaşmak onu GEÇMEK değildir; platonun başladığı gün en iyiye ilk ulaşılan gündür
    /// (sonraki eşitlemeler süreyi sıfırlamaz).
    /// </summary>
    [Fact]
    public void Ayni_1RMe_yeniden_ulasmak_platoyu_kirmaz_ve_sure_ilk_ulasilan_gunden_sayilir()
    {
        var setler = new[]
        {
            Set(SekizHaftaOnce, 100m, 5),
            Set(new DateOnly(2026, 1, 22), 100m, 5),
            Set(new DateOnly(2026, 3, 5), 100m, 5)
        };

        Assert.Equal(new Plateau(112.50m, SekizHaftaOnce, 8), PlateauDetector.Detect(setler, Bugun));
    }

    /// <summary>Eşik: en iyi tam 42 gün önceyse platodur, 41 gün önceyse henüz son 6 haftanın içindedir.</summary>
    [Fact]
    public void Esik_tam_alti_haftadir()
    {
        var sonAltiHaftadakiSet = Set(new DateOnly(2026, 3, 5), 90m, 5);
        var kirkIkiGunOnce = new DateOnly(2026, 1, 29);
        var kirkBirGunOnce = new DateOnly(2026, 1, 30);

        Assert.Equal(
            new Plateau(112.50m, kirkIkiGunOnce, 6),
            PlateauDetector.Detect([Set(kirkIkiGunOnce, 100m, 5), sonAltiHaftadakiSet], Bugun));
        Assert.Null(PlateauDetector.Detect([Set(kirkBirGunOnce, 100m, 5), sonAltiHaftadakiSet], Bugun));
    }

    /// <summary>
    /// Bırakılmış hareket platoda değildir. 60 kg × 15'in 1RM'i hesaplanmaz (tekrar tavanı 12), yani son
    /// 6 haftada değerlendirilecek set yoktur — hiç set olmaması da aynı yoldan geçer.
    /// </summary>
    [Fact]
    public void Son_alti_haftada_1RM_hesaplanabilir_seti_olmayan_hareket_plato_sayilmaz()
    {
        var setler = new[]
        {
            Set(SekizHaftaOnce, 100m, 5),
            Set(new DateOnly(2026, 3, 5), 60m, 15)
        };

        Assert.Null(PlateauDetector.Detect(setler, Bugun));
    }
}
