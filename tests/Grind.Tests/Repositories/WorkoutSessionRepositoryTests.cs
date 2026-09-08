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
    public async Task Aralik_alt_siniri_dahil_ust_siniri_haric()
    {
        // >= from && < to sınırlarını sabitler: from ile başlayan oturum bulunmalı,
        // to ile başlayan oturum bulunmamalı. Aksi halde >=/< yerine >/<= ile
        // değiştirilse bile testler yeşil kalırdı.
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
}
