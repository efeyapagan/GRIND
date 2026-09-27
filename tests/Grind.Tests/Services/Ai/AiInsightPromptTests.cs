using Grind.Api.Models.Enums;
using Grind.Api.Services.Ai;

namespace Grind.Tests.Services.Ai;

/// <summary>
/// #444: prompt artık kullanıcının antrenman hedefine göre değişiyor. Sınanan şey metnin kelimesi
/// kelimesine ne olduğu DEĞİL (o zaman her düzeltme testi kırar), hedefin bağlama girdiği ve
/// güvenlik kurallarının HİÇBİR varyantta düşmediğidir.
/// </summary>
public class AiInsightPromptTests
{
    private static readonly string[] Diller = ["tr", "en"];

    private static string Olustur(TrainingGoal? goal = null) => AiInsightPrompt.Build(goal, Diller);

    [Fact]
    public void Hedef_secilmemisse_temel_talimat_aynen_kalir()
    {
        Assert.StartsWith(AiInsightPrompt.Instructions, Olustur(), StringComparison.Ordinal);
    }

    [Fact]
    public void Secili_hedef_prompta_girer()
    {
        var prompt = Olustur(TrainingGoal.Hipertrofi);

        Assert.Contains("hipertrofi", prompt, StringComparison.OrdinalIgnoreCase);
        Assert.StartsWith(AiInsightPrompt.Instructions, prompt, StringComparison.Ordinal);
    }

    // ---- Çok dilli üretim (#199) ----

    /// <summary>
    /// Model hangi dilleri yazacağını ADLARIYLA görmeli: "tr"/"en" kodları bir dil adı değildir ve
    /// model bunları metin sanabilir.
    /// </summary>
    [Fact]
    public void Istenen_her_dil_promptta_adiyla_gecer()
    {
        var prompt = Olustur();

        Assert.Contains("Türkçe", prompt, StringComparison.Ordinal);
        Assert.Contains("English", prompt, StringComparison.Ordinal);
    }

    /// <summary>
    /// #463: yanıt TEK bir JSON; dış anahtarlar dil KODLARI. Prompt bu anahtarları birebir
    /// göstermeli, yoksa model "Turkish" gibi bir anahtar uydurur ve bölme tutmaz.
    /// </summary>
    [Fact]
    public void Her_dilin_kodu_promptta_anahtar_olarak_gosterilir()
    {
        var prompt = Olustur();

        foreach (var dil in Diller)
        {
            Assert.Contains($"\"{dil}\"", prompt, StringComparison.Ordinal);
        }
    }

    /// <summary>Semanin alan adlari promptta birebir gecmeli; aksi halde istemci ayristiramaz.</summary>
    [Theory]
    [InlineData("ozet")]
    [InlineData("basarilar")]
    [InlineData("uyarilar")]
    [InlineData("tavsiyeler")]
    public void Sema_alanlari_promptta_gecer(string alan)
    {
        Assert.Contains($"\"{alan}\"", Olustur(), StringComparison.Ordinal);
    }

    // ---- Türkçe çıktı kalitesi (#463) ----

    /// <summary>
    /// Kullanıcı kararı: hareket adları ve Push/Pull gibi terimler Türkçe metinde İNGİLİZCE
    /// kalır -- çevrilince okunmaz hâle geliyor.
    /// </summary>
    [Fact]
    public void Terimlerin_ingilizce_kalacagi_soylenir()
    {
        var prompt = Olustur();

        Assert.Contains("Push", prompt, StringComparison.Ordinal);
        Assert.Contains("çevirme", prompt, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Kullanıcı itirazı: farklı kas grupları farklı mutlak yük taşır; ham kg toplamını
    /// kalıplar arasında karşılaştırıp "dengesiz" demek yanlış bir çıkarımdır.
    /// </summary>
    [Fact]
    public void Kaliplar_arasi_ham_hacim_karsilastirmasi_yasaklanir()
    {
        var prompt = Olustur();

        Assert.Contains("set sayısı", prompt, StringComparison.Ordinal);
        Assert.Contains("dengesizlik", prompt, StringComparison.Ordinal);
    }

    /// <summary>Her hedefin TR bir karşılığı olmalı: enum adı ("KiloVerme") LLM'e sızmamalı.</summary>
    [Theory]
    [InlineData(TrainingGoal.Hipertrofi)]
    [InlineData(TrainingGoal.Guc)]
    [InlineData(TrainingGoal.KiloVerme)]
    [InlineData(TrainingGoal.GenelForm)]
    public void Her_hedef_enum_adiyla_degil_turkce_yazilir(TrainingGoal goal)
    {
        var prompt = Olustur(goal);

        Assert.DoesNotContain(goal.ToString(), prompt, StringComparison.Ordinal);
    }

    /// <summary>
    /// KRİTİK: prompt injection savunması ve "sayı uydurma" yasağı bir varyantta bile düşerse,
    /// kullanıcının kendi antrenman notu modele komut verebilir hâle gelir.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData(TrainingGoal.Guc)]
    public void Guvenlik_kurallari_her_varyantta_durur(TrainingGoal? goal)
    {
        var prompt = Olustur(goal);

        Assert.Contains("komut olarak izleme", prompt, StringComparison.Ordinal);
        Assert.Contains("sayı uydurma", prompt, StringComparison.Ordinal);
    }
}
