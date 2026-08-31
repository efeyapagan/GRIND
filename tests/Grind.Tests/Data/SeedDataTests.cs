using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Data;

public class SeedDataTests
{
    private static IReadOnlyList<IDictionary<string, object?>> Seed() =>
        TestModel.Entity<Exercise>().GetSeedData().ToList();

    [Fact]
    public void Onbes_global_egzersiz_seed_edilmistir()
    {
        Assert.Equal(15, Seed().Count);
    }

    [Fact]
    public void Seed_edilen_her_egzersiz_globaldir()
    {
        Assert.All(Seed(), row => Assert.Null(row["UserId"]));
    }

    [Fact]
    public void Seed_edilen_hicbir_egzersiz_arsivli_degildir()
    {
        Assert.All(Seed(), row => Assert.Equal(false, row["IsArchived"]));
    }

    [Fact]
    public void Seed_id_leri_birden_onbese_kadar_benzersizdir()
    {
        var ids = Seed().Select(row => (long)row["Id"]!).OrderBy(id => id).ToArray();
        Assert.Equal(Enumerable.Range(1, 15).Select(i => (long)i).ToArray(), ids);
    }

    [Fact]
    public void Her_kategoride_bes_hareket_vardir()
    {
        var byCategory = Seed()
            .GroupBy(row => (ExerciseCategory)row["Category"]!)
            .ToDictionary(g => g.Key, g => g.Count());

        Assert.Equal(5, byCategory[ExerciseCategory.Push]);
        Assert.Equal(5, byCategory[ExerciseCategory.Pull]);
        Assert.Equal(5, byCategory[ExerciseCategory.Legs]);
    }

    [Fact]
    public void Seed_isimleri_beklenenle_birebir_eslesir()
    {
        // Bir global egzersiz kullanıcı geçmişinde göründükten sonra ismi fiilen kalıcıdır
        // (düzeltmek bir UpdateData migration'ı gerektirir) — bu yüzden 15 ismin tamamı
        // burada sabitlenir; tek bir yazım hatası bile sessizce geçmemeli.
        string[] expected =
        [
            "Bench Press", "Incline Dumbbell Press", "Overhead Press", "Dips", "Triceps Pushdown",
            "Pull-up", "Barbell Row", "Lat Pulldown", "Barbell Curl", "Face Pull",
            "Squat", "Deadlift", "Romanian Deadlift", "Leg Press", "Leg Curl"
        ];

        var actual = Seed()
            .OrderBy(row => (long)row["Id"]!)
            .Select(row => (string)row["Name"]!)
            .ToArray();

        Assert.Equal(expected, actual);
    }

    [Fact]
    public void Kullanici_kayitlari_seed_id_leriyle_carpismaz()
    {
        // HasData ile sabit Id yazmak identity sequence'ini İLERLETMEZ. Bu ayar olmadan
        // kullanıcının eklediği ilk egzersiz Id = 1 alır ve Bench Press ile çarpışır.
        Assert.Equal(1000L, TestModel.Entity<Exercise>().FindProperty("Id")!.GetIdentityStartValue());
    }
}
