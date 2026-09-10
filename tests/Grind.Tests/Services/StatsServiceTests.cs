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
public class StatsServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    private sealed class SahteSaat(DateTime utcNow) : TimeProvider
    {
        public DateTime UtcNow { get; set; } = utcNow;
        public override DateTimeOffset GetUtcNow() => new(UtcNow, TimeSpan.Zero);
    }

    /// <summary>TR 12 Mart 20:00 (UTC 17:00) — "bugün" 12 Mart.</summary>
    private static DateTime Bugun => new(2026, 3, 12, 17, 0, 0, DateTimeKind.Utc);

    private static async Task<(AppDbContext Context, User User, Exercise Exercise,
        StatsService Service, SahteSaat Saat, IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var saat = new SahteSaat(Bugun);
        var service = new StatsService(
            new WorkoutSessionRepository(context), new SetEntryRepository(context),
            new StubCurrentUser(user.Id), saat);

        return (context, user, exercise, service, saat, transaction);
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

    // ---- Günlük hacim ----

    [Fact]
    public async Task Gunluk_hacim_gun_bazinda_toplanir()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Bugun, (100m, 8));
            Seed(context, user, exercise, Bugun.AddDays(-1), (60m, 10));
            await context.SaveChangesAsync();

            var ozet = await service.GetDailyVolumeAsync(new StatsRangeQuery());

            Assert.Equal(2, ozet.Items.Count);
            Assert.Equal(800m + 600m, ozet.TotalVolume);
            // Günler eskiden yeniye sıralı — grafik ekseni böyle çizilir.
            Assert.Equal(ozet.Items.Select(i => i.Date).Order(), ozet.Items.Select(i => i.Date));
        }
    }

    /// <summary>
    /// Aynı günde iki oturum (CLAUDE.md: sabah/akşam) tek güne toplanır ama SessionCount 2'dir.
    /// </summary>
    [Fact]
    public async Task Ayni_gunun_iki_oturumu_tek_gunde_toplanir()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Bugun, (100m, 8));
            Seed(context, user, exercise, Bugun.AddHours(2), (100m, 8));
            await context.SaveChangesAsync();

            var gun = Assert.Single((await service.GetDailyVolumeAsync(new StatsRangeQuery())).Items);

            Assert.Equal(2, gun.SessionCount);
            Assert.Equal(2, gun.SetCount);
            Assert.Equal(1600m, gun.Volume);
        }
    }

    /// <summary>
    /// AYIRT EDİCİ: UTC 21:30, TR'de ertesi gün 00:30'dur. Gün UTC'ye göre hesaplansaydı
    /// antrenman bir gün geriye yazılırdı.
    /// </summary>
    [Fact]
    public async Task Gece_yarisini_asan_antrenman_ertesi_TR_gunune_yazilir()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, new DateTime(2026, 3, 10, 21, 30, 0, DateTimeKind.Utc), (100m, 8));
            await context.SaveChangesAsync();

            var gun = Assert.Single((await service.GetDailyVolumeAsync(new StatsRangeQuery())).Items);

            Assert.Equal(new DateOnly(2026, 3, 11), gun.Date);
        }
    }

    [Fact]
    public async Task Gunluk_hacim_araliga_gore_filtrelenir()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Bugun, (100m, 8));
            Seed(context, user, exercise, Bugun.AddDays(-10), (60m, 10));
            await context.SaveChangesAsync();

            var ozet = await service.GetDailyVolumeAsync(new StatsRangeQuery
            {
                From = new DateOnly(2026, 3, 12), To = new DateOnly(2026, 3, 12)
            });

            Assert.Equal(800m, ozet.TotalVolume);
            Assert.Single(ozet.Items);
        }
    }

    [Fact]
    public async Task Ters_aralik_istatistikte_de_reddedilir()
    {
        var (_, _, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(
                () => service.GetDailyVolumeAsync(new StatsRangeQuery
                {
                    From = new DateOnly(2026, 3, 12), To = new DateOnly(2026, 3, 1)
                }));
        }
    }

    // ---- Egzersiz bazlı hacim ----

    [Fact]
    public async Task Egzersiz_hacmi_buyukten_kucuge_siralanir()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var hafif = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            context.Add(hafif);
            await context.SaveChangesAsync();

            var session = Seed(context, user, exercise, Bugun, (100m, 10));   // 1000
            context.Add(new SetEntry
            {
                WorkoutSession = session, Exercise = hafif,
                Weight = 20m, Reps = 10, RecordType = RecordType.None, CreatedAt = Bugun
            });                                                               // 200
            await context.SaveChangesAsync();

            var ozet = await service.GetVolumeByExerciseAsync(new StatsRangeQuery());

            Assert.Equal([1000m, 200m], ozet.Items.Select(i => i.Volume));
            Assert.Equal(1200m, ozet.TotalVolume);
            Assert.Equal(exercise.Name, ozet.Items[0].ExerciseName);
        }
    }

    [Fact]
    public async Task Egzersiz_hacmi_baskasinin_setlerini_saymaz()
    {
        var (context, _, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            context.Add(digerKullanici);
            await context.SaveChangesAsync();

            Seed(context, digerKullanici, exercise, Bugun, (100m, 8));
            await context.SaveChangesAsync();

            var ozet = await service.GetVolumeByExerciseAsync(new StatsRangeQuery());

            Assert.Empty(ozet.Items);
            Assert.Equal(0m, ozet.TotalVolume);
        }
    }

    // ---- Takvim ----

    [Fact]
    public async Task Takvim_antrenman_gunlerini_ve_seriyi_dondurur()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Bugun, (100m, 8));
            Seed(context, user, exercise, Bugun.AddDays(-1), (100m, 8));
            await context.SaveChangesAsync();

            var takvim = await service.GetCalendarAsync(new StatsRangeQuery());

            Assert.Equal(2, takvim.Days.Count);
            Assert.Equal(2, takvim.TrainedDayCount);
            Assert.Equal(2, takvim.CurrentStreak);
            Assert.Equal(2, takvim.LongestStreak);
        }
    }

    /// <summary>Seti olmayan oturum antrenman günü değildir (spec Karar 3).</summary>
    [Fact]
    public async Task Seti_olmayan_oturum_takvime_girmez()
    {
        var (context, user, _, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var bos = TestDatabase.NewSession(user);
            bos.StartedAt = Bugun;
            context.Add(bos);
            await context.SaveChangesAsync();

            var takvim = await service.GetCalendarAsync(new StatsRangeQuery());

            Assert.Empty(takvim.Days);
            Assert.Equal(0, takvim.CurrentStreak);
        }
    }

    /// <summary>
    /// LOAD-BEARING (spec Karar 5): seri ARALIKTAN BAĞIMSIZ, tüm geçmişten hesaplanır.
    /// Dar bir aralık sorulduğunda seri kırılmış görünmemeli — kullanıcı "bu ay" filtresinde
    /// 40 günlük serisini 1 olarak görmesin.
    /// </summary>
    [Fact]
    public async Task Dar_aralik_seriyi_kirmaz()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Bugun, (100m, 8));
            Seed(context, user, exercise, Bugun.AddDays(-1), (100m, 8));
            Seed(context, user, exercise, Bugun.AddDays(-2), (100m, 8));
            await context.SaveChangesAsync();

            var takvim = await service.GetCalendarAsync(new StatsRangeQuery
            {
                From = new DateOnly(2026, 3, 12), To = new DateOnly(2026, 3, 12)
            });

            Assert.Single(takvim.Days);          // aralık yalnızca bugünü kapsıyor
            Assert.Equal(1, takvim.TrainedDayCount);
            Assert.Equal(3, takvim.CurrentStreak);   // ama seri tüm geçmişten
        }
    }

    /// <summary>
    /// Bugün henüz antrenman yokken seri korunur (spec Karar 3) — saat bu yüzden enjekte
    /// ediliyor: gerçek saatle bu test yazılamazdı.
    /// </summary>
    [Fact]
    public async Task Bugun_antrenman_yokken_seri_korunur()
    {
        var (context, user, exercise, service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, Bugun.AddDays(-1), (100m, 8));
            Seed(context, user, exercise, Bugun.AddDays(-2), (100m, 8));
            await context.SaveChangesAsync();

            var takvim = await service.GetCalendarAsync(new StatsRangeQuery());

            Assert.Equal(2, takvim.CurrentStreak);
        }
    }
}
