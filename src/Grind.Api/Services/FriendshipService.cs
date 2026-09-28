using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class FriendshipService(IFollowRepository followRepository) : IFriendshipService
{
    public async Task<bool> AreFriendsAsync(
        long userId1, long userId2, CancellationToken cancellationToken = default)
    {
        var (follows, followedBy) = await followRepository.GetRelationsAsync(userId1, [userId2], cancellationToken);
        return follows.Contains(userId2) && followedBy.Contains(userId2);
    }
}
