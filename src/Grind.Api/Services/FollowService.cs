using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Social;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class FollowService(
    IFollowRepository followRepository,
    IUserRepository userRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IFollowService
{
    public const int SearchLimit = 20;

    public async Task FollowAsync(string username, CancellationToken cancellationToken = default)
    {
        var target = await GetActiveUserAsync(username, cancellationToken);
        if (target.Id == currentUser.UserId)
            throw new ValidationException("Kendini takip edemezsin.");

        if (await followRepository.GetAsync(currentUser.UserId, target.Id, cancellationToken) is not null)
            return;

        followRepository.Add(new Follow
        {
            FollowerId = currentUser.UserId,
            FolloweeId = target.Id,
            CreatedAt = timeProvider.GetUtcNow().UtcDateTime
        });

        try
        {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (ConflictException)
        {
            // Eşzamanlı çift istek ön-kontrolü birlikte geçtiyse benzersiz indeks ikinciyi durdurur;
            // sonuç yine "takip ediliyor" olduğu için idempotent sözleşme gereği hata sayılmaz.
        }
    }

    public async Task UnfollowAsync(string username, CancellationToken cancellationToken = default)
    {
        var target = await GetActiveUserAsync(username, cancellationToken);
        var follow = await followRepository.GetAsync(currentUser.UserId, target.Id, cancellationToken);
        if (follow is null)
            return;

        followRepository.Remove(follow);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserProfileResponse> GetProfileAsync(string username, CancellationToken cancellationToken = default)
    {
        var target = await GetActiveUserAsync(username, cancellationToken);
        var counts = await followRepository.GetCountsAsync(target.Id, cancellationToken);
        var relations = await RelationsAsync([target.Id], cancellationToken);

        return new UserProfileResponse(
            target.Username, counts.Friends, counts.Followers, counts.Following, relations(target.Id));
    }

    public Task<PagedResponse<UserSummaryResponse>> GetFriendsAsync(
        string username, PagedQuery query, CancellationToken cancellationToken = default)
        => ListAsync(username, query, followRepository.GetFriendsAsync, cancellationToken);

    public Task<PagedResponse<UserSummaryResponse>> GetFollowersAsync(
        string username, PagedQuery query, CancellationToken cancellationToken = default)
        => ListAsync(username, query, followRepository.GetFollowersAsync, cancellationToken);

    public Task<PagedResponse<UserSummaryResponse>> GetFollowingAsync(
        string username, PagedQuery query, CancellationToken cancellationToken = default)
        => ListAsync(username, query, followRepository.GetFollowingAsync, cancellationToken);

    public async Task<IReadOnlyList<UserSummaryResponse>> SearchAsync(
        string query, CancellationToken cancellationToken = default)
    {
        var users = await userRepository.SearchActiveByUsernamePrefixAsync(
            UsernameNormalizer.Normalize(query), currentUser.UserId, SearchLimit, cancellationToken);
        return await SummariesAsync(users, cancellationToken);
    }

    private async Task<PagedResponse<UserSummaryResponse>> ListAsync(
        string username, PagedQuery query,
        Func<long, int, int, CancellationToken, Task<(IReadOnlyList<UserRef> Items, int TotalCount)>> fetch,
        CancellationToken cancellationToken)
    {
        var target = await GetActiveUserAsync(username, cancellationToken);
        var (items, total) = await fetch(target.Id, query.Skip(), query.PageSize, cancellationToken);
        return new PagedResponse<UserSummaryResponse>(
            await SummariesAsync(items, cancellationToken), query.Page, query.PageSize, total);
    }

    private async Task<IReadOnlyList<UserSummaryResponse>> SummariesAsync(
        IReadOnlyList<UserRef> users, CancellationToken cancellationToken)
    {
        var relation = await RelationsAsync(users.Select(u => u.Id).ToList(), cancellationToken);
        return users.Select(u => new UserSummaryResponse(u.Username, relation(u.Id))).ToList();
    }

    /// <summary>Oturum açmış kullanıcının verilen kişilerle ilişkisi — tek sorgu, sonra bellekte.</summary>
    private async Task<Func<long, FollowRelation>> RelationsAsync(
        IReadOnlyCollection<long> otherIds, CancellationToken cancellationToken)
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

    /// <summary>Pasif hesap, olmayan hesapla aynı 404'ü alır — pasifliği sızmaz.</summary>
    private async Task<User> GetActiveUserAsync(string username, CancellationToken cancellationToken)
    {
        var user = await userRepository.GetByUsernameAsync(UsernameNormalizer.Normalize(username), cancellationToken);
        return user is { DeletedAt: null } ? user : throw new NotFoundException("Kullanıcı bulunamadı.");
    }
}
