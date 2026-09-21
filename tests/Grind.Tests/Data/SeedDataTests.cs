using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Data;

public class SeedDataTests
{
    private static IReadOnlyList<IDictionary<string, object?>> Seed() =>
        TestModel.Entity<Exercise>().GetSeedData().ToList();

    [Fact]
    public void Yuzyetmis_global_egzersiz_seed_edilmistir()
    {
        Assert.Equal(170, Seed().Count);
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
    public void Seed_id_leri_birden_yuzyetmise_kadar_benzersizdir()
    {
        // Üst sınır 999: identity 1000'den başlar (aşağıdaki test), seed Id'leri o aralığa taşmamalı.
        var ids = Seed().Select(row => (long)row["Id"]!).OrderBy(id => id).ToArray();
        Assert.Equal(Enumerable.Range(1, 170).Select(i => (long)i).ToArray(), ids);
    }

    [Fact]
    public void Seed_isimleri_ve_kategorileri_beklenenle_birebir_eslesir()
    {
        // Bir global egzersiz kullanıcı geçmişinde göründükten sonra ismi ve kategorisi fiilen
        // kalıcıdır (düzeltmek bir UpdateData migration'ı gerektirir) — bu yüzden listenin tamamı
        // burada sabitlenir; tek bir yazım hatası bile sessizce geçmemeli.
        // #49: çekirdek/stabilite ve tutuş hareketleri Other; kalça menteşesi ve glute hareketleri
        // mevcut Deadlift/Romanian Deadlift gibi Legs.
        (string Name, ExerciseCategory Category)[] expected =
        [
            ("Bench Press", ExerciseCategory.Push),
            ("Incline Dumbbell Press", ExerciseCategory.Push),
            ("Overhead Press", ExerciseCategory.Push),
            ("Dips", ExerciseCategory.Push),
            ("Triceps Pushdown", ExerciseCategory.Push),
            ("Pull-up", ExerciseCategory.Pull),
            ("Barbell Row", ExerciseCategory.Pull),
            ("Lat Pulldown", ExerciseCategory.Pull),
            ("Barbell Curl", ExerciseCategory.Pull),
            ("Face Pull", ExerciseCategory.Pull),
            ("Squat", ExerciseCategory.Legs),
            ("Deadlift", ExerciseCategory.Legs),
            ("Romanian Deadlift", ExerciseCategory.Legs),
            ("Leg Press", ExerciseCategory.Legs),
            ("Leg Curl", ExerciseCategory.Legs),

            ("45 Back Focused Extension", ExerciseCategory.Legs),
            ("45 Dumbbell Back Focused Extension", ExerciseCategory.Legs),
            ("45 Dumbbell Glute Focused Extension", ExerciseCategory.Legs),
            ("45 Dumbbell Single Leg Glute Focused Extension", ExerciseCategory.Legs),
            ("Ab Rollout", ExerciseCategory.Other),
            ("Air Box Squat", ExerciseCategory.Legs),
            ("Air Squat", ExerciseCategory.Legs),
            ("Alternating Dumbbell Curl", ExerciseCategory.Pull),

            ("Banded Push Up", ExerciseCategory.Push),
            ("Barbell Ab Rollout", ExerciseCategory.Other),
            ("Barbell Box Squat", ExerciseCategory.Legs),
            ("Barbell Floor Press", ExerciseCategory.Push),
            ("Barbell Front Squat", ExerciseCategory.Legs),
            ("Barbell Glute Bridge", ExerciseCategory.Legs),
            ("Barbell Good Morning", ExerciseCategory.Legs),
            ("Barbell Hip Thrust", ExerciseCategory.Legs),
            ("Barbell Hold", ExerciseCategory.Other),
            ("Barbell Overhead Press", ExerciseCategory.Push),
            ("Barbell Overhead Squat", ExerciseCategory.Legs),

            ("Cable Front Raise", ExerciseCategory.Push),
            ("Cable Glute Pullthrough", ExerciseCategory.Legs),
            ("Cable High to Low Chop", ExerciseCategory.Other),
            ("Cable Hip Abduction", ExerciseCategory.Legs),
            ("Cable Hip Adduction", ExerciseCategory.Legs),
            ("Cable Kickback", ExerciseCategory.Legs),
            ("Cable Lateral Raise", ExerciseCategory.Push),
            ("Cable Low to High Chop", ExerciseCategory.Other),
            ("Cable Overhead Extension", ExerciseCategory.Push),
            ("Cable Pallof Hold", ExerciseCategory.Other),

            ("Machine Assisted Dips", ExerciseCategory.Push),
            ("Machine Assisted Pull Up", ExerciseCategory.Pull),
            ("Machine Back Extension", ExerciseCategory.Legs),
            ("Machine Glute Kickback", ExerciseCategory.Legs),
            ("Machine Lateral Raise", ExerciseCategory.Push),
            ("Machine Overhead Press", ExerciseCategory.Push),
            ("Machine Pulldown", ExerciseCategory.Pull),
            ("Machine Seated Hip Abduction", ExerciseCategory.Legs),
            ("Machine Seated Hip Adduction", ExerciseCategory.Legs),
            ("Med Ball Rotational Throw", ExerciseCategory.Other),
            ("Miniband Hip Abduction", ExerciseCategory.Legs),

            ("Seated Cable Face Pull", ExerciseCategory.Pull),
            ("Seated Cable Row", ExerciseCategory.Pull),
            ("Seated Calf Raise", ExerciseCategory.Legs),
            ("Seated Dumbbell Shoulder Press", ExerciseCategory.Push),
            ("Seated Leg Curl", ExerciseCategory.Legs),
            ("Side Plank", ExerciseCategory.Other),
            ("Side Plank Rotation", ExerciseCategory.Other),
            ("Single Arm Banded OHP", ExerciseCategory.Push),
            ("Single Arm Banded Row", ExerciseCategory.Pull),
            ("Single Arm Barbell Hold", ExerciseCategory.Other),

            // #121: Kapsamlı Gym Egzersiz ve Varyasyon Rehberi. Mevcut hareketin tekrarı olanlar
            // eklenmedi; ağırlıklı varyasyonlar (Weighted Pull-up/Plank) ağırlık alanıyla kaydedilir.
            // Göğüs/omuz/triceps Push, sırt/biceps/arka omuz Pull, bacak/kalça ve deadlift
            // varyasyonları Legs (Deadlift gibi), karın/core Other.
            ("Incline Barbell Bench Press", ExerciseCategory.Push),
            ("Decline Barbell Bench Press", ExerciseCategory.Push),
            ("Flat Dumbbell Bench Press", ExerciseCategory.Push),
            ("Decline Dumbbell Bench Press", ExerciseCategory.Push),
            ("Neutral Grip Dumbbell Press", ExerciseCategory.Push),
            ("Flat Smith Machine Press", ExerciseCategory.Push),
            ("Incline Smith Machine Press", ExerciseCategory.Push),
            ("Decline Smith Machine Press", ExerciseCategory.Push),
            ("Machine Chest Press", ExerciseCategory.Push),
            ("Incline Machine Chest Press", ExerciseCategory.Push),
            ("Converging Chest Press", ExerciseCategory.Push),
            ("Flat Dumbbell Fly", ExerciseCategory.Push),
            ("Incline Dumbbell Fly", ExerciseCategory.Push),
            ("Decline Dumbbell Fly", ExerciseCategory.Push),
            ("High-to-Low Cable Fly", ExerciseCategory.Push),
            ("Mid-Pulley Cable Fly", ExerciseCategory.Push),
            ("Low-to-High Cable Fly", ExerciseCategory.Push),
            ("Pec Deck", ExerciseCategory.Push),
            ("Push-up", ExerciseCategory.Push),
            ("Incline Push-up", ExerciseCategory.Push),
            ("Decline Push-up", ExerciseCategory.Push),
            ("Deficit Push-up", ExerciseCategory.Push),

            ("Close-Grip Lat Pulldown", ExerciseCategory.Pull),
            ("Reverse Grip Lat Pulldown", ExerciseCategory.Pull),
            ("Single-Arm Cable Lat Pulldown", ExerciseCategory.Pull),
            ("Chin-up", ExerciseCategory.Pull),
            ("Neutral Grip Pull-up", ExerciseCategory.Pull),
            ("Yates Row", ExerciseCategory.Pull),
            ("Pendlay Row", ExerciseCategory.Pull),
            ("Single-Arm Dumbbell Row", ExerciseCategory.Pull),
            ("Chest-Supported Incline Dumbbell Row", ExerciseCategory.Pull),
            ("Wide-Grip Seated Cable Row", ExerciseCategory.Pull),
            ("Single-Arm Seated Cable Row", ExerciseCategory.Pull),
            ("T-Bar Row", ExerciseCategory.Pull),
            ("Iso-Lateral Machine Row", ExerciseCategory.Pull),
            ("Trap Bar Deadlift", ExerciseCategory.Legs),
            ("Rack Pull", ExerciseCategory.Legs),
            ("Straight-Arm Cable Pulldown", ExerciseCategory.Pull),

            ("Seated Barbell Overhead Press", ExerciseCategory.Push),
            ("Behind-the-Neck Press", ExerciseCategory.Push),
            ("Standing Dumbbell Shoulder Press", ExerciseCategory.Push),
            ("Arnold Press", ExerciseCategory.Push),
            ("Seated Smith Machine Overhead Press", ExerciseCategory.Push),
            ("Plate-Loaded Shoulder Press Machine", ExerciseCategory.Push),
            ("Pin-Loaded Shoulder Press Machine", ExerciseCategory.Push),
            ("Standing Dumbbell Lateral Raise", ExerciseCategory.Push),
            ("Seated Dumbbell Lateral Raise", ExerciseCategory.Push),
            ("Incline Lean-Away Lateral Raise", ExerciseCategory.Push),
            ("Cuff Cable Lateral Raise", ExerciseCategory.Push),
            ("Reverse Pec Deck", ExerciseCategory.Pull),
            ("Chest-Supported Incline Dumbbell Rear Delt Fly", ExerciseCategory.Pull),
            ("Bent-over Dumbbell Rear Delt Raise", ExerciseCategory.Pull),
            ("Cable Rear Delt Crossover", ExerciseCategory.Pull),
            ("Barbell Front Raise", ExerciseCategory.Push),
            ("Dumbbell Front Raise", ExerciseCategory.Push),

            ("Low-Bar Back Squat", ExerciseCategory.Legs),
            ("Zercher Squat", ExerciseCategory.Legs),
            ("Hack Squat", ExerciseCategory.Legs),
            ("Pendulum Squat", ExerciseCategory.Legs),
            ("Smith Machine Squat", ExerciseCategory.Legs),
            ("Bulgarian Split Squat", ExerciseCategory.Legs),
            ("Walking Lunge", ExerciseCategory.Legs),
            ("Reverse Lunge", ExerciseCategory.Legs),
            ("Dumbbell Step-Up", ExerciseCategory.Legs),
            ("Seated Leg Extension", ExerciseCategory.Legs),
            ("Sissy Squat", ExerciseCategory.Legs),
            ("Smith Machine Hip Thrust", ExerciseCategory.Legs),
            ("Glute Drive Machine", ExerciseCategory.Legs),
            ("Single-Leg Hip Thrust", ExerciseCategory.Legs),
            ("Dumbbell Romanian Deadlift", ExerciseCategory.Legs),
            ("B-Stance Romanian Deadlift", ExerciseCategory.Legs),
            ("Standing Single-Leg Curl", ExerciseCategory.Legs),
            ("Standing Calf Raise", ExerciseCategory.Legs),
            ("Leg Press Calf Raise", ExerciseCategory.Legs),

            ("EZ-Bar Preacher Curl", ExerciseCategory.Pull),
            ("Single-Arm Dumbbell Preacher Curl", ExerciseCategory.Pull),
            ("Machine Preacher Curl", ExerciseCategory.Pull),
            ("Incline Dumbbell Curl", ExerciseCategory.Pull),
            ("Concentration Curl", ExerciseCategory.Pull),
            ("Spider Curl", ExerciseCategory.Pull),
            ("Standing Dumbbell Hammer Curl", ExerciseCategory.Pull),
            ("Seated Dumbbell Hammer Curl", ExerciseCategory.Pull),
            ("Cable Rope Hammer Curl", ExerciseCategory.Pull),
            ("Reverse Grip Barbell Curl", ExerciseCategory.Pull),
            ("Low Pulley Cable Curl", ExerciseCategory.Pull),
            ("High Cable Curl", ExerciseCategory.Pull),
            ("Cable Rope Pushdown", ExerciseCategory.Push),
            ("Reverse Grip Cable Pushdown", ExerciseCategory.Push),
            ("Skull Crusher", ExerciseCategory.Push),
            ("Incline Skull Crusher", ExerciseCategory.Push),
            ("Decline Skull Crusher", ExerciseCategory.Push),
            ("Overhead Dumbbell Triceps Extension", ExerciseCategory.Push),
            ("Close-Grip Bench Press", ExerciseCategory.Push),
            ("Bench Dips", ExerciseCategory.Push),

            ("Crunch", ExerciseCategory.Other),
            ("Decline Bench Crunch", ExerciseCategory.Other),
            ("Kneeling Cable Crunch", ExerciseCategory.Other),
            ("Hanging Leg Raise", ExerciseCategory.Other),
            ("Hanging Knee Raise", ExerciseCategory.Other),
            ("Captain's Chair Leg Raise", ExerciseCategory.Other),
            ("Lying Leg Raise", ExerciseCategory.Other),
            ("Reverse Crunch", ExerciseCategory.Other),
            ("Plank", ExerciseCategory.Other),
            ("Cable Pallof Press", ExerciseCategory.Other),
            ("Russian Twist", ExerciseCategory.Other)
        ];

        var actual = Seed()
            .OrderBy(row => (long)row["Id"]!)
            .Select(row => ((string)row["Name"]!, (ExerciseCategory)row["Category"]!))
            .ToArray();

        Assert.Equal(expected, actual);
    }

    [Fact]
    public void Seed_isimleri_buyuk_kucuk_harf_duyarsiz_benzersizdir()
    {
        // Uygulama katmanı aynı isimde ikinci egzersize izin vermez (büyük/küçük harf duyarsız);
        // global havuzun kendisi bu kuralı çiğnerse seçim listesinde aynı isim iki kez görünür.
        var names = Seed().Select(row => (string)row["Name"]!).ToArray();
        Assert.Equal(names.Length, names.Distinct(StringComparer.OrdinalIgnoreCase).Count());
    }

    [Fact]
    public void Kullanici_kayitlari_seed_id_leriyle_carpismaz()
    {
        // HasData ile sabit Id yazmak identity sequence'ini İLERLETMEZ. Bu ayar olmadan
        // kullanıcının eklediği ilk egzersiz Id = 1 alır ve Bench Press ile çarpışır.
        Assert.Equal(1000L, TestModel.Entity<Exercise>().FindProperty("Id")!.GetIdentityStartValue());
    }
}
