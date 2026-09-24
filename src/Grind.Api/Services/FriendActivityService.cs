using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Dtos.Record;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

/// <summary>
/// Hesabın kendisi yazılmaz: geçmiş ve rekor servisleri hedef kullanıcının id'siyle yeniden kullanılır (DRY).
/// </summary>
public class FriendActivityService(
    IUserRepository userRepository,
    IFollowRepository followRepository,
    IWorkoutHistoryService historyService,
    IPersonalRecordService recordService,
    ICurrentUserService currentUser) : IFriendActivityService
{
    public async Task<PagedResponse<FriendHistorySessionResponse>> GetHistoryAsync(
        string username, HistoryQuery query, CancellationToken cancellationToken = default)
    {
        var page = await historyService.GetForUserAsync(
            await AuthorizedUserIdAsync(username, cancellationToken), query, cancellationToken);

        return new PagedResponse<FriendHistorySessionResponse>(
            page.Items.Select(FriendHistorySessionResponse.From).ToList(), page.Page, page.PageSize, page.TotalCount);
    }

    public async Task<IReadOnlyList<ExerciseRecordResponse>> GetRecordsAsync(
        string username, CancellationToken cancellationToken = default)
        => await recordService.GetAllTimeForUserAsync(
            await AuthorizedUserIdAsync(username, cancellationToken), cancellationToken);

    /// <summary>
    /// Arkadaş verisine giden her yolun TEK kapısı. 403 hedefin varlığını sızdırmaz: profil başlığı
    /// (<c>/api/users/{username}/profile</c>) kimlikli herkese zaten açık.
    /// </summary>
    private async Task<long> AuthorizedUserIdAsync(string username, CancellationToken cancellationToken)
    {
        var target = await userRepository.GetActiveByUsernameOrThrowAsync(username, cancellationToken);
        var viewerId = currentUser.UserId;

        if (target.Id != viewerId && !await followRepository.AreFriendsAsync(viewerId, target.Id, cancellationToken))
            throw new ForbiddenException("Bu kullanıcının antrenmanlarını yalnızca arkadaşları görebilir.");

        return target.Id;
    }
}
