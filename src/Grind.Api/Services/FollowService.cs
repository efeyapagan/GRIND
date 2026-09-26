using Grind.Api.Common;
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
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
    IUserAvatarRepository avatarRepository,
    IUserSummaryBuilder summaryBuilder,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IFollowService
{
    public const int SearchLimit = 20;

    public async Task FollowAsync(string username, CancellationToken cancellationToken = default)
    {
        var target = await userRepository.GetActiveByUsernameOrThrowAsync(username, cancellationToken);
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
        var target = await userRepository.GetActiveByUsernameOrThrowAsync(username, cancellationToken);
        var follow = await followRepository.GetAsync(currentUser.UserId, target.Id, cancellationToken);
        if (follow is null)
            return;

        followRepository.Remove(follow);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserProfileResponse> GetProfileAsync(string username, CancellationToken cancellationToken = default)
    {
        var target = await userRepository.GetActiveByUsernameOrThrowAsync(username, cancellationToken);
        var counts = await followRepository.GetCountsAsync(target.Id, cancellationToken);
        var relations = await summaryBuilder.RelationsAsync([target.Id], cancellationToken);
        var avatarUpdatedAt = await avatarRepository.GetUpdatedAtAsync(target.Id, cancellationToken);
        var today = TurkeyDay.LocalDateOf(timeProvider.GetUtcNow().UtcDateTime);

        return new UserProfileResponse(
            target.Username,
            target.DisplayName,
            target.BirthDate is { } birthDate ? AgeCalculator.AgeOn(birthDate, today) : null,
            avatarUpdatedAt is not null,
            avatarUpdatedAt is { } updatedAt ? AvatarVersion.Of(updatedAt) : null,
            counts.Friends, counts.Followers, counts.Following, relations(target.Id), target.PrivacyLevel);
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
        var users = await userRepository.SearchActiveAsync(
            UsernameNormalizer.Normalize(query), query.Trim(), currentUser.UserId, SearchLimit, cancellationToken);
        return await summaryBuilder.BuildAsync(users, cancellationToken);
    }

    private async Task<PagedResponse<UserSummaryResponse>> ListAsync(
        string username, PagedQuery query,
        Func<long, int, int, CancellationToken, Task<(IReadOnlyList<UserRef> Items, int TotalCount)>> fetch,
        CancellationToken cancellationToken)
    {
        var target = await userRepository.GetActiveByUsernameOrThrowAsync(username, cancellationToken);
        var (items, total) = await fetch(target.Id, query.Skip(), query.PageSize, cancellationToken);
        return new PagedResponse<UserSummaryResponse>(
            await summaryBuilder.BuildAsync(items, cancellationToken), query.Page, query.PageSize, total);
    }
}
