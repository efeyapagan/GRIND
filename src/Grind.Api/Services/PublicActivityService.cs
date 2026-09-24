using Grind.Api.Common.Security;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Dtos.Record;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

/// <summary>
/// Hesabın kendisi yazılmaz: geçmiş ve rekor servisleri hedef kullanıcının id'siyle yeniden kullanılır (DRY).
/// </summary>
public class PublicActivityService(
    IUserRepository userRepository,
    IWorkoutHistoryService historyService,
    IPersonalRecordService recordService,
    ICurrentUserService currentUser) : IPublicActivityService
{
    /// <summary><see cref="PrivacyLevel.Kisitli"/>'de gösterilen en fazla antrenman sayısı (#294).</summary>
    public const int RestrictedHistoryLimit = 5;

    public async Task<PagedResponse<FriendHistorySessionResponse>> GetHistoryAsync(
        string username, HistoryQuery query, CancellationToken cancellationToken = default)
    {
        var (targetId, level, isSelf) = await TargetAsync(username, cancellationToken);

        if (!isSelf && level == PrivacyLevel.Gizli)
            return new PagedResponse<FriendHistorySessionResponse>([], query.Page, query.PageSize, 0);

        if (!isSelf && level == PrivacyLevel.Kisitli)
        {
            query.Page = 1;
            query.PageSize = Math.Min(query.PageSize, RestrictedHistoryLimit);
        }

        var page = await historyService.GetForUserAsync(targetId, query, cancellationToken);

        return new PagedResponse<FriendHistorySessionResponse>(
            page.Items.Select(FriendHistorySessionResponse.From).ToList(), page.Page, page.PageSize, page.TotalCount);
    }

    /// <summary>Rekorlar gizlilik seviyesinden bağımsız görünür — <c>Gizli</c>'de bile ("sadece rekorlar gözükür").</summary>
    public async Task<IReadOnlyList<ExerciseRecordResponse>> GetRecordsAsync(
        string username, CancellationToken cancellationToken = default)
    {
        var (targetId, _, _) = await TargetAsync(username, cancellationToken);
        return await recordService.GetAllTimeForUserAsync(targetId, cancellationToken);
    }

    /// <summary>
    /// Başkasının verisine giden her yolun TEK kapısı. Kimlikli her kullanıcı için hedef aktif değilse ya da
    /// yoksa 404 — bunun ötesinde artık bir ilişki kontrolü YOK, içerik miktarı hedefin kendi
    /// <see cref="PrivacyLevel"/>'ine göre çağıran metotlarda belirlenir.
    /// </summary>
    private async Task<(long TargetId, PrivacyLevel Level, bool IsSelf)> TargetAsync(
        string username, CancellationToken cancellationToken)
    {
        var target = await userRepository.GetActiveByUsernameOrThrowAsync(username, cancellationToken);
        return (target.Id, target.PrivacyLevel, target.Id == currentUser.UserId);
    }
}
