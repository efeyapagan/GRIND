using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class WorkoutSessionRepositoryTests
{
    [Fact]
    public async Task Araliktaki_acik_oturumu_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutSessionRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var session = TestDatabase.NewSession(user);
        context.WorkoutSessions.Add(session);
        await context.SaveChangesAsync();

        var found = await repository.GetOpenSessionStartedBetweenAsync(
            user.Id, DateTime.UtcNow.AddHours(-1), DateTime.UtcNow.AddHours(1));

        Assert.NotNull(found);
        Assert.Equal(session.Id, found.Id);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Kapanmis_oturumu_dondurmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutSessionRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var session = TestDatabase.NewSession(user);
        session.EndedAt = DateTime.UtcNow.AddMinutes(30);
        context.WorkoutSessions.Add(session);
        await context.SaveChangesAsync();

        var found = await repository.GetOpenSessionStartedBetweenAsync(
            user.Id, DateTime.UtcNow.AddHours(-1), DateTime.UtcNow.AddHours(1));

        Assert.Null(found);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Aralik_disindaki_acik_oturumu_dondurmez()
    {
        // Unutulmuş açık session senaryosu: günler önce açılmış, hâlâ kapanmamış.
        // Bugünün aralığında aranınca çıkmamalı, yoksa yeni set eski tarihe düşer.
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutSessionRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var oldSession = TestDatabase.NewSession(user);
        oldSession.StartedAt = DateTime.UtcNow.AddDays(-3);
        context.WorkoutSessions.Add(oldSession);
        await context.SaveChangesAsync();

        var found = await repository.GetOpenSessionStartedBetweenAsync(
            user.Id, DateTime.UtcNow.AddHours(-1), DateTime.UtcNow.AddHours(1));

        Assert.Null(found);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Alt_sinirdaki_oturumu_dondurur()
    {
        // >= from sınırını sabitler: from ile TAM AYNI anda başlayan oturum bulunmalı.
        // Üst sınır (< to) ayrı testte (Ust_sinirdaki_oturumu_dondurmez).
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutSessionRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var from = DateTime.UtcNow.AddHours(-1);
        var to = DateTime.UtcNow.AddHours(1);

        var atFrom = TestDatabase.NewSession(user);
        atFrom.StartedAt = from;
        context.WorkoutSessions.Add(atFrom);
        await context.SaveChangesAsync();

        var found = await repository.GetOpenSessionStartedBetweenAsync(user.Id, from, to);

        Assert.NotNull(found);
        Assert.Equal(atFrom.Id, found.Id);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Ust_sinirdaki_oturumu_dondurmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutSessionRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var from = DateTime.UtcNow.AddHours(-1);
        var to = DateTime.UtcNow.AddHours(1);

        var atTo = TestDatabase.NewSession(user);
        atTo.StartedAt = to;
        context.WorkoutSessions.Add(atTo);
        await context.SaveChangesAsync();

        var found = await repository.GetOpenSessionStartedBetweenAsync(user.Id, from, to);

        Assert.Null(found);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Baska_kullanicinin_acik_oturumunu_dondurmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutSessionRepository(context);

        var owner = TestDatabase.NewUser();
        var stranger = TestDatabase.NewUser();
        context.Users.AddRange(owner, stranger);
        context.WorkoutSessions.Add(TestDatabase.NewSession(owner));
        await context.SaveChangesAsync();

        var found = await repository.GetOpenSessionStartedBetweenAsync(
            stranger.Id, DateTime.UtcNow.AddHours(-1), DateTime.UtcNow.AddHours(1));

        Assert.Null(found);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetAllAsync_yalnizca_kendi_oturumlarini_yeniden_eskiye_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutSessionRepository(context);

        var user = TestDatabase.NewUser();
        var digerKullanici = TestDatabase.NewUser();
        var eski = TestDatabase.NewSession(user);
        eski.StartedAt = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);
        var yeni = TestDatabase.NewSession(user);
        yeni.StartedAt = new DateTime(2026, 2, 1, 10, 0, 0, DateTimeKind.Utc);
        repository.Add(eski);
        repository.Add(yeni);
        repository.Add(TestDatabase.NewSession(digerKullanici));
        await context.SaveChangesAsync();

        var bulunan = await repository.GetAllAsync(user.Id);

        Assert.Equal(2, bulunan.Count);
        Assert.Equal([yeni.Id, eski.Id], bulunan.Select(s => s.Id));

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetOwnedByIdAsync_baskasinin_oturumunda_null_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutSessionRepository(context);

        var user = TestDatabase.NewUser();
        var digerKullanici = TestDatabase.NewUser();
        var digerOturum = TestDatabase.NewSession(digerKullanici);
        context.Add(user);
        repository.Add(digerOturum);
        await context.SaveChangesAsync();

        Assert.Null(await repository.GetOwnedByIdAsync(digerOturum.Id, user.Id));

        await transaction.RollbackAsync();
    }

    /// <summary>İlerleme hesabı şablonun egzersizlerine ve adlarına ihtiyaç duyuyor.</summary>
    [Fact]
    public async Task GetOwnedByIdAsync_sablonu_ve_egzersizlerini_yukler()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutSessionRepository(context);

        var user = TestDatabase.NewUser();
        var sablon = new WorkoutTemplate
        {
            User = user,
            Name = $"Sablon {Guid.NewGuid():N}",
            CreatedAt = DateTime.UtcNow,
            TemplateExercises = { new TemplateExercise { ExerciseId = 1, OrderIndex = 0, PlannedSets = 4 } }
        };
        var oturum = TestDatabase.NewSession(user);
        oturum.Template = sablon;
        repository.Add(oturum);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var bulunan = await repository.GetOwnedByIdAsync(oturum.Id, user.Id);

        Assert.NotNull(bulunan);
        Assert.NotNull(bulunan.Template);
        Assert.Single(bulunan.Template.TemplateExercises);
        Assert.Equal("Bench Press", bulunan.Template.TemplateExercises.Single().Exercise.Name);

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetCompletedSetCountsAsync_egzersiz_basina_sayar()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var setRepository = new SetEntryRepository(context);

        var user = TestDatabase.NewUser();
        var oturum = TestDatabase.NewSession(user);
        context.Add(oturum);
        await context.SaveChangesAsync();

        foreach (var (exerciseId, adet) in new[] { (1L, 3), (11L, 2) })
        {
            for (var i = 0; i < adet; i++)
            {
                setRepository.Add(new SetEntry
                {
                    WorkoutSessionId = oturum.Id,
                    ExerciseId = exerciseId,
                    Weight = 60m,
                    Reps = 8,
                    RecordType = RecordType.None,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await context.SaveChangesAsync();

        var sayimlar = await setRepository.GetCompletedSetCountsAsync(oturum.Id);

        Assert.Equal(3, sayimlar[1L]);
        Assert.Equal(2, sayimlar[11L]);

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetCompletedSetCountsAsync_seti_olmayan_oturumda_bos_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var setRepository = new SetEntryRepository(context);

        var user = TestDatabase.NewUser();
        var oturum = TestDatabase.NewSession(user);
        context.Add(oturum);
        await context.SaveChangesAsync();

        Assert.Empty(await setRepository.GetCompletedSetCountsAsync(oturum.Id));

        await transaction.RollbackAsync();
    }

    // ---- Faz 9 eklemeleri ----

    /// <summary>Belirli bir UTC anında başlayan, verilen setleri taşıyan oturum kurar.</summary>
    private static WorkoutSession SeedSession(
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
    public async Task Gecmis_sayfasi_toplam_sayiyla_birlikte_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        SeedSession(context, user, exercise, an, (100m, 8));
        SeedSession(context, user, exercise, an.AddDays(1), (100m, 8));
        SeedSession(context, user, exercise, an.AddDays(2), (100m, 8));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);
        var (sessions, toplam) = await repository.GetHistoryPageAsync(
            user.Id, null, null, null, skip: 0, take: 2);

        // Sayfa 2 satır taşır ama toplam 3'tür — istemci "3 sonuçtan 1-2" diyebilsin.
        Assert.Equal(2, sessions.Count);
        Assert.Equal(3, toplam);
    }

    /// <summary>Yeniden eskiye; eşit `StartedAt`'te Id azalan (belirli sıra).</summary>
    [Fact]
    public async Task Gecmis_yeniden_eskiye_siralanir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        var eski = SeedSession(context, user, exercise, an, (100m, 8));
        var yeni = SeedSession(context, user, exercise, an.AddDays(1), (100m, 8));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);
        var (sessions, _) = await repository.GetHistoryPageAsync(user.Id, null, null, null, 0, 20);

        Assert.Equal([yeni.Id, eski.Id], sessions.Select(s => s.Id));
    }

    [Fact]
    public async Task Gecmis_tarih_araligina_gore_filtrelenir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        SeedSession(context, user, exercise, an.AddDays(-5), (100m, 8));
        var araliktaki = SeedSession(context, user, exercise, an, (100m, 8));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);
        var (sessions, toplam) = await repository.GetHistoryPageAsync(
            user.Id, an.AddDays(-1), an.AddDays(1), null, 0, 20);

        Assert.Equal(araliktaki.Id, Assert.Single(sessions).Id);
        Assert.Equal(1, toplam);
    }

    [Fact]
    public async Task Gecmis_egzersize_gore_filtrelenir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var aranan = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        var diger = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, aranan, diger);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        var arananOturum = SeedSession(context, user, aranan, an, (100m, 8));
        SeedSession(context, user, diger, an.AddDays(1), (100m, 8));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);
        var (sessions, toplam) = await repository.GetHistoryPageAsync(
            user.Id, null, null, aranan.Id, 0, 20);

        Assert.Equal(arananOturum.Id, Assert.Single(sessions).Id);
        // Toplam da filtreli olmalı: sayfa 1 satır gösterip "2 sonuç" demek tutarsız olurdu.
        Assert.Equal(1, toplam);
    }

    [Fact]
    public async Task Gecmis_baskasinin_oturumlarini_getirmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(sahip, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(sahip, davetsiz, exercise);
        await context.SaveChangesAsync();

        SeedSession(context, sahip, exercise, new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc), (100m, 8));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);
        var (sessions, toplam) = await repository.GetHistoryPageAsync(davetsiz.Id, null, null, null, 0, 20);

        Assert.Empty(sessions);
        Assert.Equal(0, toplam);
    }

    [Fact]
    public async Task Oturum_toplamlari_hacmi_ve_set_sayisini_verir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        var oturum = SeedSession(context, user, exercise, an, (100m, 8), (60m, 10));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);
        var toplamlar = await repository.GetSessionAggregatesAsync(user.Id, null, null);

        var satir = Assert.Single(toplamlar);
        Assert.Equal(oturum.Id, satir.SessionId);
        Assert.Equal(2, satir.SetCount);
        Assert.Equal(100m * 8 + 60m * 10, satir.Volume);   // 1400
    }

    /// <summary>
    /// Seti olmayan oturum antrenman sayılmaz (spec Karar 3) — takvimi ve seriyi şişirmemeli.
    /// </summary>
    [Fact]
    public async Task Seti_olmayan_oturum_toplamlara_girmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.Add(user);
        await context.SaveChangesAsync();

        var bos = TestDatabase.NewSession(user);
        bos.StartedAt = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        context.Add(bos);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);

        Assert.Empty(await repository.GetSessionAggregatesAsync(user.Id, null, null));
        Assert.Empty(await repository.GetTrainedSessionStartsAsync(user.Id));
    }

    [Fact]
    public async Task Antrenman_baslangiclari_tum_gecmisten_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, exercise);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        SeedSession(context, user, exercise, an, (100m, 8));
        SeedSession(context, user, exercise, an.AddDays(-40), (100m, 8));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);
        var baslangiclar = await repository.GetTrainedSessionStartsAsync(user.Id);

        // Seri tüm geçmişten hesaplanır; aralık filtresi YOKTUR (spec Karar 5).
        Assert.Equal(2, baslangiclar.Count);
    }

    [Fact]
    public async Task Antrenman_baslangiclari_baskasinin_oturumlarini_getirmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var exercise = TestDatabase.NewExercise(sahip, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(sahip, davetsiz, exercise);
        await context.SaveChangesAsync();

        SeedSession(context, sahip, exercise, new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc), (100m, 8));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);

        Assert.Empty(await repository.GetTrainedSessionStartsAsync(davetsiz.Id));
    }

    // ---- Faz 11: export aralık sorgusu ----

    [Fact]
    public async Task Aralik_oturumlari_eskiden_yeniye_doner_aralik_disini_almaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var eski = TestDatabase.NewSession(user);
        eski.StartedAt = new DateTime(2026, 3, 1, 17, 0, 0, DateTimeKind.Utc);
        var ikinci = TestDatabase.NewSession(user);
        ikinci.StartedAt = new DateTime(2026, 3, 11, 17, 0, 0, DateTimeKind.Utc);
        var birinci = TestDatabase.NewSession(user);
        birinci.StartedAt = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        // Bilerek ters sırada eklenir: sıra eklemeden değil sorgudan gelmeli.
        context.AddRange(user, eski, ikinci, birinci);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);
        var oturumlar = await repository.GetInRangeAsync(
            user.Id, new DateTime(2026, 3, 5, 0, 0, 0, DateTimeKind.Utc), null);

        Assert.Equal(new[] { birinci.Id, ikinci.Id }, oturumlar.Select(o => o.Id));
        // Salt okuma: izlemesiz. Tüm geçmiş export'u binlerce oturumu identity map'e doldurmamalı.
        Assert.Empty(context.ChangeTracker.Entries());
    }

    [Fact]
    public async Task Aralik_oturumlari_sablon_adini_yukler_ve_setsiz_oturumu_icerir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var template = new WorkoutTemplate
        {
            User = user, Name = $"Şablon {Guid.NewGuid():N}", CreatedAt = DateTime.UtcNow
        };
        var session = TestDatabase.NewSession(user);
        session.Template = template;
        context.AddRange(user, template, session);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new WorkoutSessionRepository(context);

        // Hiç seti yok ama döner: export'un oturum listesi bir günlüktür (spec Karar 8).
        var oturum = Assert.Single(await repository.GetInRangeAsync(user.Id, null, null));
        Assert.Equal(template.Name, oturum.Template?.Name);
    }

    [Fact]
    public async Task Aralik_oturumlari_baskasinin_oturumunu_icermez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        context.AddRange(sahip, davetsiz, TestDatabase.NewSession(sahip));
        await context.SaveChangesAsync();

        var repository = new WorkoutSessionRepository(context);

        Assert.Empty(await repository.GetInRangeAsync(davetsiz.Id, null, null));
    }
}
