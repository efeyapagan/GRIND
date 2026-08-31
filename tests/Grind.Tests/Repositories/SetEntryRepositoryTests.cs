using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class SetEntryRepositoryTests
{
    private const long PullUpId = 6;   // seed
    private const long SquatId = 11;   // seed

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
        await context.SaveChangesAsync();

        var ids = await repository.GetDistinctExerciseIdsForSessionAsync(session.Id);

        Assert.Equal(2, ids.Count);
        Assert.Contains(PullUpId, ids);
        Assert.Contains(SquatId, ids);
        await transaction.RollbackAsync();
    }
}
