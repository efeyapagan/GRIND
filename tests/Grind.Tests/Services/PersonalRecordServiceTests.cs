using Grind.Api.Data;
using Grind.Api.Common.Security;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Services;

/// <summary>
/// Rekor motorunun veriye bağlanan yüzü. Kritik sözleşme: HİÇBİR metot
/// SaveChangesAsync ÇAĞIRMAZ — commit sınırı çağıran serviste kalır ki
/// "set ekle + rekorları güncelle" tek bir unit of work olabilsin.
/// </summary>
[Trait("Category", "Database")]
public class PersonalRecordServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    private static readonly DateTime An = new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    private static async Task<(AppDbContext Context, User User, WorkoutSession Session,
        Exercise Exercise, PersonalRecordService Service, IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(user);
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, session, exercise);
        await context.SaveChangesAsync();

        var service = new PersonalRecordService(
            new SetEntryRepository(context), new StubCurrentUser(user.Id));

        return (context, user, session, exercise, service, transaction);
    }

    /// <summary>Setleri verilen sırayla, birer dakika arayla ekler.</summary>
    private static async Task<List<SetEntry>> SeedAsync(
        AppDbContext context, WorkoutSession session, Exercise exercise,
        params (decimal Weight, int Reps, RecordType Record)[] sets)
    {
        var eklenen = new List<SetEntry>();
        var dakika = 0;

        foreach (var (weight, reps, record) in sets)
        {
            var set = new SetEntry
            {
                WorkoutSession = session, Exercise = exercise,
                Weight = weight, Reps = reps, RecordType = record,
                CreatedAt = An.AddMinutes(dakika++)
            };
            context.Add(set);
            eklenen.Add(set);
        }

        await context.SaveChangesAsync();
        return eklenen;
    }

    /// <summary>
    /// RecordType tarihsel bir anlık görüntüdür (CLAUDE.md). Yeni bir set değerlendirilirken
    /// geçmiş satırlar YENİDEN YAZILMAMALI — aksi halde "o an rekordu" bilgisi kaybolur.
    /// </summary>
    [Fact]
    public async Task Yeni_set_degerlendirilirken_gecmis_satirlar_yeniden_yazilmaz()
    {
        var (context, _, session, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            // Bilerek YANLIŞ bir geçmiş: ikinci set aslında rekor değil ama Reps yazılmış.
            var setler = await SeedAsync(context, session, exercise,
                (100m, 8, RecordType.Weight), (100m, 6, RecordType.Reps));

            var sonuc = await service.EvaluateNewAsync(exercise.Id, 100m, 9);

            Assert.Equal(RecordType.Reps, sonuc);
            // Geçmişteki yanlış değer OLDUĞU GİBİ durmalı: EvaluateNewAsync düzeltmez.
            Assert.Equal(RecordType.Reps, setler[1].RecordType);
        }
    }

    [Fact]
    public async Task Ilk_set_agirlik_rekoru_olarak_degerlendirilir()
    {
        var (_, _, _, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Assert.Equal(RecordType.Weight, await service.EvaluateNewAsync(exercise.Id, 60m, 12));
        }
    }

    /// <summary>Yeniden hesap, geçmişteki her satırı sıfırdan yazar.</summary>
    [Fact]
    public async Task Yeniden_hesap_tum_satirlari_bastan_yazar()
    {
        var (context, _, session, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var setler = await SeedAsync(context, session, exercise,
                (60m, 12, RecordType.None), (80m, 10, RecordType.None), (80m, 11, RecordType.None));

            await service.RecalculateAsync(exercise.Id);

            Assert.Equal(
                new[] { RecordType.Weight, RecordType.Weight, RecordType.Reps },
                setler.Select(s => s.RecordType));
        }
    }

    /// <summary>
    /// SÖZLEŞME: RecalculateAsync SaveChangesAsync ÇAĞIRMAZ. Değişiklikler change tracker'da
    /// bekler; commit'i çağıran yapar. Bu test o sözleşmeyi kırmızıyla korur — servis bir gün
    /// içeride kaydetmeye başlarsa "kaydedilmemiş değişiklik var" iddiası düşer.
    /// </summary>
    [Fact]
    public async Task Yeniden_hesap_kaydetmez()
    {
        var (context, _, session, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await SeedAsync(context, session, exercise,
                (60m, 12, RecordType.None), (80m, 10, RecordType.None));

            await service.RecalculateAsync(exercise.Id);

            Assert.True(context.ChangeTracker.HasChanges());
            Assert.Equal(2, context.ChangeTracker.Entries<SetEntry>()
                .Count(e => e.State == EntityState.Modified));
        }
    }

    /// <summary>
    /// Bir set silinmek üzere işaretlendiğinde satır DB'de HÂLÂ durur ve sorguda geri gelir
    /// (EF identity map onu tracked hâliyle döndürür). Hariç tutulmazsa yeniden hesap silinen
    /// seti saymaya devam eder ve sonraki set rekora TERFİ ETMEZ — sessiz bir yanlışlık.
    /// </summary>
    [Fact]
    public async Task Yeniden_hesap_haric_tutulan_seti_saymaz()
    {
        var (context, _, session, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var setler = await SeedAsync(context, session, exercise,
                (100m, 8, RecordType.Weight), (90m, 10, RecordType.None));

            await service.RecalculateAsync(exercise.Id, excludeSetId: setler[0].Id);

            // 100'lük set yokmuş gibi: 90x10 artık ilk set, yani ağırlık rekoru.
            Assert.Equal(RecordType.Weight, setler[1].RecordType);
        }
    }

    /// <summary>
    /// Oturum silmenin karşılığı: CASCADE henüz DB'ye gitmemişken o oturumun setleri
    /// yok sayılmalı.
    /// </summary>
    [Fact]
    public async Task Yeniden_hesap_haric_tutulan_oturumu_saymaz()
    {
        var (context, user, session, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var ikinciOturum = TestDatabase.NewSession(user);
            context.Add(ikinciOturum);
            await context.SaveChangesAsync();

            await SeedAsync(context, session, exercise, (100m, 8, RecordType.Weight));

            var ikinciSet = new SetEntry
            {
                WorkoutSession = ikinciOturum, Exercise = exercise,
                Weight = 90m, Reps = 10, RecordType = RecordType.None, CreatedAt = An.AddHours(1)
            };
            context.Add(ikinciSet);
            await context.SaveChangesAsync();

            await service.RecalculateAsync(exercise.Id, excludeSessionId: session.Id);

            Assert.Equal(RecordType.Weight, ikinciSet.RecordType);
        }
    }

    [Fact]
    public async Task Yeniden_hesap_baskasinin_setlerine_dokunmaz()
    {
        var (context, _, _, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerOturum = TestDatabase.NewSession(digerKullanici);
            var digerSet = new SetEntry
            {
                WorkoutSession = digerOturum, Exercise = exercise,
                Weight = 500m, Reps = 1, RecordType = RecordType.None, CreatedAt = An
            };
            context.AddRange(digerKullanici, digerOturum, digerSet);
            await context.SaveChangesAsync();

            await service.RecalculateAsync(exercise.Id);

            // Aynı egzersiz, başka kullanıcı: dokunulmamalı (IDOR ve veri karışması).
            Assert.Equal(RecordType.None, digerSet.RecordType);
        }
    }

    [Fact]
    public async Task Rekor_ozeti_en_iyi_agirligi_ve_tekrari_bildirir()
    {
        var (context, _, session, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await SeedAsync(context, session, exercise,
                (100m, 8, RecordType.Weight), (60m, 20, RecordType.Weight), (100m, 9, RecordType.Reps));

            var ozet = await service.GetAllTimeAsync();
            var satir = Assert.Single(ozet, r => r.ExerciseId == exercise.Id);

            Assert.Equal(100m, satir.BestWeight);
            Assert.Equal(9, satir.BestWeightReps);      // 100 kg'daki en iyi tekrar
            Assert.Equal(20, satir.BestReps);
            Assert.Equal(60m, satir.BestRepsWeight);    // 20 tekrar 60 kg'da yapıldı
        }
    }

    /// <summary>
    /// İNVARYANT TESTİ: özet TÜM setlerden hesaplanır (bkz. spec düzeltme notu, 2026-09-10
    /// final inceleme) — "hiçbir maksimum yalnızca None satırlarda yaşayamaz" iddiası YANLIŞ
    /// çıktı: daha hafif bir ağırlıktaki İLK set, o ağırlıkta kıyaslanacak bir geçmiş
    /// olmadığı için None kalır ama yine de en çok tekrarı taşıyabilir (aşağıdaki 70 kg × 30
    /// seti, 100 kg zaten varken eklenmiş ve None'dır). Maksimumlar TÜM setlerden bağımsız
    /// olarak hesaplanıp özetle karşılaştırılıyor.
    /// </summary>
    [Fact]
    public async Task Rekor_ozeti_tum_setlerden_hesaplanan_maksimumlarla_ayni()
    {
        var (context, _, session, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var setler = await SeedAsync(context, session, exercise,
                (60m, 12, RecordType.None), (80m, 10, RecordType.None), (80m, 10, RecordType.None),
                (80m, 14, RecordType.None), (60m, 25, RecordType.None), (100m, 3, RecordType.None),
                // 100 kg zaten görülmüşken 70 kg'da İLK set: None kalır (Soru 1/A) ama
                // tüm setler arasında en çok tekrara sahip olan tam olarak bu set.
                (70m, 30, RecordType.None));

            await service.RecalculateAsync(exercise.Id);
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            var ozet = await service.GetAllTimeAsync();
            var satir = Assert.Single(ozet, r => r.ExerciseId == exercise.Id);

            Assert.Equal(setler.Max(s => s.Weight), satir.BestWeight);
            Assert.Equal(setler.Max(s => s.Reps), satir.BestReps);

            var enCokTekrarliSet = setler
                .OrderByDescending(s => s.Reps).ThenByDescending(s => s.Weight)
                .First();
            Assert.Equal(enCokTekrarliSet.Weight, satir.BestRepsWeight);
        }
    }

    /// <summary>
    /// KANIT (Finding 1, final inceleme): "hiçbir maksimum yalnızca None satırlarda
    /// yaşayamaz" iddiası bu senaryoda çöker. 100 kg × 8'den SONRA atılan 60 kg × 15'lik bir
    /// indirme seti, 60 kg'da hiç geçmiş olmadığı için None kalır (Soru 1/A) — ama 15 tekrar,
    /// tüm zamanların en çok tekrarıdır. Özet yalnızca rekor taşıyan satırları okursa bu
    /// tekrarı kaçırır ve BestReps'i 8 olarak bildirir.
    /// </summary>
    [Fact]
    public async Task Rekor_ozeti_hafif_agirlikta_ilk_setteki_en_cok_tekrari_kacirmaz()
    {
        var (context, _, session, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await SeedAsync(context, session, exercise,
                (100m, 8, RecordType.None), (60m, 15, RecordType.None));

            await service.RecalculateAsync(exercise.Id);
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            var ozet = await service.GetAllTimeAsync();
            var satir = Assert.Single(ozet, r => r.ExerciseId == exercise.Id);

            Assert.Equal(100m, satir.BestWeight);
            Assert.Equal(8, satir.BestWeightReps);
            Assert.Equal(15, satir.BestReps);
            Assert.Equal(60m, satir.BestRepsWeight);
            Assert.Equal(exercise.Name, satir.ExerciseName);
        }
    }

    [Fact]
    public async Task Rekor_ozeti_seti_olmayan_egzersizi_listelemez()
    {
        var (_, _, _, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var ozet = await service.GetAllTimeAsync();

            Assert.DoesNotContain(ozet, r => r.ExerciseId == exercise.Id);
        }
    }
}
