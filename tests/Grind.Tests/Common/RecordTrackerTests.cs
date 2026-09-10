using Grind.Api.Common.Records;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Common;

/// <summary>
/// Projenin kalbi. DB'siz, saf. Kurallar (spec Soru 1/A):
/// ağırlık rekoru = önceki maksimumu GEÇMEK (ya da hiç önceki olmaması);
/// tekrar rekoru = AYNI ağırlıkta önceki bir kaydı GEÇMEK — o ağırlıkta hiç
/// önceki yoksa rekor DEĞİLDİR; eşitlik hiçbir zaman rekor değildir.
/// </summary>
public class RecordTrackerTests
{
    [Fact]
    public void Ilk_set_agirlik_rekorudur()
    {
        var izleyici = new RecordTracker();

        Assert.Equal(RecordType.Weight, izleyici.Apply(100m, 8));
    }

    [Fact]
    public void Daha_agir_set_agirlik_rekorudur()
    {
        var izleyici = new RecordTracker();
        izleyici.Apply(100m, 8);

        Assert.Equal(RecordType.Weight, izleyici.Apply(105m, 3));
    }

    [Fact]
    public void Ayni_agirlikta_daha_cok_tekrar_tekrar_rekorudur()
    {
        var izleyici = new RecordTracker();
        izleyici.Apply(100m, 8);

        Assert.Equal(RecordType.Reps, izleyici.Apply(100m, 10));
    }

    /// <summary>Eşitlik rekor değildir — CLAUDE.md 8.5'in açık şartı.</summary>
    [Fact]
    public void Ayni_agirlik_ayni_tekrar_rekor_degildir()
    {
        var izleyici = new RecordTracker();
        izleyici.Apply(100m, 8);

        Assert.Equal(RecordType.None, izleyici.Apply(100m, 8));
    }

    [Fact]
    public void Ayni_agirlikta_daha_az_tekrar_rekor_degildir()
    {
        var izleyici = new RecordTracker();
        izleyici.Apply(100m, 8);

        Assert.Equal(RecordType.None, izleyici.Apply(100m, 6));
    }

    /// <summary>
    /// Soru 1/A'nın MANŞETİ: 100 kg rekorundan sonra atılan 60 kg × 15'lik indirme seti
    /// rekor DEĞİLDİR — 60 kg'da karşılaştırılacak bir geçmiş yok. B seçeneği seçilmiş
    /// olsaydı bu Reps dönerdi; testin kırmızıya dönmesi kural değişikliğini yakalar.
    /// </summary>
    [Fact]
    public void Daha_hafif_agirlikta_ilk_set_rekor_degildir()
    {
        var izleyici = new RecordTracker();
        izleyici.Apply(100m, 8);

        Assert.Equal(RecordType.None, izleyici.Apply(60m, 15));
    }

    /// <summary>Ama o kovada bir kıyas noktası oluştuktan sonra geçmek rekordur.</summary>
    [Fact]
    public void Daha_hafif_agirlikta_ikinci_set_daha_cok_tekrarla_tekrar_rekorudur()
    {
        var izleyici = new RecordTracker();
        izleyici.Apply(100m, 8);
        izleyici.Apply(60m, 15);

        Assert.Equal(RecordType.Reps, izleyici.Apply(60m, 18));
    }

    /// <summary>
    /// Weight = 0 geçerli (barfiks/dips). "Maksimum yok" durumu `default(decimal)` ile
    /// değil nullable ile temsil edilmeli — aksi halde ilk 0 kg'lık set "0 > 0 değil"
    /// diyerek rekor sayılmaz ve vücut ağırlığı hareketleri hiç rekor üretmez.
    /// </summary>
    [Fact]
    public void Sifir_kilo_gecerli_bir_agirlik_kovasidir()
    {
        var izleyici = new RecordTracker();

        Assert.Equal(RecordType.Weight, izleyici.Apply(0m, 20));
        Assert.Equal(RecordType.Reps, izleyici.Apply(0m, 25));
        Assert.Equal(RecordType.None, izleyici.Apply(0m, 25));
    }

    /// <summary>
    /// EF (6,2) ölçeğiyle döndüğü için DB'den gelen 100.00m ile testte yazılan 100.0m
    /// AYNI kovaya düşmeli. decimal.Equals/GetHashCode bunu garanti ediyor (ölçüldü);
    /// bu test o garantiyi koda bağlar — bir gün ağırlık double'a çevrilirse kırmızıya döner.
    /// </summary>
    [Fact]
    public void Ondalik_olcek_farki_ayni_agirlik_kovasina_duser()
    {
        var izleyici = new RecordTracker();
        izleyici.Apply(100.0m, 8);

        Assert.Equal(RecordType.Reps, izleyici.Apply(100.00m, 9));
    }

    /// <summary>
    /// Gerçek bir antrenman serisi baştan sona. Tek tek kurallar doğru olup birleşimleri
    /// yanlış olabilir; bu test sıranın tamamını sabitler.
    /// </summary>
    [Fact]
    public void Gercek_bir_seri_bastan_sona_dogru_siniflanir()
    {
        var izleyici = new RecordTracker();

        var sonuclar = new[]
        {
            izleyici.Apply(60m, 12),   // ilk set        -> Weight
            izleyici.Apply(80m, 10),   // daha agir      -> Weight
            izleyici.Apply(80m, 10),   // esitlik        -> None
            izleyici.Apply(80m, 11),   // ayni agirlik + -> Reps
            izleyici.Apply(60m, 20),   // 60 kovasi var  -> Reps
            izleyici.Apply(100m, 1),   // yeni maksimum  -> Weight
            izleyici.Apply(90m, 5)     // 90 kovasi yeni -> None
        };

        Assert.Equal(
            new[]
            {
                RecordType.Weight, RecordType.Weight, RecordType.None, RecordType.Reps,
                RecordType.Reps, RecordType.Weight, RecordType.None
            },
            sonuclar);
    }
}
