using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class WorkoutHistoryServiceTests
{
    private sealed class StubCurrentUser(long userId) : ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    private static async Task<(AppDbContext Context, User User, Exercise Exercise,
        WorkoutHistoryService Service, IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var service = new WorkoutHistoryService(
            new WorkoutSessionRepository(context), new SetEntryRepository(context),
            new ExerciseRepository(context), new StubCurrentUser(user.Id));

        return (context, user, exercise, service, transaction);
    }

    /// <summary>Verilen UTC anında başlayan, verilen setleri taşıyan bir oturum kurar.</summary>
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

    private static readonly DateTime An = new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task Gecmis_oturumu_setleriyle_dondurur()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, An, (100m, 8), (60m, 10));
            await context.SaveChangesAsync();

            var sayfa = await service.GetAsync(new HistoryQuery());

            var oturum = Assert.Single(sayfa.Items);
            Assert.Equal(2, oturum.Sets.Count);
            Assert.Equal(exercise.Name, oturum.Sets[0].ExerciseName);
        }
    }

    /// <summary>Issue #73: kapanmış oturumda süre saniye cinsinden hesaplanır.</summary>
    [Fact]
    public async Task Kapanmis_oturumun_suresi_hesaplanir()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var oturum = Seed(context, user, exercise, An, (100m, 8));
            oturum.EndedAt = An.AddMinutes(45);
            await context.SaveChangesAsync();

            var sonuc = Assert.Single((await service.GetAsync(new HistoryQuery())).Items);

            Assert.Equal(45 * 60, sonuc.DurationSeconds);
        }
    }

    /// <summary>Issue #73 Karar 1: açık oturumda (EndedAt null) süre hesaplanamaz -- null döner.</summary>
    [Fact]
    public async Task Acik_oturumun_suresi_nulldur()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, An, (100m, 8));
            await context.SaveChangesAsync();

            var sonuc = Assert.Single((await service.GetAsync(new HistoryQuery())).Items);

            Assert.Null(sonuc.DurationSeconds);
        }
    }

    [Fact]
    public async Task Oturum_toplam_hacmi_setlerden_hesaplanir()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, An, (100m, 8), (60m, 10));
            await context.SaveChangesAsync();

            var oturum = Assert.Single((await service.GetAsync(new HistoryQuery())).Items);

            Assert.Equal(100m * 8 + 60m * 10, oturum.TotalVolume);   // 1400
            Assert.Equal(2, oturum.SetCount);
        }
    }

    [Fact]
    public async Task Sayfa_zarfi_toplam_sayfa_sayisini_turetir()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            for (var gun = 0; gun < 3; gun++)
            {
                Seed(context, user, exercise, An.AddDays(gun), (100m, 8));
            }
            await context.SaveChangesAsync();

            var sayfa = await service.GetAsync(new HistoryQuery { PageSize = 2 });

            Assert.Equal(2, sayfa.Items.Count);
            Assert.Equal(3, sayfa.TotalCount);
            Assert.Equal(2, sayfa.TotalPages);   // 3 satır / 2 = 2 sayfa (yukarı yuvarlama)
            Assert.Equal(1, sayfa.Page);
        }
    }

    [Fact]
    public async Task Ikinci_sayfa_kalan_satirlari_dondurur()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            for (var gun = 0; gun < 3; gun++)
            {
                Seed(context, user, exercise, An.AddDays(gun), (100m, 8));
            }
            await context.SaveChangesAsync();

            var sayfa = await service.GetAsync(new HistoryQuery { Page = 2, PageSize = 2 });

            Assert.Single(sayfa.Items);
            Assert.Equal(3, sayfa.TotalCount);
        }
    }

    /// <summary>
    /// Tarihler TR yerel GÜNÜ. TR 10 Mart 23:00 = UTC 10 Mart 20:00; "10 Mart" filtresi bu
    /// antrenmanı YAKALAMALI. UTC gününe göre filtrelenseydi de yakalardı — asıl ayrım bir
    /// sonraki testte.
    /// </summary>
    [Fact]
    public async Task Tarih_filtresi_TR_gunune_gore_calisir()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, new DateTime(2026, 3, 10, 20, 0, 0, DateTimeKind.Utc), (100m, 8));
            await context.SaveChangesAsync();

            var sayfa = await service.GetAsync(new HistoryQuery
            {
                From = new DateOnly(2026, 3, 10), To = new DateOnly(2026, 3, 10)
            });

            Assert.Single(sayfa.Items);
        }
    }

    /// <summary>
    /// AYIRT EDİCİ TEST: TR 10 Mart 23:30 = UTC 10 Mart 20:30 değil, TR 11 Mart 00:30 = UTC
    /// 10 Mart 21:30'dur. UTC gününe göre filtrelenirse bu antrenman "10 Mart"a düşer ve
    /// kullanıcı onu yanlış günde görür.
    /// </summary>
    [Fact]
    public async Task Gece_yarisini_asan_antrenman_dogru_TR_gunune_duser()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            // UTC 10 Mart 21:30 = TR 11 Mart 00:30
            Seed(context, user, exercise, new DateTime(2026, 3, 10, 21, 30, 0, DateTimeKind.Utc), (100m, 8));
            await context.SaveChangesAsync();

            var onuncu = await service.GetAsync(new HistoryQuery
            {
                From = new DateOnly(2026, 3, 10), To = new DateOnly(2026, 3, 10)
            });
            var onbirinci = await service.GetAsync(new HistoryQuery
            {
                From = new DateOnly(2026, 3, 11), To = new DateOnly(2026, 3, 11)
            });

            Assert.Empty(onuncu.Items);
            Assert.Single(onbirinci.Items);
        }
    }

    /// <summary>
    /// LOAD-BEARING (spec Karar 8): egzersiz filtresi verildiğinde toplamlar da filtreye tabi.
    /// Aksi halde ekranda "3 set / 2200 kg" yazarken listede tek set görünürdü.
    /// </summary>
    [Fact]
    public async Task Egzersiz_filtresinde_toplamlar_da_filtreye_tabidir()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerEgzersiz = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            context.Add(digerEgzersiz);
            await context.SaveChangesAsync();

            var session = Seed(context, user, exercise, An, (100m, 8));
            context.Add(new SetEntry
            {
                WorkoutSession = session, Exercise = digerEgzersiz,
                Weight = 50m, Reps = 20, RecordType = RecordType.None, CreatedAt = An
            });
            await context.SaveChangesAsync();

            var sayfa = await service.GetAsync(new HistoryQuery { ExerciseId = exercise.Id });

            var oturum = Assert.Single(sayfa.Items);
            Assert.Equal(1, oturum.SetCount);
            Assert.Equal(800m, oturum.TotalVolume);            // 100 × 8, diğer egzersiz HARİÇ
            Assert.Equal(exercise.Id, Assert.Single(oturum.Sets).ExerciseId);
        }
    }

    [Fact]
    public async Task Baskasinin_egzersiziyle_filtrelenemez()
    {
        var (context, _, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, $"Egzersiz {Guid.NewGuid():N}");
            context.AddRange(digerKullanici, digerEgzersiz);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.GetAsync(new HistoryQuery { ExerciseId = digerEgzersiz.Id }));
        }
    }

    [Fact]
    public async Task Baskasinin_oturumlari_gecmiste_gorunmez()
    {
        var (context, _, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            context.Add(digerKullanici);
            await context.SaveChangesAsync();

            Seed(context, digerKullanici, exercise, An, (100m, 8));
            await context.SaveChangesAsync();

            var sayfa = await service.GetAsync(new HistoryQuery());

            Assert.Empty(sayfa.Items);
            Assert.Equal(0, sayfa.TotalCount);
        }
    }

    [Fact]
    public async Task Ters_tarih_araligi_reddedilir()
    {
        var (_, _, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(
                () => service.GetAsync(new HistoryQuery
                {
                    From = new DateOnly(2026, 3, 10), To = new DateOnly(2026, 3, 1)
                }));
        }
    }

    /// <summary>Sonuç yoksa 404 değil, boş sayfa: sorgu geçerli, sonuç boş.</summary>
    [Fact]
    public async Task Sonuc_yoksa_bos_sayfa_doner()
    {
        var (_, _, _, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            var sayfa = await service.GetAsync(new HistoryQuery());

            Assert.Empty(sayfa.Items);
            Assert.Equal(0, sayfa.TotalCount);
            Assert.Equal(0, sayfa.TotalPages);
        }
    }

    /// <summary>
    /// REGRESYON: <c>(Page - 1) * PageSize</c> denetimsiz (unchecked) <c>int</c> çarpımıyla
    /// hesaplanıyordu. <c>Page = int.MaxValue</c> — <c>[Range(1, int.MaxValue)]</c>'a göre
    /// GEÇERLİ bir istek — bu çarpımı taşırıp negatif bir <c>skip</c> üretiyordu; bu da
    /// Postgres'e negatif bir <c>OFFSET</c> olarak gidip "OFFSET must not be negative" ile
    /// patlıyordu (yakalanmamış exception → 500). Sayfanın sonunu fazlasıyla aşan geçerli bir
    /// sayfa numarası, her zaman olduğu gibi boş bir sayfa (200) döndürmeli.
    /// </summary>
    [Fact]
    public async Task Cok_buyuk_sayfa_numarasi_bos_sayfa_doner()
    {
        var (context, user, exercise, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Seed(context, user, exercise, An, (100m, 8));
            await context.SaveChangesAsync();

            var sayfa = await service.GetAsync(new HistoryQuery { Page = int.MaxValue });

            Assert.Empty(sayfa.Items);
            Assert.Equal(1, sayfa.TotalCount);
        }
    }
}
