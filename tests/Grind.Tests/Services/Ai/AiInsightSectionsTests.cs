using Grind.Api.Services.Ai;

namespace Grind.Tests.Services.Ai;

/// <summary>
/// #199: tek LLM çağrısı her dili ayrı bir bölüm olarak yazar; bu sınıf yanıtı dillere böler. Saf:
/// veritabanı, saat, ağ yok.
///
/// Yanıt bir MODEL ÇIKTISIDIR, sözleşme değil — model işareti bozabilir, atlayabilir, fazladan
/// metin ekleyebilir. Bu yüzden testlerin çoğu "model yanlış yaptığında ne oluyor" sorusunu sorar:
/// ücret çağrı anında doğduğu için hiçbir durumda yorum KAYBEDİLMEMELİ.
/// </summary>
public class AiInsightSectionsTests
{
    private static readonly string[] Diller = ["tr", "en"];

    private static string Bolumlu(params (string Dil, string Metin)[] bolumler) =>
        string.Join("\n", bolumler.Select(b => $"{AiInsightSections.Marker(b.Dil)}\n{b.Metin}"));

    [Fact]
    public void Isaretli_bolumler_dile_gore_ayrilir()
    {
        var sonuc = AiInsightSections.Split(
            Bolumlu(("tr", "Güzel gidiyorsun."), ("en", "You are doing well.")), Diller);

        Assert.Equal("Güzel gidiyorsun.", sonuc["tr"]);
        Assert.Equal("You are doing well.", sonuc["en"]);
    }

    /// <summary>Model bölümleri istediğimiz sırada yazmayabilir; eşleşme sıraya değil işarete bakar.</summary>
    [Fact]
    public void Bolum_sirasi_farkli_olsa_da_dogru_eslesir()
    {
        var sonuc = AiInsightSections.Split(
            Bolumlu(("en", "You are doing well."), ("tr", "Güzel gidiyorsun.")), Diller);

        Assert.Equal("Güzel gidiyorsun.", sonuc["tr"]);
        Assert.Equal("You are doing well.", sonuc["en"]);
    }

    /// <summary>
    /// KRİTİK: model işareti hiç yazmazsa yanıt çöpe atılmaz — tüm metin İLK dile yazılır. Çağrının
    /// parası ödenmiştir; kullanıcıya boş bir yorum göstermek en kötü sonuçtur.
    /// </summary>
    [Fact]
    public void Isaret_yoksa_tum_metin_ilk_dile_yazilir()
    {
        var sonuc = AiInsightSections.Split("Güzel gidiyorsun.", Diller);

        Assert.Equal("Güzel gidiyorsun.", sonuc["tr"]);
        Assert.Single(sonuc);
    }

    /// <summary>Eksik bir dil UYDURULMAZ: o dil sonuçta hiç yer almaz, boş metinle doldurulmaz.</summary>
    [Fact]
    public void Eksik_dil_uydurulmaz()
    {
        var sonuc = AiInsightSections.Split(Bolumlu(("tr", "Güzel gidiyorsun.")), Diller);

        Assert.Equal(["tr"], sonuc.Keys);
    }

    /// <summary>İstenmeyen bir dil işareti yok sayılır: modelin ürettiği fazlalık veritabanına girmez.</summary>
    [Fact]
    public void Istenmeyen_dil_yok_sayilir()
    {
        var sonuc = AiInsightSections.Split(
            Bolumlu(("tr", "Güzel."), ("de", "Gut."), ("en", "Good.")), Diller);

        Assert.Equal(["tr", "en"], sonuc.Keys.Order().Reverse());
        Assert.DoesNotContain("Gut.", string.Join("", sonuc.Values));
    }

    /// <summary>Bölümün kendi iç satır sonları (başlıklar, maddeler) korunur; yalnızca uçlar kırpılır.</summary>
    [Fact]
    public void Ic_satir_sonlari_korunur_uclar_kirpilir()
    {
        var sonuc = AiInsightSections.Split(
            $"{AiInsightSections.Marker("tr")}\n\n## Özet\n- Madde\n\n", Diller);

        Assert.Equal("## Özet\n- Madde", sonuc["tr"]);
    }

    /// <summary>Boş bir bölüm kaydedilmez: "başlık var, içerik yok" bir yorum değildir.</summary>
    [Fact]
    public void Bos_bolum_kaydedilmez()
    {
        var sonuc = AiInsightSections.Split(
            Bolumlu(("tr", "   "), ("en", "Good.")), Diller);

        Assert.Equal(["en"], sonuc.Keys);
    }

    [Fact]
    public void Bos_yanit_bos_sonuc_verir()
    {
        Assert.Empty(AiInsightSections.Split("   ", Diller));
    }
}
