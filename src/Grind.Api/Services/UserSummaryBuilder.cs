using Grind.Api.Common;
using Grind.Api.Common.Security;
using Grind.Api.Models.Dtos.Social;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class UserSummaryBuilder(
    IFollowRepository followRepository,
    IUserAvatarRepository avatarRepository,
    ICurrentUserService currentUser) : IUserSummaryBuilder
{
    public async Task<IReadOnlyList<UserSummaryResponse>> BuildAsync(
        IReadOnlyList<UserRef> users, CancellationToken cancellationToken = default)
    {
        var ids = users.Select(u => u.Id).ToList();
        var relation = await RelationsAsync(ids, cancellationToken);
        var avatars = await avatarRepository.GetUpdatedAtsAsync(ids, cancellationToken);
        return users.Select(u => new UserSummaryResponse(
            u.Username,
            u.DisplayName,
            avatars.ContainsKey(u.Id),
            avatars.TryGetValue(u.Id, out var updatedAt) ? AvatarVersion.Of(updatedAt) : null,
            relation(u.Id))).ToList();
    }

    public async Task<Func<long, FollowRelation>> RelationsAsync(
        IReadOnlyCollection<long> otherIds, CancellationToken cancellationToken = default)
    {
        var viewerId = currentUser.UserId;
        var (viewerFollows, followsViewer) = await followRepository.GetRelationsAsync(
            viewerId, otherIds, cancellationToken);

        return id => (id == viewerId, viewerFollows.Contains(id), followsViewer.Contains(id)) switch
        {
            (true, _, _) => FollowRelation.Self,
            (_, true, true) => FollowRelation.Friends,
            (_, true, false) => FollowRelation.Following,
            (_, false, true) => FollowRelation.FollowedBy,
            _ => FollowRelation.None
        };
    }
}
