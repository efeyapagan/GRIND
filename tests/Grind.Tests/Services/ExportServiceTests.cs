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
public class ExportServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    private sealed class SahteSaat(DateTime utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(utcNow, TimeSpan.Zero);
    }

    /// <summary>TR 12 Mart 20:00 (UTC 17:00): "bugün" 12 Mart.</summary>
    private static readonly DateTime Simdi = new(2026, 3, 12, 17, 0, 0, DateTimeKind.Utc);

    private static async Task<(AppDbContext Context, User User, Exercise Exercise,
        IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        return (context, user, exercise, transaction);
    }

    /// <summary>
    /// GERÇEK bağımlılıklarla kurulur: özet gerçek StatsService'ten gelmeli ki "birebir aynı" testi
    /// anlamlı olsun. Sahte bir istatistik servisi, sabitlemek istediğimiz şeyi (aynı yol) atlardı.
    /// </summary>
    private static ExportService CreateService(AppDbContext context, long userId)
    {
        var currentUser = new StubCurrentUser(userId);
        var saat = new SahteSaat(Simdi);
        var sessions = new WorkoutSessionRepository(context);
        var sets = new SetEntryRepository(context);
        var bodyWeights = new BodyWeightLogRepository(context);

        return new ExportService(
            sessions,
            sets,
            bodyWeights,
            new StatsService(sessions, sets, bodyWeights, new UserRepository(context), currentUser, saat),
            new PersonalRecordService(sets, currentUser),
            currentUser,
            saat);
    }

    private static StatsService CreateStats(AppDbContext context, long userId) => new(
        new WorkoutSessionRepository(context), new SetEntryRepository(context),
        new BodyWeightLogRepository(context), new UserRepository(context), new StubCurrentUser(userId),
        new SahteSaat(Simdi));

    /// <summary>
    /// Verilen UTC anında başlayan bir oturum. Setlerin CreatedAt'i dakika dakika artar: sıra
    /// eklemeye (id atamasına) değil zamana dayansın.
    /// </summary>
    private static WorkoutSession Seed(
        AppDbContext context, User user, Exercise exercise, DateTime startedAtUtc,
        params (decimal Weight, int Reps)[] sets)
    {
        var session = TestDatabase.NewSession(user);
        session.StartedAt = startedAtUtc;
        context.Add(session);

        for (var i = 0; i < sets.Length; i++)
        {
            context.Add(new SetEntry
            {
                WorkoutSession = session, Exercise = exercise,
                Weight = sets[i].Weight, Reps = sets[i].Reps,
                RecordType = RecordType.None, CreatedAt = startedAtUtc.AddMinutes(i)
            });
        }

        return session;
    }

    private static void SeedWeight(AppDbContext context, User user, decimal weight, DateTime recordedAtUtc)
        => context.Add(new BodyWeightLog { User = user, Weight = weight, RecordedAt = recordedAtUtc });

    [Fact]
    public async Task Bolumler_birlikte_dolar()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Simdi.AddDays(-1), (100m, 8), (60m, 10));
            SeedWeight(context, user, 82.4m, Simdi.AddDays(-1));
            await context.SaveChangesAsync();
            // Veriler veritabanından okunmalı: Include eksikse egzersiz adı burada null kalır.
            context.ChangeTracker.Clear();

            var export = await CreateService(context, user.Id).GetAsync(new StatsRangeQuery());

            var oturum = Assert.Single(export.Sessions);
            Assert.Equal(2, oturum.Sets.Count);
            Assert.All(oturum.Sets, s => Assert.Equal(exercise.Name, s.ExerciseName));
            Assert.Equal(100m * 8 + 60m * 10, oturum.TotalVolume);
            Assert.Equal(82.4m, Assert.Single(export.BodyWeights).Weight);
            Assert.Equal(exercise.Id, Assert.Single(export.AllTimeRecords).ExerciseId);
            Assert.Equal(1, export.Summary.TrainedDayCount);
            Assert.Equal(2, export.Summary.SetCount);
            Assert.Equal(1400m, export.Summary.TotalVolume);
            Assert.Equal(exercise.Id, Assert.Single(export.Summary.VolumeByExercise).ExerciseId);
        }
    }

    /// <summary>
    /// AYIRT EDİCİ (spec Karar 4): export özeti kendi toplamını hesaplamaz, takvim ve egzersiz hacmi
    /// uçlarının AYNI yolundan gelir. Veri kasıtlı olarak zor: aynı günde iki oturum, TR gece
    /// yarısını aşan bir oturum, setsiz bir oturum ve iki egzersiz.
    /// </summary>
    [Fact]
    public async Task Ozet_takvim_ve_egzersiz_hacmi_uclariyla_birebir_aynidir()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            var ikinci = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            context.Add(ikinci);
            Seed(context, user, exercise, Simdi.AddDays(-2), (100m, 8), (60m, 10));   // TR 10 Mart 20:00
            Seed(context, user, ikinci, Simdi.AddDays(-2).AddHours(2), (40m, 12));     // TR 10 Mart 22:00
            Seed(context, user, exercise,
                new DateTime(2026, 3, 10, 21, 30, 0, DateTimeKind.Utc), (80m, 10));    // TR 11 Mart 00:30
            Seed(context, user, exercise, Simdi.AddDays(-1));                          // setsiz
            await context.SaveChangesAsync();

            var query = new StatsRangeQuery { From = new DateOnly(2026, 3, 1), To = new DateOnly(2026, 3, 12) };
            var export = await CreateService(context, user.Id).GetAsync(query);

            var stats = CreateStats(context, user.Id);
            var takvim = await stats.GetCalendarAsync(query);
            var egzersizBazli = await stats.GetVolumeByExerciseAsync(query);
            var gunluk = await stats.GetDailyVolumeAsync(query);

            Assert.Equal(takvim.TrainedDayCount, export.Summary.TrainedDayCount);
            Assert.Equal(takvim.Days.Sum(d => d.SessionCount), export.Summary.SessionCount);
            Assert.Equal(takvim.Days.Sum(d => d.SetCount), export.Summary.SetCount);
            Assert.Equal(gunluk.TotalVolume, export.Summary.TotalVolume);
            Assert.Equal(takvim.CurrentWeekStreak, export.Summary.CurrentWeekStreak);
            Assert.Equal(takvim.LongestWeekStreak, export.Summary.LongestWeekStreak);
            Assert.Equal(egzersizBazli.Items, export.Summary.VolumeByExercise);

            // Sabit değerler de: "ikisi aynı" demek, ikisinin BİRLİKTE yanlış olmasını yakalamaz.
            Assert.Equal(2, export.Summary.TrainedDayCount);     // 10 ve 11 Mart
            Assert.Equal(3, export.Summary.SessionCount);         // setsiz oturum sayılmaz
            Assert.Equal(800m + 600m + 480m + 800m, export.Summary.TotalVolume);
        }
    }

    [Fact]
    public async Task Setsiz_oturum_listede_var_ozette_yok()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Simdi.AddDays(-1), (100m, 5));
            var setsiz = Seed(context, user, exercise, Simdi);
            setsiz.Notes = "omuz ağrıdı, yapamadım";
            await context.SaveChangesAsync();

            var export = await CreateService(context, user.Id).GetAsync(new StatsRangeQuery());

            // Liste bir günlük: not AI için değerli (spec Karar 8). Özet bir antrenman özeti.
            Assert.Equal(2, export.Sessions.Count);
            var bos = Assert.Single(export.Sessions, s => s.SetCount == 0);
            Assert.Equal("omuz ağrıdı, yapamadım", bos.Notes);
            Assert.Empty(bos.Sets);
            Assert.Equal(1, export.Summary.SessionCount);
        }
    }

    [Fact]
    public async Task Rekorlar_araliktan_bagimsizdir()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Simdi.AddDays(-30), (120m, 3));
            Seed(context, user, exercise, Simdi, (100m, 5));
            await context.SaveChangesAsync();

            var export = await CreateService(context, user.Id)
                .GetAsync(new StatsRangeQuery { From = new DateOnly(2026, 3, 12) });

            Assert.Single(export.Sessions);   // yalnızca aralıktaki oturum
            var rekor = Assert.Single(export.AllTimeRecords);
            Assert.Equal(120m, rekor.BestWeight);   // aralık DIŞINDAKİ set (spec Karar 2)
        }
    }

    [Fact]
    public async Task Oturumlar_ve_tartilar_eskiden_yeniye_gelir_aralik_disini_almaz()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            // Bilerek ters sırada eklenir: sıra eklemeden değil sorgudan gelmeli.
            Seed(context, user, exercise, Simdi, (100m, 5));
            Seed(context, user, exercise, Simdi.AddDays(-1), (100m, 5));
            Seed(context, user, exercise, Simdi.AddDays(-10), (100m, 5));   // aralık dışı
            SeedWeight(context, user, 81m, Simdi);
            SeedWeight(context, user, 82m, Simdi.AddDays(-1));
            SeedWeight(context, user, 90m, Simdi.AddDays(-10));             // aralık dışı
            await context.SaveChangesAsync();

            var export = await CreateService(context, user.Id)
                .GetAsync(new StatsRangeQuery { From = new DateOnly(2026, 3, 11) });

            Assert.Equal(new[] { Simdi.AddDays(-1), Simdi }, export.Sessions.Select(s => s.StartedAt));
            Assert.Equal(new[] { 82m, 81m }, export.BodyWeights.Select(b => b.Weight));
        }
    }

    [Fact]
    public async Task Baskasinin_verisi_hicbir_bolumde_gorunmez()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            var davetsiz = TestDatabase.NewUser();
            context.Add(davetsiz);
            Seed(context, user, exercise, Simdi, (100m, 5));
            SeedWeight(context, user, 82m, Simdi);
            await context.SaveChangesAsync();

            var export = await CreateService(context, davetsiz.Id).GetAsync(new StatsRangeQuery());

            Assert.Empty(export.Sessions);
            Assert.Empty(export.BodyWeights);
            Assert.Empty(export.AllTimeRecords);
            Assert.Empty(export.Summary.VolumeByExercise);
            Assert.Equal(0, export.Summary.SetCount);
        }
    }

    /// <summary>Verisi olmayan kullanıcı 404 değil, boş ama geçerli bir export alır.</summary>
    [Fact]
    public async Task Verisiz_kullanici_bos_ama_gecerli_export_alir()
    {
        var (context, user, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var export = await CreateService(context, user.Id).GetAsync(new StatsRangeQuery());

            Assert.Empty(export.Sessions);
            Assert.Empty(export.BodyWeights);
            Assert.Empty(export.AllTimeRecords);
            Assert.Equal(0, export.Summary.TrainedDayCount);
            Assert.Equal(0, export.Summary.SessionCount);
            Assert.Equal(0m, export.Summary.TotalVolume);
            Assert.Equal(0, export.Summary.CurrentWeekStreak);
            Assert.Equal(0, export.Summary.LongestWeekStreak);
        }
    }

    [Fact]
    public async Task Olusturulma_ani_saatten_gelir_aralik_yansitilir()
    {
        var (context, user, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var query = new StatsRangeQuery { From = new DateOnly(2026, 3, 1), To = new DateOnly(2026, 3, 31) };

            var export = await CreateService(context, user.Id).GetAsync(query);

            Assert.Equal(Simdi, export.GeneratedAt);
            Assert.Equal(DateTimeKind.Utc, export.GeneratedAt.Kind);
            Assert.Equal(query.From, export.From);
            Assert.Equal(query.To, export.To);
        }
    }

    /// <summary>Metin ayrı sorgulardan değil, JSON modelinin kendisinden üretilir (spec Karar 3).</summary>
    [Fact]
    public async Task Metin_ayni_modelin_formatlanmis_halidir()
    {
        var (context, user, exercise, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Simdi, (100m, 5));
            SeedWeight(context, user, 82m, Simdi);
            await context.SaveChangesAsync();

            var service = CreateService(context, user.Id);
            var query = new StatsRangeQuery();

            Assert.Equal(
                ExportTextFormatter.Format(await service.GetAsync(query)),
                await service.GetTextAsync(query));
        }
    }

    [Fact]
    public async Task Ters_aralik_400_verir()
    {
        var (context, user, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var service = CreateService(context, user.Id);

            await Assert.ThrowsAsync<ValidationException>(() => service.GetAsync(
                new StatsRangeQuery { From = new DateOnly(2026, 3, 10), To = new DateOnly(2026, 3, 1) }));
        }
    }
}
