using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Tests.Services;

/// <summary>
/// Arkadaşlık isteği (#628): kabul iki tarafı karşılıklı takibe getirir, ret takipleri değiştirmez,
/// aynı kişiye üst üste 3 retten sonra istek gönderilemez (geri çekilen sayılmaz).
/// </summary>
[Trait("Category", "Database")]
public class FriendRequestServiceTests
{
    private static readonly DateTime An = new(2026, 10, 3, 12, 0, 0, DateTimeKind.Utc);

    private sealed class StubCurrentUser(User user) : ICurrentUserService
    {
        public long UserId { get; } = user.Id;
        public string Username { get; } = user.Username;
    }

    private sealed class SahteSaat : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(An, TimeSpan.Zero);
    }

    private static async Task<(AppDbContext Context, User[] Users, IAsyncDisposable Transaction)> CreateAsync(int n)
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();
        var users = Enumerable.Range(0, n).Select(_ => TestDatabase.NewUser()).ToArray();
        context.AddRange(users);
        await context.SaveChangesAsync();
        return (context, users, transaction);
    }

    private static FriendRequestService ServiceFor(AppDbContext context, User current)
        => new(new FriendRequestRepository(context), new FollowRepository(context), new UserRepository(context),
            new UnitOfWork(context), new StubCurrentUser(current), new SahteSaat());

    private static Task<bool> TakipVarMi(AppDbContext context, User a, User b)
        => context.Follows.AnyAsync(f => f.FollowerId == a.Id && f.FolloweeId == b.Id);

    /// <summary>Yalnızca verilen kullanıcıların satırları: paylaşılan test veritabanında entegrasyon testlerinin kalıcı istekleri de var.</summary>
    private static Task<List<FriendRequest>> Istekler(AppDbContext context, params User[] users)
    {
        var ids = users.Select(u => u.Id).ToArray();
        return context.FriendRequests.AsNoTracking()
            .Where(r => ids.Contains(r.RequesterId) || ids.Contains(r.TargetId)).ToListAsync();
    }

    [Fact]
    public async Task Istek_bekleyen_satir_acar_ikinci_istek_noop()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            await ServiceFor(context, ben).SendAsync(ali.Username);
            await ServiceFor(context, ben).SendAsync(ali.Username);

            var istek = Assert.Single(await Istekler(context, ben, ali));
            Assert.Equal((ben.Id, ali.Id, (DateTime?)null), (istek.RequesterId, istek.TargetId, istek.RejectedAt));
        }
    }

    [Fact]
    public async Task Zaten_arkadassa_istek_acilmaz()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            context.AddRange(
                new Follow { FollowerId = ben.Id, FolloweeId = ali.Id, CreatedAt = An },
                new Follow { FollowerId = ali.Id, FolloweeId = ben.Id, CreatedAt = An });
            await context.SaveChangesAsync();

            await ServiceFor(context, ben).SendAsync(ali.Username);

            Assert.Empty(await Istekler(context, ben, ali));
        }
    }

    [Fact]
    public async Task Kendine_istek_400()
    {
        var (context, users, transaction) = await CreateAsync(1);
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(() => ServiceFor(context, users[0]).SendAsync(users[0].Username));
        }
    }

    /// <summary>Üst üste 3 ret → 4. istek 400; geri çekilen istekler sayılmaz.</summary>
    [Fact]
    public async Task Uc_retten_sonra_istek_gonderilemez_geri_cekilen_sayilmaz()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            await ServiceFor(context, ben).SendAsync(ali.Username);
            await ServiceFor(context, ben).WithdrawAsync(ali.Username);
            for (var i = 0; i < FriendRequestService.RejectionLimit; i++)
            {
                await ServiceFor(context, ben).SendAsync(ali.Username);
                await ServiceFor(context, ali).RejectAsync(ben.Username);
            }

            await Assert.ThrowsAsync<ValidationException>(() => ServiceFor(context, ben).SendAsync(ali.Username));
        }
    }

    /// <summary>
    /// Kabul: eksik takip satırları eklenir (var olan takip tekrar eklenmez), çiftin TÜM
    /// istekleri (karşı yöndeki bekleyen ve reddedilmişler dahil) silinir.
    /// </summary>
    [Fact]
    public async Task Kabul_karsilikli_takip_kurar_ciftin_isteklerini_siler()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            context.Add(new Follow { FollowerId = ali.Id, FolloweeId = ben.Id, CreatedAt = An });
            context.Add(new FriendRequest { RequesterId = ali.Id, TargetId = ben.Id, CreatedAt = An, RejectedAt = An });
            context.Add(new FriendRequest { RequesterId = ben.Id, TargetId = ali.Id, CreatedAt = An });
            await context.SaveChangesAsync();
            await ServiceFor(context, ali).SendAsync(ben.Username);

            await ServiceFor(context, ben).AcceptAsync(ali.Username);

            Assert.True(await TakipVarMi(context, ben, ali));
            Assert.True(await TakipVarMi(context, ali, ben));
            Assert.Equal(1, await context.Follows.CountAsync(f => f.FollowerId == ali.Id && f.FolloweeId == ben.Id));
            Assert.Empty(await Istekler(context, ben, ali));
        }
    }

    [Fact]
    public async Task Ret_takipleri_degistirmez()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            await ServiceFor(context, ali).SendAsync(ben.Username);

            await ServiceFor(context, ben).RejectAsync(ali.Username);

            Assert.False(await TakipVarMi(context, ben, ali));
            Assert.False(await TakipVarMi(context, ali, ben));
            Assert.Equal(An, Assert.Single(await Istekler(context, ben, ali)).RejectedAt);
        }
    }

    /// <summary>IDOR: kendi gönderdiğin isteği "kabul" edemezsin — bana gelen bir istek yok, 404.</summary>
    [Fact]
    public async Task Gonderen_kendi_istegini_kabul_edemez()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, ali) = (users[0], users[1]);
            await ServiceFor(context, ben).SendAsync(ali.Username);

            await Assert.ThrowsAsync<NotFoundException>(() => ServiceFor(context, ben).AcceptAsync(ali.Username));
            Assert.False(await TakipVarMi(context, ali, ben));
        }
    }
}
