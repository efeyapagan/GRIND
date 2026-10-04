using Grind.Api.Data;
using Grind.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Grind.Api.Repositories;

public class FriendRequestRepository(AppDbContext context)
    : Repository<FriendRequest>(context), IFriendRequestRepository
{
    public Task<FriendRequest?> GetPendingAsync(long requesterId, long targetId, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(
            r => r.RequesterId == requesterId && r.TargetId == targetId && r.RejectedAt == null, cancellationToken);

    public Task<int> CountRejectedAsync(long requesterId, long targetId, CancellationToken cancellationToken = default)
        => Set.CountAsync(
            r => r.RequesterId == requesterId && r.TargetId == targetId && r.RejectedAt != null, cancellationToken);

    public async Task<IReadOnlyList<FriendRequest>> GetPairAsync(long a, long b, CancellationToken cancellationToken = default)
        => await Set
            .Where(r => (r.RequesterId == a && r.TargetId == b) || (r.RequesterId == b && r.TargetId == a))
            .ToListAsync(cancellationToken);
}
