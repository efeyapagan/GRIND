using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class SetEntryRepositoryTests
{
    private const long PullUpId = 6;   // seed
    private const long SquatId = 11;   // seed
    private const long LatPulldownId = 8;   // seed

    private static SetEntry NewSet(WorkoutSession session, long exerciseId, int reps, DateTime createdAt)
        => new()
        {
            WorkoutSession = session,
            ExerciseId = exerciseId,
            Weight = 0m,
            Reps = reps,
            CreatedAt = createdAt
        };

    [Fact]
    public async Task Setleri_kronolojik_sirada_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new SetEntryRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var session = TestDatabase.NewSession(user);
        context.WorkoutSessions.Add(session);

        var now = DateTime.UtcNow;
        context.SetEntries.Add(NewSet(session, PullUpId, 8, now.AddMinutes(-10)));
        context.SetEntries.Add(NewSet(session, PullUpId, 6, now));
        await context.SaveChangesAsync();

        var sets = await repository.GetForUserAndExerciseAsync(user.Id, PullUpId);

        Assert.Equal(2, sets.Count);
        Assert.Equal(8, sets[0].Reps);
        Assert.Equal(6, sets[1].Reps);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Baska_egzersizin_setlerini_karistirmaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new SetEntryRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var session = TestDatabase.NewSession(user);
        context.WorkoutSessions.Add(session);
        context.SetEntries.Add(NewSet(session, PullUpId, 8, DateTime.UtcNow));
        context.SetEntries.Add(NewSet(session, SquatId, 5, DateTime.UtcNow));
        await context.SaveChangesAsync();

        var sets = await repository.GetForUserAndExerciseAsync(user.Id, PullUpId);

        Assert.Single(sets);
        Assert.Equal(PullUpId, sets[0].ExerciseId);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Baska_kullanicinin_setlerini_dondurmez()
    {
        // Sahiplik WorkoutSession üzerinden geliyor; join yanlış kurulursa bu test düşer.
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new SetEntryRepository(context);

        var owner = TestDatabase.NewUser();
        var stranger = TestDatabase.NewUser();
        context.Users.AddRange(owner, stranger);
        var ownerSession = TestDatabase.NewSession(owner);
        context.WorkoutSessions.Add(ownerSession);
        context.SetEntries.Add(NewSet(ownerSession, PullUpId, 8, DateTime.UtcNow));
        await context.SaveChangesAsync();

        var sets = await repository.GetForUserAndExerciseAsync(stranger.Id, PullUpId);

        Assert.Empty(sets);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Oturumdaki_egzersiz_idlerini_tekrarsiz_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new SetEntryRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var session = TestDatabase.NewSession(user);
        context.WorkoutSessions.Add(session);
        context.SetEntries.Add(NewSet(session, PullUpId, 8, DateTime.UtcNow));
        context.SetEntries.Add(NewSet(session, PullUpId, 6, DateTime.UtcNow));
        context.SetEntries.Add(NewSet(session, SquatId, 5, DateTime.UtcNow));

        // Second session with a different exercise to verify session scoping
        var session2 = TestDatabase.NewSession(user);
        context.WorkoutSessions.Add(session2);
        context.SetEntries.Add(NewSet(session2, LatPulldownId, 10, DateTime.UtcNow));
        await context.SaveChangesAsync();

        var ids = await repository.GetDistinctExerciseIdsForSessionAsync(session.Id);

        Assert.Equal(2, ids.Count);
        Assert.Contains(PullUpId, ids);
        Assert.Contains(SquatId, ids);
        Assert.DoesNotContain(LatPulldownId, ids);
        await transaction.RollbackAsync();
    }

    // ---- Faz 8 eklemeleri ----

    /// <summary>
    /// Aynı `CreatedAt` taşıyan setler için sıralama BELİRLİ olmalı. Sahte saat kullanan
    /// servis testlerinde bütün setler aynı ana düşer; sıralama yalnızca CreatedAt'e
    /// dayanırsa PostgreSQL satırları herhangi bir sırada döndürebilir ve rekor sonucu
    /// sorgudan sorguya değişir. Tie-break: Id.
    /// </summary>
    [Fact]
    public async Task Ayni_anda_olusan_setler_id_sirasiyla_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(user);
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, session, exercise);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        foreach (var reps in new[] { 8, 9, 10, 11, 12 })
        {
            context.Add(new SetEntry
            {
                WorkoutSession = session, Exercise = exercise,
                Weight = 100m, Reps = reps, RecordType = RecordType.None, CreatedAt = an
            });
        }
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);
        var sets = await repository.GetForUserAndExerciseAsync(user.Id, exercise.Id);

        Assert.Equal([8, 9, 10, 11, 12], sets.Select(s => s.Reps));
        Assert.Equal(sets.Select(s => s.Id).Order(), sets.Select(s => s.Id));
    }

    [Fact]
    public async Task Baskasinin_seti_GetOwnedByIdAsync_ile_alinamaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(sahip);
        var exercise = TestDatabase.NewExercise(sahip, $"Egzersiz {Guid.NewGuid():N}");
        var set = new SetEntry
        {
            WorkoutSession = session, Exercise = exercise,
            Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = DateTime.UtcNow
        };
        context.AddRange(sahip, davetsiz, session, exercise, set);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);

        Assert.Null(await repository.GetOwnedByIdAsync(set.Id, davetsiz.Id));
    }

    [Fact]
    public async Task Kendi_seti_egzersiziyle_birlikte_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(user);
        var ad = $"Egzersiz {Guid.NewGuid():N}";
        var exercise = TestDatabase.NewExercise(user, ad);
        var set = new SetEntry
        {
            WorkoutSession = session, Exercise = exercise,
            Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = DateTime.UtcNow
        };
        context.AddRange(user, session, exercise, set);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);
        var bulunan = await repository.GetOwnedByIdAsync(set.Id, user.Id);

        Assert.NotNull(bulunan);
        // Yanıt DTO'su ExerciseName taşıyor; Include yoksa burada NullReferenceException olurdu.
        Assert.Equal(ad, bulunan.Exercise.Name);
    }

    [Fact]
    public async Task Baskasinin_oturumunun_setleri_bos_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(sahip);
        var exercise = TestDatabase.NewExercise(sahip, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(sahip, davetsiz, session, exercise, new SetEntry
        {
            WorkoutSession = session, Exercise = exercise,
            Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);

        Assert.Empty(await repository.GetForSessionAsync(session.Id, davetsiz.Id));
    }

    [Fact]
    public async Task Oturumun_setleri_kronolojik_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(user);
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, session, exercise);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        context.Add(new SetEntry
        {
            WorkoutSession = session, Exercise = exercise,
            Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = an.AddMinutes(10)
        });
        context.Add(new SetEntry
        {
            WorkoutSession = session, Exercise = exercise,
            Weight = 100m, Reps = 6, RecordType = RecordType.None, CreatedAt = an
        });
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);
        var sets = await repository.GetForSessionAsync(session.Id, user.Id);

        Assert.Equal([6, 8], sets.Select(s => s.Reps));
    }

    /// <summary>
    /// KANIT: None satırlar da dönmeli. "Hiçbir maksimum yalnızca None satırlarda yaşayamaz"
    /// iddiası yanlış çıktı (bkz. spec düzeltme notu, 2026-09-10 final inceleme) — rekor özeti
    /// artık kullanıcının TÜM setlerinden hesaplanıyor, yalnızca rekor taşıyanlardan değil.
    /// </summary>
    [Fact]
    public async Task Kullanicinin_tum_setleri_egzersiziyle_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(user);
        var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(user, session, exercise);
        await context.SaveChangesAsync();

        var an = new DateTime(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);
        context.Add(new SetEntry { WorkoutSession = session, Exercise = exercise, Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = an });
        context.Add(new SetEntry { WorkoutSession = session, Exercise = exercise, Weight = 100m, Reps = 8, RecordType = RecordType.None, CreatedAt = an.AddMinutes(1) });
        context.Add(new SetEntry { WorkoutSession = session, Exercise = exercise, Weight = 100m, Reps = 9, RecordType = RecordType.Reps, CreatedAt = an.AddMinutes(2) });
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);
        var setler = await repository.GetAllForUserAsync(user.Id);

        Assert.Equal(3, setler.Count);
        Assert.Contains(setler, s => s.RecordType == RecordType.None);
        Assert.All(setler, s => Assert.NotNull(s.Exercise));
    }

    [Fact]
    public async Task Tum_setler_sorgusu_baskasinin_setlerini_getirmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var sahip = TestDatabase.NewUser();
        var davetsiz = TestDatabase.NewUser();
        var session = TestDatabase.NewSession(sahip);
        var exercise = TestDatabase.NewExercise(sahip, $"Egzersiz {Guid.NewGuid():N}");
        context.AddRange(sahip, davetsiz, session, exercise, new SetEntry
        {
            WorkoutSession = session, Exercise = exercise,
            Weight = 100m, Reps = 8, RecordType = RecordType.Weight, CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new SetEntryRepository(context);

        Assert.Empty(await repository.GetAllForUserAsync(davetsiz.Id));
    }
}
