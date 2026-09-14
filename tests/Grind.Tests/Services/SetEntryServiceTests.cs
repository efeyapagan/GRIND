using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class SetEntryServiceTests
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

    /// <summary>TR 20:00 (UTC 17:00) — gün sınırından güvenli uzaklıkta.</summary>
    private static DateTime VarsayilanAn => new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    private static async Task<(AppDbContext Context, User User, Exercise Exercise,
        SetEntryService Service, IWorkoutSessionService SessionService, SahteSaat Saat,
        IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var saat = new SahteSaat(VarsayilanAn);
        var currentUser = new StubCurrentUser(user.Id);
        var unitOfWork = new UnitOfWork(context);
        var setRepository = new SetEntryRepository(context);
        var sessionRepository = new WorkoutSessionRepository(context);

        var recordService = new PersonalRecordService(setRepository, currentUser);
        var sessionService = new WorkoutSessionService(
            sessionRepository, new WorkoutTemplateRepository(context), setRepository,
            new SessionExerciseRepository(context), new ExerciseRepository(context),
            unitOfWork, currentUser, saat, recordService);

        var service = new SetEntryService(
            setRepository, new ExerciseRepository(context), sessionRepository,
            sessionService, recordService, unitOfWork, currentUser, saat);

        return (context, user, exercise, service, sessionService, saat, transaction);
    }

    private static CreateSetRequest Yeni(long exerciseId, decimal weight, int reps) =>
        new() { ExerciseId = exerciseId, Weight = weight, Reps = reps };

    // ---- Ekleme ----

    [Fact]
    public async Task Ilk_set_agirlik_rekoru_olarak_kaydedilir()
    {
        var (_, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eklenen = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));

            Assert.Equal(RecordType.Weight, eklenen.RecordType);
            Assert.Equal(exercise.Name, eklenen.ExerciseName);
            Assert.True(eklenen.SessionId > 0);
        }
    }

    /// <summary>Açık oturum yoksa set ekleme onu kendisi açar (CLAUDE.md).</summary>
    [Fact]
    public async Task Acik_oturum_yoksa_set_ekleme_oturum_acar()
    {
        var (context, user, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            Assert.Equal(0, await context.Set<WorkoutSession>().CountAsync(s => s.UserId == user.Id));

            await service.CreateAsync(Yeni(exercise.Id, 100m, 8));

            Assert.Equal(1, await context.Set<WorkoutSession>().CountAsync(s => s.UserId == user.Id));
        }
    }

    /// <summary>İkinci set yeni bir oturum AÇMAZ — aynı açık oturuma düşer.</summary>
    [Fact]
    public async Task Ikinci_set_var_olan_acik_oturuma_duser()
    {
        var (context, user, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var birinci = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));
            var ikinci = await service.CreateAsync(Yeni(exercise.Id, 100m, 9));

            Assert.Equal(birinci.SessionId, ikinci.SessionId);
            Assert.Equal(1, await context.Set<WorkoutSession>().CountAsync(s => s.UserId == user.Id));
        }
    }

    /// <summary>
    /// #62: set girilen hareket antrenmanin listesinde yoksa sona HEDEFSIZ girer -- "Plan disi" diye
    /// ayri bir kavram kalmaz. Ikinci set ikinci bir satir URETMEZ.
    /// </summary>
    [Fact]
    public async Task Set_eklenen_hareket_antrenman_listesinde_yoksa_bir_kez_hedefsiz_eklenir()
    {
        var (context, _, exercise, service, sessionService, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var birinci = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));
            await service.CreateAsync(Yeni(exercise.Id, 100m, 9));
            context.ChangeTracker.Clear();

            var satir = await context.Set<SessionExercise>().SingleAsync(se => se.WorkoutSessionId == birinci.SessionId);
            Assert.Equal(exercise.Id, satir.ExerciseId);
            Assert.Null(satir.PlannedSets);

            var ilerleme = Assert.Single((await sessionService.GetByIdAsync(birinci.SessionId)).Progress);
            Assert.Equal(2, ilerleme.CompletedSets);
        }
    }

    [Fact]
    public async Task Ayni_agirlikta_daha_cok_tekrar_tekrar_rekoru_olarak_kaydedilir()
    {
        var (_, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            await service.CreateAsync(Yeni(exercise.Id, 100m, 8));
            var ikinci = await service.CreateAsync(Yeni(exercise.Id, 100m, 10));

            Assert.Equal(RecordType.Reps, ikinci.RecordType);
        }
    }

    /// <summary>Spec Soru 2/A: yazarken katı.</summary>
    [Fact]
    public async Task Arsivlenmis_egzersize_set_girilemez()
    {
        var (context, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            exercise.IsArchived = true;
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<ValidationException>(
                () => service.CreateAsync(Yeni(exercise.Id, 100m, 8)));
        }
    }

    /// <summary>Ama geçmiş setler okunmaya devam eder — okurken hoşgörülü.</summary>
    [Fact]
    public async Task Arsivlemeden_once_girilen_setler_okunmaya_devam_eder()
    {
        var (context, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eklenen = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));
            exercise.IsArchived = true;
            await context.SaveChangesAsync();

            var setler = await service.GetForSessionAsync(eklenen.SessionId);

            Assert.Single(setler);
        }
    }

    [Fact]
    public async Task Baskasinin_egzersizine_set_girilemez()
    {
        var (context, _, _, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerEgzersiz = TestDatabase.NewExercise(digerKullanici, $"Egzersiz {Guid.NewGuid():N}");
            context.AddRange(digerKullanici, digerEgzersiz);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.CreateAsync(Yeni(digerEgzersiz.Id, 100m, 8)));
        }
    }

    [Fact]
    public async Task Global_egzersize_set_girilebilir()
    {
        var (_, _, _, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            // Id 1 = seed edilmiş global "Bench Press".
            var eklenen = await service.CreateAsync(Yeni(1, 60m, 12));

            Assert.Equal(RecordType.Weight, eklenen.RecordType);
        }
    }

    /// <summary>
    /// Weight sütunu numeric(6,2). 100.555 gönderilirse PostgreSQL sessizce 100.56'ya
    /// yuvarlar — ve o an rekor kararı 100.555 üzerinden verilmiş olduğu için ağırlık
    /// kovası ile kaydedilen değer ayrışır. Bu yüzden reddediliyor, yuvarlanmıyor.
    /// </summary>
    [Fact]
    public async Task Ikiden_fazla_ondalikli_agirlik_reddedilir()
    {
        var (_, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(
                () => service.CreateAsync(Yeni(exercise.Id, 100.555m, 8)));
        }
    }

    // ---- Düzeltme ----

    [Fact]
    public async Task Bos_patch_reddedilir()
    {
        var (_, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var eklenen = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));

            await Assert.ThrowsAsync<ValidationException>(
                () => service.PatchAsync(eklenen.Id, new PatchSetRequest()));
        }
    }

    /// <summary>
    /// LOAD-BEARING: ortadaki setin ağırlığını yükseltmek hem KENDİ rekor tipini hem
    /// SONRAKİLERİNKİNİ değiştirmeli. Yeniden hesap çağrılmazsa ilk iddia geçer, ikincisi
    /// kalır — bu yüzden ikisi birden kontrol ediliyor.
    /// </summary>
    [Fact]
    public async Task Ortadaki_setin_duzeltilmesi_sonraki_setleri_de_yeniden_hesaplar()
    {
        var (context, user, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            await service.CreateAsync(Yeni(exercise.Id, 100m, 8));                 // Weight
            var ikinci = await service.CreateAsync(Yeni(exercise.Id, 90m, 10));    // None (90 kovasi yeni)
            var ucuncu = await service.CreateAsync(Yeni(exercise.Id, 110m, 5));    // Weight

            Assert.Equal(RecordType.None, ikinci.RecordType);

            // İkinciyi 120'ye çıkar: kendisi Weight olur, ÜÇÜNCÜ artık 120'yi geçemez.
            await service.PatchAsync(ikinci.Id, new PatchSetRequest { Weight = 120m });

            // Clear ŞART: aksi halde iddialar DB'yi değil, change tracker'daki bellek
            // nesnelerini okur ve SaveChanges hiç çağrılmasa bile yeşil kalırdı.
            context.ChangeTracker.Clear();
            var setler = await new SetEntryRepository(context)
                .GetForUserAndExerciseAsync(user.Id, exercise.Id);

            Assert.Equal(
                new[] { RecordType.Weight, RecordType.Weight, RecordType.None },
                setler.Select(s => s.RecordType));
            Assert.Equal(RecordType.None, setler.Single(s => s.Id == ucuncu.Id).RecordType);
        }
    }

    [Fact]
    public async Task Baskasinin_seti_duzeltilemez()
    {
        var (context, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerOturum = TestDatabase.NewSession(digerKullanici);
            var digerSet = new SetEntry
            {
                WorkoutSession = digerOturum, Exercise = exercise,
                Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = VarsayilanAn
            };
            context.AddRange(digerKullanici, digerOturum, digerSet);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.PatchAsync(digerSet.Id, new PatchSetRequest { Reps = 99 }));
        }
    }

    // ---- Silme ----

    /// <summary>
    /// LOAD-BEARING: rekor taşıyan set silininceki terfi. Yeniden hesap silinen seti hariç
    /// tutmazsa (EF identity map onu sorguda hâlâ döndürür) 90'lık set None kalır.
    /// </summary>
    [Fact]
    public async Task Rekor_tasiyan_set_silinince_sonraki_set_rekora_terfi_eder()
    {
        var (context, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var birinci = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));   // Weight
            var ikinci = await service.CreateAsync(Yeni(exercise.Id, 90m, 10));    // None

            await service.DeleteAsync(birinci.Id);

            context.ChangeTracker.Clear();
            var kalan = await context.Set<SetEntry>().SingleAsync(s => s.Id == ikinci.Id);

            Assert.Equal(RecordType.Weight, kalan.RecordType);
        }
    }

    [Fact]
    public async Task Rekor_tasimayan_set_silinince_diger_rekorlar_bozulmaz()
    {
        var (context, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var birinci = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));   // Weight
            var ikinci = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));    // None
            var ucuncu = await service.CreateAsync(Yeni(exercise.Id, 100m, 9));    // Reps

            await service.DeleteAsync(ikinci.Id);

            context.ChangeTracker.Clear();
            var kalanlar = await context.Set<SetEntry>()
                .Where(s => s.ExerciseId == exercise.Id).OrderBy(s => s.Id).ToListAsync();

            Assert.Equal([birinci.Id, ucuncu.Id], kalanlar.Select(s => s.Id));
            Assert.Equal(
                new[] { RecordType.Weight, RecordType.Reps },
                kalanlar.Select(s => s.RecordType));
        }
    }

    [Fact]
    public async Task Baskasinin_seti_silinemez()
    {
        var (context, _, exercise, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerOturum = TestDatabase.NewSession(digerKullanici);
            var digerSet = new SetEntry
            {
                WorkoutSession = digerOturum, Exercise = exercise,
                Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = VarsayilanAn
            };
            context.AddRange(digerKullanici, digerOturum, digerSet);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(() => service.DeleteAsync(digerSet.Id));
        }
    }

    // ---- Oturum setlerini okuma ----

    [Fact]
    public async Task Oturumun_setleri_kronolojik_doner()
    {
        var (_, _, exercise, service, _, saat, transaction) = await CreateAsync();
        await using (transaction)
        {
            var birinci = await service.CreateAsync(Yeni(exercise.Id, 100m, 8));
            saat.UtcNow = saat.UtcNow.AddMinutes(3);
            await service.CreateAsync(Yeni(exercise.Id, 100m, 9));

            var setler = await service.GetForSessionAsync(birinci.SessionId);

            Assert.Equal([8, 9], setler.Select(s => s.Reps));
        }
    }

    [Fact]
    public async Task Baskasinin_oturumunun_setleri_okunamaz()
    {
        var (context, _, _, service, _, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var digerKullanici = TestDatabase.NewUser();
            var digerOturum = TestDatabase.NewSession(digerKullanici);
            context.AddRange(digerKullanici, digerOturum);
            await context.SaveChangesAsync();

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.GetForSessionAsync(digerOturum.Id));
        }
    }
}
