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
}
