using System.Linq.Expressions;
using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Projections;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class FollowRepository(AppDbContext context) : Repository<Follow>(context), IFollowRepository
{
    private static readonly Expression<Func<Follow, UserRef>> AsFollower =
        f => new UserRef(f.Follower.Id, f.Follower.Username);

    private static readonly Expression<Func<Follow, UserRef>> AsFollowee =
        f => new UserRef(f.Followee.Id, f.Followee.Username);

    public Task<Follow?> GetAsync(long followerId, long followeeId, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(f => f.FollowerId == followerId && f.FolloweeId == followeeId, cancellationToken);

    public async Task<FollowCounts> GetCountsAsync(long userId, CancellationToken cancellationToken = default)
    {
        var followers = await Followers(userId).CountAsync(cancellationToken);
        var following = await Following(userId).CountAsync(cancellationToken);
        var friends = await Friends(userId).CountAsync(cancellationToken);
        return new FollowCounts(followers, following, friends);
    }

    public Task<(IReadOnlyList<UserRef> Items, int TotalCount)> GetFollowersAsync(
        long userId, int skip, int take, CancellationToken cancellationToken = default)
        => PageAsync(Followers(userId), AsFollower, skip, take, cancellationToken);

    public Task<(IReadOnlyList<UserRef> Items, int TotalCount)> GetFollowingAsync(
        long userId, int skip, int take, CancellationToken cancellationToken = default)
        => PageAsync(Following(userId), AsFollowee, skip, take, cancellationToken);

    public Task<(IReadOnlyList<UserRef> Items, int TotalCount)> GetFriendsAsync(
        long userId, int skip, int take, CancellationToken cancellationToken = default)
        => PageAsync(Friends(userId), AsFollowee, skip, take, cancellationToken);

    public async Task<(HashSet<long> ViewerFollows, HashSet<long> FollowsViewer)> GetRelationsAsync(
        long viewerId, IReadOnlyCollection<long> otherIds, CancellationToken cancellationToken = default)
    {
        var rows = await Set
            .Where(f => (f.FollowerId == viewerId && otherIds.Contains(f.FolloweeId))
                        || (f.FolloweeId == viewerId && otherIds.Contains(f.FollowerId)))
            .Select(f => new { f.FollowerId, f.FolloweeId })
            .ToListAsync(cancellationToken);

        return (
            rows.Where(r => r.FollowerId == viewerId).Select(r => r.FolloweeId).ToHashSet(),
            rows.Where(r => r.FolloweeId == viewerId).Select(r => r.FollowerId).ToHashSet());
    }

    // Listeler sayaçlarla AYNI sorgulardan türer — sayaç ile liste uzunluğu ayrışamaz.
    private IQueryable<Follow> Followers(long userId)
        => Set.Where(f => f.FolloweeId == userId && f.Follower.DeletedAt == null);

    private IQueryable<Follow> Following(long userId)
        => Set.Where(f => f.FollowerId == userId && f.Followee.DeletedAt == null);

    /// <summary>userId'nin takip ettiği VE onu geri takip eden aktif kullanıcılar.</summary>
    private IQueryable<Follow> Friends(long userId)
        => Following(userId).Where(f => Set.Any(g => g.FollowerId == f.FolloweeId && g.FolloweeId == userId));

    /// <summary>En yeni takip önce; aynı anda oluşmuş satırlarda Id sırayı kararlı kılar.</summary>
    private static async Task<(IReadOnlyList<UserRef> Items, int TotalCount)> PageAsync(
        IQueryable<Follow> query, Expression<Func<Follow, UserRef>> projection,
        int skip, int take, CancellationToken cancellationToken)
    {
        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(f => f.CreatedAt).ThenByDescending(f => f.Id)
            .Skip(skip).Take(take)
            .Select(projection)
            .ToListAsync(cancellationToken);
        return (items, total);
    }
}
