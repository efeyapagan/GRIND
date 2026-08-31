using Grind.Api.Repositories;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class ExerciseRepositoryTests
{
    [Fact]
    public async Task GetVisibleAsync_kendi_ve_global_egzersizleri_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var mine = TestDatabase.NewExercise(user, $"Benim_{Guid.NewGuid():N}");
        context.Exercises.Add(mine);
        await context.SaveChangesAsync();

        var visible = await repository.GetVisibleAsync(user.Id);

        Assert.Contains(visible, e => e.Id == mine.Id);
        Assert.Contains(visible, e => e.Name == "Bench Press" && e.UserId == null);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetVisibleAsync_baskasinin_ozel_egzersizini_dondurmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var owner = TestDatabase.NewUser();
        var stranger = TestDatabase.NewUser();
        context.Users.AddRange(owner, stranger);
        var secret = TestDatabase.NewExercise(owner, $"Gizli_{Guid.NewGuid():N}");
        context.Exercises.Add(secret);
        await context.SaveChangesAsync();

        var visible = await repository.GetVisibleAsync(stranger.Id);

        Assert.DoesNotContain(visible, e => e.Id == secret.Id);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetVisibleAsync_arsivlileri_varsayilan_olarak_gizler()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var archived = TestDatabase.NewExercise(user, $"Arsiv_{Guid.NewGuid():N}");
        archived.IsArchived = true;
        context.Exercises.Add(archived);
        await context.SaveChangesAsync();

        Assert.DoesNotContain(await repository.GetVisibleAsync(user.Id), e => e.Id == archived.Id);
        Assert.Contains(await repository.GetVisibleAsync(user.Id, includeArchived: true), e => e.Id == archived.Id);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetVisibleByIdAsync_baskasinin_egzersizinde_null_dondurur()
    {
        // IDOR koruması: yalnızca Id ile sorgulayıp sahiplik kontrolünü atlamak
        // CLAUDE.md'nin açıkça yasakladığı şey.
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var owner = TestDatabase.NewUser();
        var stranger = TestDatabase.NewUser();
        context.Users.AddRange(owner, stranger);
        var secret = TestDatabase.NewExercise(owner, $"Gizli_{Guid.NewGuid():N}");
        context.Exercises.Add(secret);
        await context.SaveChangesAsync();

        Assert.Null(await repository.GetVisibleByIdAsync(secret.Id, stranger.Id));
        Assert.NotNull(await repository.GetVisibleByIdAsync(secret.Id, owner.Id));
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetVisibleByIdAsync_global_egzersizi_herkese_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var benchPress = await repository.GetVisibleByIdAsync(1, user.Id); // seed: Bench Press

        Assert.NotNull(benchPress);
        Assert.Null(benchPress.UserId);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task NameExistsAsync_buyuk_kucuk_harf_gozetmez()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var name = $"Kablo_{Guid.NewGuid():N}";
        context.Exercises.Add(TestDatabase.NewExercise(user, name));
        await context.SaveChangesAsync();

        Assert.True(await repository.NameExistsAsync(user.Id, name.ToUpperInvariant()));
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task NameExistsAsync_global_isimleri_de_kapsar()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var repository = new ExerciseRepository(context);

        Assert.True(await repository.NameExistsAsync(user.Id, "bench press"));
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task NameExistsAsync_arsivli_ismi_de_dolu_sayar()
    {
        // Unique index arşivlenince ismi serbest bırakmıyor; repository gerçeği söyler,
        // "arşivden çıkar" yorumunu Faz 5 yapar.
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var user = TestDatabase.NewUser();
        context.Users.Add(user);
        var name = $"Arsivli_{Guid.NewGuid():N}";
        var archived = TestDatabase.NewExercise(user, name);
        archived.IsArchived = true;
        context.Exercises.Add(archived);
        await context.SaveChangesAsync();

        Assert.True(await repository.NameExistsAsync(user.Id, name));
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task NameExistsAsync_baskasinin_ismini_cakisma_saymaz()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new ExerciseRepository(context);

        var owner = TestDatabase.NewUser();
        var stranger = TestDatabase.NewUser();
        context.Users.AddRange(owner, stranger);
        var name = $"Ozel_{Guid.NewGuid():N}";
        context.Exercises.Add(TestDatabase.NewExercise(owner, name));
        await context.SaveChangesAsync();

        Assert.False(await repository.NameExistsAsync(stranger.Id, name));
        await transaction.RollbackAsync();
    }
}
