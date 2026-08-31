using Grind.Api.Repositories;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class UserRepositoryTests
{
    [Fact]
    public async Task GetByUsernameAsync_kullaniciyi_bulur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new UserRepository(context);

        var user = TestDatabase.NewUser();
        repository.Add(user);
        await context.SaveChangesAsync();

        var found = await repository.GetByUsernameAsync(user.Username);

        Assert.NotNull(found);
        Assert.Equal(user.Id, found.Id);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetByUsernameAsync_olmayan_kullanicida_null_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        var repository = new UserRepository(context);

        Assert.Null(await repository.GetByUsernameAsync($"yok_{Guid.NewGuid():N}"));
    }

    [Fact]
    public async Task UsernameExistsAsync_var_olan_icin_true_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new UserRepository(context);

        var user = TestDatabase.NewUser();
        repository.Add(user);
        await context.SaveChangesAsync();

        Assert.True(await repository.UsernameExistsAsync(user.Username));
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task UsernameExistsAsync_olmayan_icin_false_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        var repository = new UserRepository(context);

        Assert.False(await repository.UsernameExistsAsync($"yok_{Guid.NewGuid():N}"));
    }

    [Fact]
    public async Task Buyuk_harfli_arama_eslesmez_normalizasyon_servisin_isi()
    {
        // Veritabanında kullanıcı adları her zaman küçük harf durur; normalizasyon
        // kayıt anında AuthService'te yapılır (Faz 4). Repository tam eşleşme arar.
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new UserRepository(context);

        var user = TestDatabase.NewUser();
        repository.Add(user);
        await context.SaveChangesAsync();

        Assert.Null(await repository.GetByUsernameAsync(user.Username.ToUpperInvariant()));
        await transaction.RollbackAsync();
    }
}
