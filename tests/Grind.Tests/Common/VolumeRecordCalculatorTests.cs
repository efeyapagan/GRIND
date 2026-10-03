using Grind.Api.Common.Records;
using Grind.Api.Models.Projections;

namespace Grind.Tests.Common;

public class VolumeRecordCalculatorTests
{
    private static readonly DateTime Bir = new(2026, 3, 1, 10, 0, 0, DateTimeKind.Utc);

    private const long PushDay = 1;
    private const long LegDay = 2;

    private static TemplateSessionVolume Oturum(long id, long sablon, int gunSonra, decimal hacim) =>
        new(id, sablon, Bir.AddDays(gunSonra), hacim);

    /// <summary>Şablonun ilk antrenmanı karşılaştıracak bir öncekine sahip değildir: rekor sayılmaz.</summary>
    [Fact]
    public void Sablonun_ilk_antrenmani_rekor_degildir()
    {
        var rekorlar = VolumeRecordCalculator.RecordSessionIds([Oturum(1, PushDay, 0, 4000m)]);

        Assert.Empty(rekorlar);
    }

    /// <summary>Önceki en yüksek hacmi kesin olarak geçen antrenman rekordur.</summary>
    [Fact]
    public void Onceki_en_yuksek_hacmi_gecen_antrenman_rekordur()
    {
        var rekorlar = VolumeRecordCalculator.RecordSessionIds(
        [
            Oturum(1, PushDay, 0, 4000m),
            Oturum(2, PushDay, 7, 4200m)
        ]);

        Assert.Equal([2L], rekorlar.Order());
    }

    /// <summary>Eşit ya da düşük hacim rekor değildir: "rekor" yalnızca kesin artışta yanar.</summary>
    [Fact]
    public void Esit_veya_dusuk_hacim_rekor_degildir()
    {
        var rekorlar = VolumeRecordCalculator.RecordSessionIds(
        [
            Oturum(1, PushDay, 0, 4000m),
            Oturum(2, PushDay, 7, 4000m),
            Oturum(3, PushDay, 14, 3500m)
        ]);

        Assert.Empty(rekorlar);
    }

    /// <summary>Rekor her zaman kendinden önceki en yüksek hacme göredir, tüm geçmişe değil.</summary>
    [Fact]
    public void Rekor_yalnizca_onceki_antrenmanlara_gore_hesaplanir()
    {
        var rekorlar = VolumeRecordCalculator.RecordSessionIds(
        [
            Oturum(1, PushDay, 0, 5000m),
            Oturum(2, PushDay, 7, 4500m),
            Oturum(3, PushDay, 14, 4800m)
        ]);

        Assert.Empty(rekorlar);
    }

    /// <summary>Farklı şablonların hacimleri birbirini karşılaştırmaz.</summary>
    [Fact]
    public void Farkli_sablonlar_birbirini_etkilemez()
    {
        var rekorlar = VolumeRecordCalculator.RecordSessionIds(
        [
            Oturum(1, PushDay, 0, 6000m),
            Oturum(2, LegDay, 1, 3000m)
        ]);

        Assert.Empty(rekorlar);
    }

    /// <summary>Girdi karışık sırada gelse de karşılaştırma başlangıç zamanına göre yapılır.</summary>
    [Fact]
    public void Siralama_baslangic_zamanina_gore_yapilir()
    {
        var rekorlar = VolumeRecordCalculator.RecordSessionIds(
        [
            Oturum(2, PushDay, 7, 4200m),
            Oturum(1, PushDay, 0, 4000m)
        ]);

        Assert.Equal([2L], rekorlar.Order());
    }
}
