using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Data;

public class CheckConstraintTests
{
    private static string SqlOf<TEntity>(string constraintName) =>
        TestModel.Entity<TEntity>()
            .GetCheckConstraints()
            .Single(c => c.Name == constraintName)
            .Sql;

    [Fact]
    public void Vucut_agirligi_hareketleri_icin_sifir_kilo_gecerlidir()
    {
        // Barfiks/dips 0 kg'dır. Kısıt ">= 0" olmalı; "> 0" olsaydı bu hareketler
        // hiç kaydedilemezdi.
        var sql = SqlOf<SetEntry>("CK_SetEntry_Weight_NonNegative");
        Assert.Contains(">= 0", sql);
        Assert.DoesNotContain("> 0", sql.Replace(">= 0", string.Empty));
    }

    [Fact]
    public void Tekrar_sayisi_pozitif_olmalidir()
    {
        Assert.Contains("> 0", SqlOf<SetEntry>("CK_SetEntry_Reps_Positive"));
    }

    [Fact]
    public void Rir_negatif_olamaz_ama_bos_birakilabilir()
    {
        var sql = SqlOf<SetEntry>("CK_SetEntry_Rir_NonNegative");
        Assert.Contains("IS NULL", sql);
        Assert.Contains(">= 0", sql);
    }

    [Fact]
    public void Hedef_set_sayisi_pozitif_olmalidir()
    {
        Assert.Contains("> 0", SqlOf<TemplateExercise>("CK_TemplateExercise_PlannedSets_Positive"));
    }

    /// <summary>0 = bu harekette dinlenme sayacı yok; üst sınır 15 dakika.</summary>
    [Fact]
    public void Dinlenme_suresi_sifir_ile_dokuz_yuz_saniye_arasindadir()
    {
        var sql = SqlOf<TemplateExercise>("CK_TemplateExercise_RestSeconds_Range");
        Assert.Contains("\"RestSeconds\" >= 0", sql);
        Assert.Contains("\"RestSeconds\" <= 900", sql);
    }

    [Fact]
    public void Oturum_baslamadan_bitemez_ama_acik_kalabilir()
    {
        var sql = SqlOf<WorkoutSession>("CK_WorkoutSession_EndedAt_After_StartedAt");
        Assert.Contains("IS NULL", sql);
        Assert.Contains("\"StartedAt\"", sql);
        Assert.Contains("\"EndedAt\" > \"StartedAt\"", sql);
    }

    [Fact]
    public void Vucut_agirligi_sifir_olamaz()
    {
        Assert.Contains("> 0", SqlOf<BodyWeightLog>("CK_BodyWeightLog_Weight_Positive"));
    }

    /// <summary>Issue #119: yağ oranı ve bel çevresi de (Weight gibi) opsiyonel ama pozitif olmalı.</summary>
    [Fact]
    public void Yag_orani_ve_bel_cevresi_sifir_olamaz_ama_bos_birakilabilir()
    {
        Assert.Contains("> 0", SqlOf<BodyWeightLog>("CK_BodyWeightLog_BodyFatPercent_Positive"));
        Assert.Contains("> 0", SqlOf<BodyWeightLog>("CK_BodyWeightLog_WaistCm_Positive"));
    }

    /// <summary>#97: null = hedef yok; hafta 7 gündür.</summary>
    [Fact]
    public void Haftalik_hedef_bos_ya_da_bir_ile_yedi_arasindadir()
    {
        var sql = SqlOf<User>("CK_User_WeeklyTargetDays_Range");
        Assert.Contains("\"WeeklyTargetDays\" IS NULL", sql);
        Assert.Contains("\"WeeklyTargetDays\" >= 1", sql);
        Assert.Contains("\"WeeklyTargetDays\" <= 7", sql);
    }
}
