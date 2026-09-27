using Grind.Api.Common.Records;

namespace Grind.Tests.Common;

/// <summary>
/// #444: "hangi setler ısınmadır" kuralı (kullanıcı tanımı) — bir oturumdaki BİR hareketin setleri,
/// yapıldıkları sırayla. Saf: veritabanı, saat, kültür yok.
///
/// Kural bir SEZGİDİR, veri değil: bu yüzden çıktısı seti silmek için değil işaretlemek için
/// kullanılır (bkz. ExportTextFormatter).
/// </summary>
public class WarmupDetectorTests
{
    /// <summary>Kullanıcının kuralı: "workout bir veya iki seti az kilo yapıldıysa ısınmadır".</summary>
    [Fact]
    public void Bastaki_daha_hafif_set_isinmadir()
    {
        Assert.Equal(1, WarmupDetector.WarmupCount([60m, 80m, 80m]));
    }

    /// <summary>
    /// Kullanıcının kuralı: "eğer kilo birden artmıyorsa o set zaten ısınma değildir". Aynı ağırlıkta
    /// giden bir hareketin ilk seti çalışma setidir.
    /// </summary>
    [Fact]
    public void Duz_giden_agirlikta_isinma_yoktur()
    {
        Assert.Equal(0, WarmupDetector.WarmupCount([80m, 80m, 80m]));
    }

    /// <summary>Kullanıcının kuralı "bir veya iki set" diyor: üçüncü artış artık piramit, ısınma değil.</summary>
    [Fact]
    public void En_fazla_iki_set_isinma_sayilir()
    {
        Assert.Equal(2, WarmupDetector.WarmupCount([40m, 60m, 80m, 100m]));
    }

    /// <summary>Artış durduğu yerde ısınma da biter — sonraki artış ısınmaya dönmez.</summary>
    [Fact]
    public void Ilk_artmayan_sette_durur()
    {
        Assert.Equal(1, WarmupDetector.WarmupCount([40m, 60m, 60m, 100m]));
    }

    /// <summary>Drop set: azalan ağırlık ısınma değildir.</summary>
    [Fact]
    public void Azalan_agirlik_isinma_degildir()
    {
        Assert.Equal(0, WarmupDetector.WarmupCount([100m, 80m, 60m]));
    }

    /// <summary>
    /// En az bir çalışma seti HER ZAMAN kalır: tek setlik bir hareketin o tek seti ısınma sayılamaz,
    /// yoksa hareket bağlamdan tamamen silinmiş gibi olurdu.
    /// </summary>
    [Fact]
    public void Tek_set_isinma_sayilmaz()
    {
        Assert.Equal(0, WarmupDetector.WarmupCount([60m]));
    }

    /// <summary>İki setin ikisi de ısınma olamaz: ikincisi çalışma setidir.</summary>
    [Fact]
    public void Butun_setler_isinma_sayilmaz()
    {
        Assert.Equal(1, WarmupDetector.WarmupCount([60m, 80m]));
    }

    /// <summary>Vücut ağırlığı (0 kg) sonrası yüklü set: 0 gerçek bir ağırlıktır, kural aynı işler.</summary>
    [Fact]
    public void Sifir_kg_baslangic_isinma_olabilir()
    {
        Assert.Equal(1, WarmupDetector.WarmupCount([0m, 20m, 20m]));
    }

    [Fact]
    public void Bos_liste_sifir_doner()
    {
        Assert.Equal(0, WarmupDetector.WarmupCount([]));
    }
}
