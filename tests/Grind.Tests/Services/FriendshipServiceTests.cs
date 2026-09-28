using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Grind.Api.Services;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class FriendshipServiceTests
{
    private static async Task<(AppDbContext Context, User A, User B, FriendshipService Service, IAsyncDisposable Transaction)>
        CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();
        var (a, b) = (TestDatabase.NewUser(), TestDatabase.NewUser());
        context.AddRange(a, b);
        await context.SaveChangesAsync();
        return (context, a, b, new FriendshipService(new FollowRepository(context)), transaction);
    }

    [Fact]
    public async Task Karsilikli_takip_arkadas_sayilir()
    {
        var (context, a, b, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            context.AddRange(
                new Follow { FollowerId = a.Id, FolloweeId = b.Id, CreatedAt = DateTime.UtcNow },
                new Follow { FollowerId = b.Id, FolloweeId = a.Id, CreatedAt = DateTime.UtcNow });
            await context.SaveChangesAsync();

            Assert.True(await service.AreFriendsAsync(a.Id, b.Id));
            Assert.True(await service.AreFriendsAsync(b.Id, a.Id));
        }
    }

    [Fact]
    public async Task Tek_yonlu_takip_arkadas_sayilmaz()
    {
        var (context, a, b, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            context.Add(new Follow { FollowerId = a.Id, FolloweeId = b.Id, CreatedAt = DateTime.UtcNow });
            await context.SaveChangesAsync();

            Assert.False(await service.AreFriendsAsync(a.Id, b.Id));
        }
    }

    [Fact]
    public async Task Hic_takip_yoksa_arkadas_degil()
    {
        var (_, a, b, service, transaction) = await CreateAsync();
        await using (transaction)
        {
            Assert.False(await service.AreFriendsAsync(a.Id, b.Id));
        }
    }
}
