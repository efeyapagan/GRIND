using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Data;

public class SeedDataTests
{
    private static IReadOnlyList<IDictionary<string, object?>> Seed() =>
        TestModel.Entity<Exercise>().GetSeedData().ToList();

    [Fact]
    public void Yuzdoksaniki_global_egzersiz_seed_edilmistir()
    {
        Assert.Equal(192, Seed().Count);
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
    public void Seed_id_leri_birden_yuzdoksanikiye_kadar_benzersizdir()
    {
        // Üst sınır 999: identity 1000'den başlar (aşağıdaki test), seed Id'leri o aralığa taşmamalı.
        var ids = Seed().Select(row => (long)row["Id"]!).OrderBy(id => id).ToArray();
        Assert.Equal(Enumerable.Range(1, 192).Select(i => (long)i).ToArray(), ids);
    }

    [Fact]
    public void Seed_isimleri_kategorileri_ve_ekipmanlari_beklenenle_birebir_eslesir()
    {
        // Bir global egzersiz kullanıcı geçmişinde göründükten sonra ismi ve kategorisi fiilen
        // kalıcıdır (düzeltmek bir UpdateData migration'ı gerektirir) — bu yüzden listenin tamamı
        // burada sabitlenir; tek bir yazım hatası bile sessizce geçmemeli.
        // #49: çekirdek/stabilite ve tutuş hareketleri Other; kalça menteşesi ve glute hareketleri
        // mevcut Deadlift/Romanian Deadlift gibi Legs.
        // #413: üçüncü kolon ekipman — set girişindeki "Teki"/"Toplam" ibaresi buna bakar, bu yüzden
        // hareketin hangi ekipmanla yapıldığı da isim kadar bağlayıcıdır. Dumbbell "Teki",
        // Machine "Toplam" gösterir; Barbell/Cable/Bodyweight/Other ibare göstermez. Adında ekipman
        // geçmeyenler yapılışına göre sınıflandırıldı (Leg Press/Pec Deck → Machine, Lat Pulldown →
        // Cable, Pull-up/Plank → Bodyweight); yükü serbest olanlar (Bulgarian Split Squat, lunge'lar)
        // temel hâlleriyle Bodyweight sayıldı — yanlış bir "Teki" göstermekten iyidir. Other yalnızca
        // bu beş türe girmeyen aparatlar (med ball, lastik bant).
        (string Name, ExerciseCategory Category, ExerciseEquipment Equipment)[] expected =
        [
            ("Bench Press", ExerciseCategory.Push, ExerciseEquipment.Barbell),
            ("Incline Dumbbell Press", ExerciseCategory.Push, ExerciseEquipment.Dumbbell),
            ("Overhead Press", ExerciseCategory.Push, ExerciseEquipment.Barbell),
            ("Dips", ExerciseCategory.Push, ExerciseEquipment.Bodyweight),
            ("Triceps Pushdown", ExerciseCategory.Push, ExerciseEquipment.Cable),
            ("Pull-up", ExerciseCategory.Pull, ExerciseEquipment.Bodyweight),
            ("Barbell Row", ExerciseCategory.Pull, ExerciseEquipment.Barbell),
            ("Lat Pulldown", ExerciseCategory.Pull, ExerciseEquipment.Cable),
            ("Barbell Curl", ExerciseCategory.Pull, ExerciseEquipment.Barbell),
            ("Face Pull", ExerciseCategory.Pull, ExerciseEquipment.Cable),
            ("Squat", ExerciseCategory.Legs, ExerciseEquipment.Barbell),
            ("Deadlift", ExerciseCategory.Legs, ExerciseEquipment.Barbell),
            ("Romanian Deadlift", ExerciseCategory.Legs, ExerciseEquipment.Barbell),
            ("Leg Press", ExerciseCategory.Legs, ExerciseEquipment.Machine),
            ("Leg Curl", ExerciseCategory.Legs, ExerciseEquipment.Machine),

            ("45 Back Focused Extension", ExerciseCategory.Legs, ExerciseEquipment.Bodyweight),
            ("45 Dumbbell Back Focused Extension", ExerciseCategory.Legs, ExerciseEquipment.Dumbbell),
            ("45 Dumbbell Glute Focused Extension", ExerciseCategory.Legs, ExerciseEquipment.Dumbbell),
            ("45 Dumbbell Single Leg Glute Focused Extension", ExerciseCategory.Legs, ExerciseEquipment.Dumbbell),
            ("Ab Rollout", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Air Box Squat", ExerciseCategory.Legs, ExerciseEquipment.Bodyweight),
            ("Air Squat", ExerciseCategory.Legs, ExerciseEquipment.Bodyweight),
            ("Alternating Dumbbell Curl", ExerciseCategory.Pull, ExerciseEquipment.Dumbbell),

            ("Banded Push Up", ExerciseCategory.Push, ExerciseEquipment.Bodyweight),
            ("Barbell Ab Rollout", ExerciseCategory.Other, ExerciseEquipment.Barbell),
            ("Barbell Box Squat", ExerciseCategory.Legs, ExerciseEquipment.Barbell),
            ("Barbell Floor Press", ExerciseCategory.Push, ExerciseEquipment.Barbell),
            ("Barbell Front Squat", ExerciseCategory.Legs, ExerciseEquipment.Barbell),
            ("Barbell Glute Bridge", ExerciseCategory.Legs, ExerciseEquipment.Barbell),
            ("Barbell Good Morning", ExerciseCategory.Legs, ExerciseEquipment.Barbell),
            ("Barbell Hip Thrust", ExerciseCategory.Legs, ExerciseEquipment.Barbell),
            ("Barbell Hold", ExerciseCategory.Other, ExerciseEquipment.Barbell),
            ("Barbell Overhead Press", ExerciseCategory.Push, ExerciseEquipment.Barbell),
            ("Barbell Overhead Squat", ExerciseCategory.Legs, ExerciseEquipment.Barbell),

            ("Cable Front Raise", ExerciseCategory.Push, ExerciseEquipment.Cable),
            ("Cable Glute Pullthrough", ExerciseCategory.Legs, ExerciseEquipment.Cable),
            ("Cable High to Low Chop", ExerciseCategory.Other, ExerciseEquipment.Cable),
            ("Cable Hip Abduction", ExerciseCategory.Legs, ExerciseEquipment.Cable),
            ("Cable Hip Adduction", ExerciseCategory.Legs, ExerciseEquipment.Cable),
            ("Cable Kickback", ExerciseCategory.Legs, ExerciseEquipment.Cable),
            ("Cable Lateral Raise", ExerciseCategory.Push, ExerciseEquipment.Cable),
            ("Cable Low to High Chop", ExerciseCategory.Other, ExerciseEquipment.Cable),
            ("Cable Overhead Extension", ExerciseCategory.Push, ExerciseEquipment.Cable),
            ("Cable Pallof Hold", ExerciseCategory.Other, ExerciseEquipment.Cable),

            ("Machine Assisted Dips", ExerciseCategory.Push, ExerciseEquipment.Machine),
            ("Machine Assisted Pull Up", ExerciseCategory.Pull, ExerciseEquipment.Machine),
            ("Machine Back Extension", ExerciseCategory.Legs, ExerciseEquipment.Machine),
            ("Machine Glute Kickback", ExerciseCategory.Legs, ExerciseEquipment.Machine),
            ("Machine Lateral Raise", ExerciseCategory.Push, ExerciseEquipment.Machine),
            ("Machine Overhead Press", ExerciseCategory.Push, ExerciseEquipment.Machine),
            ("Machine Pulldown", ExerciseCategory.Pull, ExerciseEquipment.Machine),
            ("Machine Seated Hip Abduction", ExerciseCategory.Legs, ExerciseEquipment.Machine),
            ("Machine Seated Hip Adduction", ExerciseCategory.Legs, ExerciseEquipment.Machine),
            ("Med Ball Rotational Throw", ExerciseCategory.Other, ExerciseEquipment.Other),
            ("Miniband Hip Abduction", ExerciseCategory.Legs, ExerciseEquipment.Other),

            ("Seated Cable Face Pull", ExerciseCategory.Pull, ExerciseEquipment.Cable),
            ("Seated Cable Row", ExerciseCategory.Pull, ExerciseEquipment.Cable),
            ("Seated Calf Raise", ExerciseCategory.Legs, ExerciseEquipment.Machine),
            ("Seated Dumbbell Shoulder Press", ExerciseCategory.Push, ExerciseEquipment.Dumbbell),
            ("Seated Leg Curl", ExerciseCategory.Legs, ExerciseEquipment.Machine),
            ("Side Plank", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Side Plank Rotation", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Single Arm Banded OHP", ExerciseCategory.Push, ExerciseEquipment.Other),
            ("Single Arm Banded Row", ExerciseCategory.Pull, ExerciseEquipment.Other),
            ("Single Arm Barbell Hold", ExerciseCategory.Other, ExerciseEquipment.Barbell),

            // #121: Kapsamlı Gym Egzersiz ve Varyasyon Rehberi. Mevcut hareketin tekrarı olanlar
            // eklenmedi; ağırlıklı varyasyonlar (Weighted Pull-up/Plank) ağırlık alanıyla kaydedilir.
            // Göğüs/omuz/triceps Push, sırt/biceps/arka omuz Pull, bacak/kalça ve deadlift
            // varyasyonları Legs (Deadlift gibi), karın/core Other.
            ("Incline Barbell Bench Press", ExerciseCategory.Push, ExerciseEquipment.Barbell),
            ("Decline Barbell Bench Press", ExerciseCategory.Push, ExerciseEquipment.Barbell),
            ("Flat Dumbbell Bench Press", ExerciseCategory.Push, ExerciseEquipment.Dumbbell),
            ("Decline Dumbbell Bench Press", ExerciseCategory.Push, ExerciseEquipment.Dumbbell),
            ("Neutral Grip Dumbbell Press", ExerciseCategory.Push, ExerciseEquipment.Dumbbell),
            ("Flat Smith Machine Press", ExerciseCategory.Push, ExerciseEquipment.Machine),
            ("Incline Smith Machine Press", ExerciseCategory.Push, ExerciseEquipment.Machine),
            ("Decline Smith Machine Press", ExerciseCategory.Push, ExerciseEquipment.Machine),
            ("Machine Chest Press", ExerciseCategory.Push, ExerciseEquipment.Machine),
            ("Incline Machine Chest Press", ExerciseCategory.Push, ExerciseEquipment.Machine),
            ("Converging Chest Press", ExerciseCategory.Push, ExerciseEquipment.Machine),
            ("Flat Dumbbell Fly", ExerciseCategory.Push, ExerciseEquipment.Dumbbell),
            ("Incline Dumbbell Fly", ExerciseCategory.Push, ExerciseEquipment.Dumbbell),
            ("Decline Dumbbell Fly", ExerciseCategory.Push, ExerciseEquipment.Dumbbell),
            ("High-to-Low Cable Fly", ExerciseCategory.Push, ExerciseEquipment.Cable),
            ("Mid-Pulley Cable Fly", ExerciseCategory.Push, ExerciseEquipment.Cable),
            ("Low-to-High Cable Fly", ExerciseCategory.Push, ExerciseEquipment.Cable),
            ("Pec Deck", ExerciseCategory.Push, ExerciseEquipment.Machine),
            ("Push-up", ExerciseCategory.Push, ExerciseEquipment.Bodyweight),
            ("Incline Push-up", ExerciseCategory.Push, ExerciseEquipment.Bodyweight),
            ("Decline Push-up", ExerciseCategory.Push, ExerciseEquipment.Bodyweight),
            ("Deficit Push-up", ExerciseCategory.Push, ExerciseEquipment.Bodyweight),

            ("Close-Grip Lat Pulldown", ExerciseCategory.Pull, ExerciseEquipment.Cable),
            ("Reverse Grip Lat Pulldown", ExerciseCategory.Pull, ExerciseEquipment.Cable),
            ("Single-Arm Cable Lat Pulldown", ExerciseCategory.Pull, ExerciseEquipment.Cable),
            ("Chin-up", ExerciseCategory.Pull, ExerciseEquipment.Bodyweight),
            ("Neutral Grip Pull-up", ExerciseCategory.Pull, ExerciseEquipment.Bodyweight),
            ("Yates Row", ExerciseCategory.Pull, ExerciseEquipment.Barbell),
            ("Pendlay Row", ExerciseCategory.Pull, ExerciseEquipment.Barbell),
            ("Single-Arm Dumbbell Row", ExerciseCategory.Pull, ExerciseEquipment.Dumbbell),
            ("Chest-Supported Incline Dumbbell Row", ExerciseCategory.Pull, ExerciseEquipment.Dumbbell),
            ("Wide-Grip Seated Cable Row", ExerciseCategory.Pull, ExerciseEquipment.Cable),
            ("Single-Arm Seated Cable Row", ExerciseCategory.Pull, ExerciseEquipment.Cable),
            ("T-Bar Row", ExerciseCategory.Pull, ExerciseEquipment.Barbell),
            ("Iso-Lateral Machine Row", ExerciseCategory.Pull, ExerciseEquipment.Machine),
            ("Trap Bar Deadlift", ExerciseCategory.Legs, ExerciseEquipment.Barbell),
            ("Rack Pull", ExerciseCategory.Legs, ExerciseEquipment.Barbell),
            ("Straight-Arm Cable Pulldown", ExerciseCategory.Pull, ExerciseEquipment.Cable),

            ("Seated Barbell Overhead Press", ExerciseCategory.Push, ExerciseEquipment.Barbell),
            ("Behind-the-Neck Press", ExerciseCategory.Push, ExerciseEquipment.Barbell),
            ("Standing Dumbbell Shoulder Press", ExerciseCategory.Push, ExerciseEquipment.Dumbbell),
            ("Arnold Press", ExerciseCategory.Push, ExerciseEquipment.Dumbbell),
            ("Seated Smith Machine Overhead Press", ExerciseCategory.Push, ExerciseEquipment.Machine),
            ("Plate-Loaded Shoulder Press Machine", ExerciseCategory.Push, ExerciseEquipment.Machine),
            ("Pin-Loaded Shoulder Press Machine", ExerciseCategory.Push, ExerciseEquipment.Machine),
            ("Standing Dumbbell Lateral Raise", ExerciseCategory.Push, ExerciseEquipment.Dumbbell),
            ("Seated Dumbbell Lateral Raise", ExerciseCategory.Push, ExerciseEquipment.Dumbbell),
            ("Incline Lean-Away Lateral Raise", ExerciseCategory.Push, ExerciseEquipment.Dumbbell),
            ("Cuff Cable Lateral Raise", ExerciseCategory.Push, ExerciseEquipment.Cable),
            ("Reverse Pec Deck", ExerciseCategory.Pull, ExerciseEquipment.Machine),
            ("Chest-Supported Incline Dumbbell Rear Delt Fly", ExerciseCategory.Pull, ExerciseEquipment.Dumbbell),
            ("Bent-over Dumbbell Rear Delt Raise", ExerciseCategory.Pull, ExerciseEquipment.Dumbbell),
            ("Cable Rear Delt Crossover", ExerciseCategory.Pull, ExerciseEquipment.Cable),
            ("Barbell Front Raise", ExerciseCategory.Push, ExerciseEquipment.Barbell),
            ("Dumbbell Front Raise", ExerciseCategory.Push, ExerciseEquipment.Dumbbell),

            ("Low-Bar Back Squat", ExerciseCategory.Legs, ExerciseEquipment.Barbell),
            ("Zercher Squat", ExerciseCategory.Legs, ExerciseEquipment.Barbell),
            ("Hack Squat", ExerciseCategory.Legs, ExerciseEquipment.Machine),
            ("Pendulum Squat", ExerciseCategory.Legs, ExerciseEquipment.Machine),
            ("Smith Machine Squat", ExerciseCategory.Legs, ExerciseEquipment.Machine),
            ("Bulgarian Split Squat", ExerciseCategory.Legs, ExerciseEquipment.Bodyweight),
            ("Walking Lunge", ExerciseCategory.Legs, ExerciseEquipment.Bodyweight),
            ("Reverse Lunge", ExerciseCategory.Legs, ExerciseEquipment.Bodyweight),
            ("Dumbbell Step-Up", ExerciseCategory.Legs, ExerciseEquipment.Dumbbell),
            ("Seated Leg Extension", ExerciseCategory.Legs, ExerciseEquipment.Machine),
            ("Sissy Squat", ExerciseCategory.Legs, ExerciseEquipment.Bodyweight),
            ("Smith Machine Hip Thrust", ExerciseCategory.Legs, ExerciseEquipment.Machine),
            ("Glute Drive Machine", ExerciseCategory.Legs, ExerciseEquipment.Machine),
            ("Single-Leg Hip Thrust", ExerciseCategory.Legs, ExerciseEquipment.Bodyweight),
            ("Dumbbell Romanian Deadlift", ExerciseCategory.Legs, ExerciseEquipment.Dumbbell),
            ("B-Stance Romanian Deadlift", ExerciseCategory.Legs, ExerciseEquipment.Barbell),
            ("Standing Single-Leg Curl", ExerciseCategory.Legs, ExerciseEquipment.Machine),
            ("Standing Calf Raise", ExerciseCategory.Legs, ExerciseEquipment.Machine),
            ("Leg Press Calf Raise", ExerciseCategory.Legs, ExerciseEquipment.Machine),

            ("EZ-Bar Preacher Curl", ExerciseCategory.Pull, ExerciseEquipment.Barbell),
            ("Single-Arm Dumbbell Preacher Curl", ExerciseCategory.Pull, ExerciseEquipment.Dumbbell),
            ("Machine Preacher Curl", ExerciseCategory.Pull, ExerciseEquipment.Machine),
            ("Incline Dumbbell Curl", ExerciseCategory.Pull, ExerciseEquipment.Dumbbell),
            ("Concentration Curl", ExerciseCategory.Pull, ExerciseEquipment.Dumbbell),
            ("Spider Curl", ExerciseCategory.Pull, ExerciseEquipment.Dumbbell),
            ("Standing Dumbbell Hammer Curl", ExerciseCategory.Pull, ExerciseEquipment.Dumbbell),
            ("Seated Dumbbell Hammer Curl", ExerciseCategory.Pull, ExerciseEquipment.Dumbbell),
            ("Cable Rope Hammer Curl", ExerciseCategory.Pull, ExerciseEquipment.Cable),
            ("Reverse Grip Barbell Curl", ExerciseCategory.Pull, ExerciseEquipment.Barbell),
            ("Low Pulley Cable Curl", ExerciseCategory.Pull, ExerciseEquipment.Cable),
            ("High Cable Curl", ExerciseCategory.Pull, ExerciseEquipment.Cable),
            ("Cable Rope Pushdown", ExerciseCategory.Push, ExerciseEquipment.Cable),
            ("Reverse Grip Cable Pushdown", ExerciseCategory.Push, ExerciseEquipment.Cable),
            ("Skull Crusher", ExerciseCategory.Push, ExerciseEquipment.Barbell),
            ("Incline Skull Crusher", ExerciseCategory.Push, ExerciseEquipment.Barbell),
            ("Decline Skull Crusher", ExerciseCategory.Push, ExerciseEquipment.Barbell),
            ("Overhead Dumbbell Triceps Extension", ExerciseCategory.Push, ExerciseEquipment.Dumbbell),
            ("Close-Grip Bench Press", ExerciseCategory.Push, ExerciseEquipment.Barbell),
            ("Bench Dips", ExerciseCategory.Push, ExerciseEquipment.Bodyweight),

            ("Crunch", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Decline Bench Crunch", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Kneeling Cable Crunch", ExerciseCategory.Other, ExerciseEquipment.Cable),
            ("Hanging Leg Raise", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Hanging Knee Raise", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Captain's Chair Leg Raise", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Lying Leg Raise", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Reverse Crunch", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Plank", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Cable Pallof Press", ExerciseCategory.Other, ExerciseEquipment.Cable),
            ("Russian Twist", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),

            // #207: göğüs destekli makine row varyasyonları.
            ("Chest-Supported Wide-Grip Machine Row", ExerciseCategory.Pull, ExerciseEquipment.Machine),
            ("Chest-Supported Close-Grip Machine Row", ExerciseCategory.Pull, ExerciseEquipment.Machine),

            // #335: mevcut "Machine Chest Press" (Id 74) pin-loaded; bu ayrı bir makine türü.
            ("Plate Loaded Chest Press", ExerciseCategory.Push, ExerciseEquipment.Machine),

            // #397: squeeze press ayri bir hareket -- dumbbell'lar hareket boyunca birbirine bastirilir.
            ("Dumbbell Squeeze Press", ExerciseCategory.Push, ExerciseEquipment.Dumbbell),

            // #346: ağırlıksız karın/çekirdek hareketleri (tekrar) ve tutuşlar (süre).
            ("Bicycle Crunch", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Side Crunch", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Sit-up", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("V-up", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Heel Touch", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Toe Touch", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Flutter Kicks", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Scissor Kicks", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Mountain Climber", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Dead Bug", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Bird Dog", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Jackknife Sit-up", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Windshield Wiper", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Dragon Flag", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Hollow Body Hold", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("L-Sit", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Dead Hang", ExerciseCategory.Other, ExerciseEquipment.Bodyweight),
            ("Wall Sit", ExerciseCategory.Legs, ExerciseEquipment.Bodyweight)
        ];

        var actual = Seed()
            .OrderBy(row => (long)row["Id"]!)
            .Select(row => ((string)row["Name"]!, (ExerciseCategory)row["Category"]!,
                (ExerciseEquipment)row["Equipment"]!))
            .ToArray();

        Assert.Equal(expected, actual);
    }

    [Fact]
    public void Takma_adi_olan_dort_egzersiz_beklenenle_birebir_eslesir()
    {
        // #335: "Aynısı varsa iki isimle de aranabilir" kararı — takma isimler tek yerde sabitlenir,
        // AlternateName kolonu üzerinden aramaya girer (bkz. packages/shared/src/lib/egzersizler.ts).
        (long Id, string AlternateName)[] expected =
        [
            (43L, "Over Head Rope Extension"),
            (72L, "Smith Machine Low Incline Press"),
            (83L, "Chest Fly Machine"),
            (111L, "Dumbell Lateral Raise"),
        ];

        // Satırın anonim nesnesi AlternateName'i hiç belirtmediyse GetSeedData() sözlüğünde
        // anahtarın kendisi YOKTUR (değer null değil, key absent) -- doğrudan indexlemek atar.
        var actual = Seed()
            .Where(row => row.TryGetValue("AlternateName", out var deger) && deger is not null)
            .OrderBy(row => (long)row["Id"]!)
            .Select(row => ((long)row["Id"]!, (string)row["AlternateName"]!))
            .ToArray();

        Assert.Equal(expected, actual);
    }

    [Fact]
    public void Tekrar_ve_sure_olculen_egzersizler_beklenenle_birebir_eslesir()
    {
        // #346: ölçüm tipi set girişinin hangi alanları çizeceğini ve rekor kuralını belirler. Listede
        // olmayan her global egzersiz kilo + tekrar (WeightReps) ile ölçülür. Pull-up/Dips/Push-up
        // bilerek burada DEĞİL: onların kilolu (weighted) varyasyonu yaygın.
        (long Id, ExerciseMeasurement Measurement)[] expected =
        [
            (20L, ExerciseMeasurement.Reps),      // Ab Rollout
            (61L, ExerciseMeasurement.Duration),  // Side Plank
            (62L, ExerciseMeasurement.Reps),      // Side Plank Rotation
            (160L, ExerciseMeasurement.Reps),     // Crunch
            (161L, ExerciseMeasurement.Reps),     // Decline Bench Crunch
            (163L, ExerciseMeasurement.Reps),     // Hanging Leg Raise
            (164L, ExerciseMeasurement.Reps),     // Hanging Knee Raise
            (165L, ExerciseMeasurement.Reps),     // Captain's Chair Leg Raise
            (166L, ExerciseMeasurement.Reps),     // Lying Leg Raise
            (167L, ExerciseMeasurement.Reps),     // Reverse Crunch
            (168L, ExerciseMeasurement.Duration), // Plank
            (170L, ExerciseMeasurement.Reps),     // Russian Twist
            .. Enumerable.Range(175, 14).Select(id => ((long)id, ExerciseMeasurement.Reps)),
            .. Enumerable.Range(189, 4).Select(id => ((long)id, ExerciseMeasurement.Duration)),
        ];

        var actual = Seed()
            .Select(row => ((long)row["Id"]!, (ExerciseMeasurement)row["Measurement"]!))
            .Where(x => x.Item2 != ExerciseMeasurement.WeightReps)
            .OrderBy(x => x.Item1)
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
