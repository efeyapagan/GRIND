using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Stats;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class ExerciseProgressServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    /// <summary>TR 12 Mart 20:00 (UTC 17:00) — gün sınırından güvenli uzaklıkta.</summary>
    private static DateTime Gun => new(2026, 3, 12, 17, 0, 0, DateTimeKind.Utc);

    private static async Task<(AppDbContext Context, User User, Exercise Exercise,
        ExerciseProgressService Service, IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var service = new ExerciseProgressService(
            new ExerciseRepository(context), new SetEntryRepository(context), new StubCurrentUser(user.Id));

        return (context, user, exercise, service, transaction);
    }

    private static WorkoutSession Seed(
        AppDbContext context, User user, Exercise exercise, DateTime startedAtUtc,
        params (decimal Weight, int Reps)[] sets)
    {
        var session = TestDatabase.NewSession(user);
        session.StartedAt = startedAtUtc;
        context.Add(session);

        foreach (var (weight, reps) in sets)
        {
            context.Add(new SetEntry
            {
                WorkoutSession = session, Exercise = exercise,
                Weight = weight, Reps = reps, RecordType = RecordType.None, CreatedAt = startedAtUtc
            });
        }

        return session;
    }

    [Fact]
    public async Task Oturum_basina_en_agir_set_hacim_ve_tahmini_1RM_doner()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var oturum = Seed(context, user, exercise, Gun, (100m, 5), (100m, 8), (90m, 10));
            await context.SaveChangesAsync();

            var sonuc = await service.GetAsync(exercise.Id, new StatsRangeQuery());

            Assert.Equal(exercise.Id, sonuc.ExerciseId);
            Assert.Equal(exercise.Name, sonuc.ExerciseName);
            var nokta = Assert.Single(sonuc.Points);
            Assert.Equal(oturum.Id, nokta.SessionId);
            Assert.Equal(100m, nokta.TopWeight);
            // Eşit ağırlıkta çok tekrarlı set "en ağır set" sayılır.
            Assert.Equal(8, nokta.TopWeightReps);
            Assert.Equal(2200m, nokta.Volume);
            Assert.Equal(3, nokta.SetCount);
            // 100×5 → 112.5, 100×8 → 124.14, 90×10 → 120: en büyüğü.
            Assert.Equal(124.14m, nokta.EstimatedOneRepMax);
        }
    }

    [Fact]
    public async Task Noktalar_eskiden_yeniye_siralanir()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Gun, (60m, 5));
            Seed(context, user, exercise, Gun.AddDays(-3), (50m, 5));
            await context.SaveChangesAsync();

            var sonuc = await service.GetAsync(exercise.Id, new StatsRangeQuery());

            Assert.Equal([new DateOnly(2026, 3, 9), new DateOnly(2026, 3, 12)], sonuc.Points.Select(p => p.Date));
        }
    }

    [Fact]
    public async Task Tahmin_edilemeyen_setlerde_1RM_null_olur()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Gun, (0m, 10), (50m, 15));
            await context.SaveChangesAsync();

            var sonuc = await service.GetAsync(exercise.Id, new StatsRangeQuery());

            Assert.Null(Assert.Single(sonuc.Points).EstimatedOneRepMax);
        }
    }

    /// <summary>Aralık oturumun BAŞLANGICINA göre (Faz 9 Karar 7), setin CreatedAt'ine göre değil.</summary>
    [Fact]
    public async Task Aralik_oturum_baslangicina_gore_filtrelenir()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Gun.AddDays(-10), (50m, 5));
            Seed(context, user, exercise, Gun, (60m, 5));
            await context.SaveChangesAsync();

            var sonuc = await service.GetAsync(exercise.Id, new StatsRangeQuery { From = new DateOnly(2026, 3, 10) });

            Assert.Equal(new DateOnly(2026, 3, 12), Assert.Single(sonuc.Points).Date);
        }
    }

    [Fact]
    public async Task Gece_yarisini_asan_oturumun_gunu_TR_gunudur()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            // UTC 21:30 → TR (UTC+3) 00:30, ertesi gün.
            Seed(context, user, exercise, new DateTime(2026, 3, 12, 21, 30, 0, DateTimeKind.Utc), (60m, 5));
            await context.SaveChangesAsync();

            var sonuc = await service.GetAsync(exercise.Id, new StatsRangeQuery());

            Assert.Equal(new DateOnly(2026, 3, 13), Assert.Single(sonuc.Points).Date);
        }
    }

    [Fact]
    public async Task Baskasinin_ozel_egzersizi_404_verir()
    {
        var (context, _, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, $"Ozel {Guid.NewGuid():N}");
            context.AddRange(digerKullanici, digerEgzersiz);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.GetAsync(digerEgzersiz.Id, new StatsRangeQuery()));
        }
    }

    /// <summary>Global egzersiz herkese görünür ama noktalar yalnızca çağıranın setlerinden oluşur.</summary>
    [Fact]
    public async Task Global_egzersizde_baskasinin_setleri_noktalara_girmez()
    {
        var (context, user, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var global = await context.Exercises.FindAsync(1L);
            var digerKullanici = TestDatabase.NewUser();
            context.Add(digerKullanici);
            Seed(context, digerKullanici, global!, Gun, (200m, 5));
            Seed(context, user, global!, Gun, (60m, 5));
            await context.SaveChangesAsync();

            var sonuc = await service.GetAsync(1L, new StatsRangeQuery());

            Assert.Equal(60m, Assert.Single(sonuc.Points).TopWeight);
        }
    }

    /// <summary>
    /// Issue #230: pozisyon `SessionExercise.OrderIndex`'ten DEĞİL, oturumdaki İLK setin
    /// `CreatedAt`'inden gelir -- hedef egzersizin id'si diğerinden küçük olsa da (id sırası değil,
    /// fiilen NE ZAMAN YAPILDIĞI sırası) pozisyonu belirleyen budur.
    /// </summary>
    [Fact]
    public async Task Pozisyon_oturumdaki_tum_hareketlerin_ilk_set_zamanina_gore_hesaplanir()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerEgzersiz = TestDatabase.NewExercise(user, $"Squat {Guid.NewGuid():N}");
            context.Add(digerEgzersiz);

            var oturum = TestDatabase.NewSession(user);
            oturum.StartedAt = Gun;
            context.Add(oturum);

            // Diger egzersiz ONCE yapildi (daha erken CreatedAt) -- hedef egzersiz o gun 2. sirada.
            context.Add(new SetEntry
            {
                WorkoutSession = oturum, Exercise = digerEgzersiz,
                Weight = 100m, Reps = 5, RecordType = RecordType.None, CreatedAt = Gun,
            });
            context.Add(new SetEntry
            {
                WorkoutSession = oturum, Exercise = exercise,
                Weight = 60m, Reps = 8, RecordType = RecordType.None, CreatedAt = Gun.AddMinutes(10),
            });
            await context.SaveChangesAsync();

            var sonuc = await service.GetAsync(exercise.Id, new StatsRangeQuery());

            Assert.Equal(2, Assert.Single(sonuc.Points).Position);
        }
    }

    /// <summary>
    /// Issue #230: `PositionChanged`, yalnızca KENDİSİNDEN ÖNCEKİ (kronolojik) noktaya göre --
    /// ilk nokta için her zaman `false` (kıyaslanacak önceki nokta yok).
    /// </summary>
    [Fact]
    public async Task PositionChanged_yalnizca_pozisyon_onceki_noktadan_farkliysa_true_olur()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerEgzersiz = TestDatabase.NewExercise(user, $"Squat {Guid.NewGuid():N}");
            context.Add(digerEgzersiz);

            // 1. oturum: hedef egzersiz TEK basina -- pozisyon 1.
            Seed(context, user, exercise, Gun.AddDays(-6), (55m, 8));

            // 2. oturum: diger egzersiz ONCE yapildi -- hedef egzersiz pozisyon 2 (degisti).
            var ikinciOturum = TestDatabase.NewSession(user);
            ikinciOturum.StartedAt = Gun.AddDays(-3);
            context.Add(ikinciOturum);
            context.Add(new SetEntry
            {
                WorkoutSession = ikinciOturum, Exercise = digerEgzersiz,
                Weight = 100m, Reps = 5, RecordType = RecordType.None, CreatedAt = Gun.AddDays(-3),
            });
            context.Add(new SetEntry
            {
                WorkoutSession = ikinciOturum, Exercise = exercise,
                Weight = 57.5m, Reps = 8, RecordType = RecordType.None, CreatedAt = Gun.AddDays(-3).AddMinutes(10),
            });

            // 3. oturum: hedef egzersiz yine TEK basina -- pozisyon 1 (degisti, 2.oturumdaki 2'den).
            Seed(context, user, exercise, Gun, (60m, 8));

            await context.SaveChangesAsync();

            var sonuc = await service.GetAsync(exercise.Id, new StatsRangeQuery());

            Assert.Equal([1, 2, 1], sonuc.Points.Select(p => p.Position));
            Assert.Equal([false, true, true], sonuc.Points.Select(p => p.PositionChanged));
        }
    }

    [Fact]
    public async Task Ters_aralik_reddedilir()
    {
        var (_, _, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(() => service.GetAsync(exercise.Id,
                new StatsRangeQuery { From = new DateOnly(2026, 3, 10), To = new DateOnly(2026, 3, 1) }));
        }
    }
}
