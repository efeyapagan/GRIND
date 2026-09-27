using System.Text.Json;
using Grind.Api.Services.Ai;

namespace Grind.Tests.Services.Ai;

/// <summary>
/// #463: tek LLM çağrısı artık TEK bir JSON döner -- dış anahtarlar dil kodları, değerler o dilin
/// yorum nesnesi. Eski "bölüm işareti" düzeninin yerini bu aldı: metin içinde işaret aramak
/// kırılgandı ve bozulduğunda kullanıcıya ham JSON gösteriyordu (#463 madde 3).
///
/// Saf: veritabanı, saat, ağ yok. Testlerin çoğu "model yanlış yaptığında ne oluyor" sorusunu
/// sorar: ücret çağrı anında doğduğu için hiçbir bozulma yorumu KAYBETTİRMEMELİ.
/// </summary>
public class AiInsightSectionsTests
{
    private static readonly string[] Diller = ["tr", "en"];

    private static string Yorum(string ozet) =>
        $$"""{"ozet":"{{ozet}}","basarilar":[],"uyarilar":[],"tavsiyeler":["x"]}""";

    private static string TekJson(params (string Dil, string Ozet)[] bolumler) =>
        "{" + string.Join(",", bolumler.Select(b => $"\"{b.Dil}\":{Yorum(b.Ozet)}")) + "}";

    private static string Ozetini(string icerik) =>
        JsonDocument.Parse(icerik).RootElement.GetProperty("ozet").GetString()!;

    [Fact]
    public void Her_dil_kendi_json_nesnesi_olarak_ayrilir()
    {
        var sonuc = AiInsightSections.Split(TekJson(("tr", "İyi"), ("en", "Good")), Diller);

        Assert.Equal("İyi", Ozetini(sonuc["tr"]));
        Assert.Equal("Good", Ozetini(sonuc["en"]));
    }

    /// <summary>Saklanan icerik ALT nesnedir: istemci ayristiricisi (yorumuCozumle) onu bekler.</summary>
    [Fact]
    public void Saklanan_icerik_dil_sarmalayicisini_TASIMAZ()
    {
        var sonuc = AiInsightSections.Split(TekJson(("tr", "İyi")), Diller);

        Assert.DoesNotContain("\"tr\"", sonuc["tr"], StringComparison.Ordinal);
    }

    /// <summary>Model JSON'u ``` bloguna sarabilir; bu bozuk bir yanit degil.</summary>
    [Fact]
    public void Kod_blogu_icindeki_json_da_cozumlenir()
    {
        var sonuc = AiInsightSections.Split("```json\n" + TekJson(("tr", "İyi")) + "\n```", Diller);

        Assert.Equal("İyi", Ozetini(sonuc["tr"]));
    }

    /// <summary>Istenmeyen bir dil yok sayilir: modelin fazlaligi veritabanina girmez.</summary>
    [Fact]
    public void Istenmeyen_dil_yok_sayilir()
    {
        var sonuc = AiInsightSections.Split(TekJson(("tr", "İyi"), ("de", "Gut"), ("en", "Good")), Diller);

        Assert.Equal(["tr", "en"], sonuc.Keys.Order().Reverse());
    }

    /// <summary>Eksik bir dil UYDURULMAZ: o dil sonucta hic yer almaz.</summary>
    [Fact]
    public void Eksik_dil_uydurulmaz()
    {
        var sonuc = AiInsightSections.Split(TekJson(("tr", "İyi")), Diller);

        Assert.Equal(["tr"], sonuc.Keys);
    }

    /// <summary>
    /// KRİTİK: JSON hiç ayrışmazsa yanıt çöpe atılmaz -- tüm metin İLK dile yazılır. Çağrının
    /// parası ödenmiştir; kullanıcıya boş bir yorum göstermek en kötü sonuçtur.
    /// </summary>
    [Fact]
    public void Bozuk_json_ilk_dile_duz_metin_olarak_yazilir()
    {
        var sonuc = AiInsightSections.Split("Güzel gidiyorsun.", Diller);

        Assert.Equal("Güzel gidiyorsun.", sonuc["tr"]);
        Assert.Single(sonuc);
    }

    /// <summary>Gecerli JSON ama dil anahtari yoksa yine kaybedilmez: duz metin gibi saklanir.</summary>
    [Fact]
    public void Dil_anahtari_olmayan_json_kaybolmaz()
    {
        const string yanit = """{"ozet":"tek dilli dondu"}""";

        var sonuc = AiInsightSections.Split(yanit, Diller);

        Assert.Equal(yanit, sonuc["tr"]);
    }

    /// <summary>Bir dilin degeri nesne degilse (ornegin duz metin) o dil atlanir, digerleri kalir.</summary>
    [Fact]
    public void Nesne_olmayan_dil_degeri_atlanir()
    {
        var sonuc = AiInsightSections.Split($$"""{"tr":"duz metin","en":{{Yorum("Good")}}}""", Diller);

        Assert.Equal(["en"], sonuc.Keys);
    }

    [Fact]
    public void Bos_yanit_bos_sonuc_verir()
    {
        Assert.Empty(AiInsightSections.Split("   ", Diller));
    }
}
