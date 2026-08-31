using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace Grind.Tests.Data;

public class IndexTests
{
    private static IIndex IndexOn<TEntity>(params string[] propertyNames) =>
        TestModel.Entity<TEntity>()
            .GetIndexes()
            .Single(i => i.Properties.Select(p => p.Name).SequenceEqual(propertyNames));

    [Fact]
    public void Username_benzersizdir()
    {
        Assert.True(IndexOn<User>("Username").IsUnique);
    }

    [Fact]
    public void Ayni_kullanicida_ayni_isimde_iki_egzersiz_olamaz()
    {
        Assert.True(IndexOn<Exercise>("UserId", "Name").IsUnique);
    }

    [Fact]
    public void Global_egzersizlerde_de_isim_benzersizdir()
    {
        // PostgreSQL'de NULL'lar varsayılan olarak birbirinden farklı sayılır; bu ayar
        // olmadan (null, 'Bench Press') satırı iki kez eklenebilirdi.
        Assert.False(IndexOn<Exercise>("UserId", "Name").GetAreNullsDistinct());
    }

    [Fact]
    public void Session_sorgu_indexi_vardir()
    {
        Assert.False(IndexOn<WorkoutSession>("UserId", "StartedAt").IsUnique);
    }

    [Fact]
    public void Pr_sorgusu_icin_set_indexi_vardir()
    {
        Assert.False(IndexOn<SetEntry>("ExerciseId", "WorkoutSessionId").IsUnique);
    }

    [Fact]
    public void Zaman_ekseni_sorgulari_icin_indexler_vardir()
    {
        Assert.False(IndexOn<BodyWeightLog>("UserId", "RecordedAt").IsUnique);
        Assert.False(IndexOn<AiInsight>("UserId", "CreatedAt").IsUnique);
    }

    [Fact]
    public void Sablon_siralama_indexi_unique_degildir()
    {
        // Gerçek programlarda aynı hareket bir günde iki kez geçebilir; DB'de yasaklamak
        // yanlış olurdu.
        Assert.False(IndexOn<TemplateExercise>("WorkoutTemplateId", "OrderIndex").IsUnique);
    }
}
