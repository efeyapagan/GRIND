using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class WorkoutTemplateRepositoryTests
{
    private static WorkoutTemplate NewTemplate(User user, string? name = null) => new()
    {
        User = user,
        Name = name ?? $"Sablon {Guid.NewGuid():N}",
        CreatedAt = DateTime.UtcNow
    };

    [Fact]
    public async Task GetAllAsync_yalnizca_kendi_sablonlarini_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutTemplateRepository(context);

        var user = TestDatabase.NewUser();
        var digerKullanici = TestDatabase.NewUser();
        repository.Add(NewTemplate(user));
        repository.Add(NewTemplate(digerKullanici));
        await context.SaveChangesAsync();

        var kendi = await repository.GetAllAsync(user.Id);

        Assert.Single(kendi);
        Assert.All(kendi, t => Assert.Equal(user.Id, t.UserId));

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetOwnedByIdAsync_baskasinin_sablonunda_null_doner()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutTemplateRepository(context);

        var user = TestDatabase.NewUser();
        var digerKullanici = TestDatabase.NewUser();
        var digerSablon = NewTemplate(digerKullanici);
        context.Add(user);
        repository.Add(digerSablon);
        await context.SaveChangesAsync();

        Assert.Null(await repository.GetOwnedByIdAsync(digerSablon.Id, user.Id));

        await transaction.RollbackAsync();
    }

    /// <summary>Sıralama diziden türetiliyor; okurken de o sırayla gelmeli.</summary>
    [Fact]
    public async Task GetOwnedByIdAsync_egzersizleri_OrderIndex_sirasiyla_yukler()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutTemplateRepository(context);

        var user = TestDatabase.NewUser();
        var sablon = NewTemplate(user);
        sablon.TemplateExercises.Add(new TemplateExercise { ExerciseId = 11, OrderIndex = 1, PlannedSets = 3 });
        sablon.TemplateExercises.Add(new TemplateExercise { ExerciseId = 1, OrderIndex = 0, PlannedSets = 4 });
        repository.Add(sablon);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var bulunan = await repository.GetOwnedByIdAsync(sablon.Id, user.Id);

        Assert.NotNull(bulunan);
        Assert.Equal([1L, 11L], bulunan.TemplateExercises.Select(te => te.ExerciseId));
        Assert.All(bulunan.TemplateExercises, te => Assert.NotNull(te.Exercise));

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task NameExistsAsync_buyuk_kucuk_harf_gozetmez_ve_excludeIdyi_saymaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutTemplateRepository(context);

        var user = TestDatabase.NewUser();
        var sablon = NewTemplate(user);
        repository.Add(sablon);
        await context.SaveChangesAsync();

        Assert.True(await repository.NameExistsAsync(user.Id, sablon.Name.ToUpperInvariant()));
        Assert.False(await repository.NameExistsAsync(user.Id, sablon.Name, excludeId: sablon.Id));

        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task NameExistsAsync_baska_kullanicinin_sablonunu_saymaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new WorkoutTemplateRepository(context);

        var user = TestDatabase.NewUser();
        var digerKullanici = TestDatabase.NewUser();
        var digerSablon = NewTemplate(digerKullanici);
        context.Add(user);
        repository.Add(digerSablon);
        await context.SaveChangesAsync();

        Assert.False(await repository.NameExistsAsync(user.Id, digerSablon.Name));

        await transaction.RollbackAsync();
    }
}
