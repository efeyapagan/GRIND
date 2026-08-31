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
}
