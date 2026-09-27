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

    /// <summary>Bölme yalnızca işaret yazılırsa çalışır: prompt her dilin işaretini BİREBİR göstermeli.</summary>
    [Fact]
    public void Her_dilin_bolum_isareti_promptta_gosterilir()
    {
        var prompt = Olustur();

        foreach (var dil in Diller)
        {
            Assert.Contains(AiInsightSections.Marker(dil), prompt, StringComparison.Ordinal);
        }
    }

    /// <summary>
    /// Tek dil istendiğinde bölüm isteme talimatı da gereksizdir: modele yapmayacağı bir iş
    /// anlatmak çıktıyı bozar.
    /// </summary>
    [Fact]
    public void Tek_dilde_bolum_istenmez()
    {
        var prompt = AiInsightPrompt.Build(goal: null, ["tr"]);

        Assert.DoesNotContain(AiInsightSections.Marker("en"), prompt, StringComparison.Ordinal);
        Assert.Contains("Türkçe", prompt, StringComparison.Ordinal);
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
