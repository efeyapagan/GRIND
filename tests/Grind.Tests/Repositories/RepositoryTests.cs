using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Repositories;

[Trait("Category", "Database")]
public class RepositoryTests
{
    [Fact]
    public async Task GetByIdAsync_var_olan_kaydi_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new Repository<User>(context);

        var user = TestDatabase.NewUser();
        repository.Add(user);
        await context.SaveChangesAsync();

        var found = await repository.GetByIdAsync(user.Id);

        Assert.NotNull(found);
        Assert.Equal(user.Username, found.Username);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task GetByIdAsync_olmayan_kayitta_null_dondurur()
    {
        await using var context = TestDatabase.CreateContext();
        var repository = new Repository<User>(context);

        Assert.Null(await repository.GetByIdAsync(-1));
    }

    [Fact]
    public async Task Add_kaydi_kalici_hale_getirir()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new Repository<User>(context);

        var user = TestDatabase.NewUser();
        repository.Add(user);
        await context.SaveChangesAsync();

        Assert.True(user.Id > 0);
        await transaction.RollbackAsync();
    }

    [Fact]
    public async Task Remove_kaydi_siler()
    {
        await using var context = TestDatabase.CreateContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        var repository = new Repository<User>(context);

        var user = TestDatabase.NewUser();
        repository.Add(user);
        await context.SaveChangesAsync();
        var id = user.Id;

        repository.Remove(user);
        await context.SaveChangesAsync();

        Assert.Null(await context.Users.FirstOrDefaultAsync(u => u.Id == id));
        await transaction.RollbackAsync();
    }
}
