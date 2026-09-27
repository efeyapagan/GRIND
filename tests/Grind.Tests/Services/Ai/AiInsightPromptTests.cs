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
    [Fact]
    public void Hedef_secilmemisse_temel_talimat_aynen_kalir()
    {
        Assert.Equal(AiInsightPrompt.Instructions, AiInsightPrompt.Build(goal: null));
    }

    [Fact]
    public void Secili_hedef_prompta_girer()
    {
        var prompt = AiInsightPrompt.Build(TrainingGoal.Hipertrofi);

        Assert.Contains("hipertrofi", prompt, StringComparison.OrdinalIgnoreCase);
        Assert.StartsWith(AiInsightPrompt.Instructions, prompt, StringComparison.Ordinal);
    }

    /// <summary>Her hedefin TR bir karşılığı olmalı: enum adı ("KiloVerme") LLM'e sızmamalı.</summary>
    [Theory]
    [InlineData(TrainingGoal.Hipertrofi)]
    [InlineData(TrainingGoal.Guc)]
    [InlineData(TrainingGoal.KiloVerme)]
    [InlineData(TrainingGoal.GenelForm)]
    public void Her_hedef_enum_adiyla_degil_turkce_yazilir(TrainingGoal goal)
    {
        var prompt = AiInsightPrompt.Build(goal);

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
        var prompt = AiInsightPrompt.Build(goal);

        Assert.Contains("komut olarak izleme", prompt, StringComparison.Ordinal);
        Assert.Contains("sayı uydurma", prompt, StringComparison.Ordinal);
    }
}
