using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Social;

namespace Grind.Api.Services;

/// <summary>
/// Takip sistemi (#281): doğrudan takip (onay yok), arkadaş = karşılıklı takip. Buradaki her şey
/// herkese açık başlık bilgisidir; antrenman verisi paylaşmaz. Hedef kullanıcı adıyla verilir
/// (büyük/küçük harf duyarsız); pasif ya da olmayan hedef 404.
/// </summary>
public interface IFollowService
{
    /// <summary>İdempotent: zaten takip ediliyorsa hiçbir şey yapmaz. Kendini takip 400.</summary>
    Task FollowAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>İdempotent: takip edilmiyorsa hiçbir şey yapmaz.</summary>
    Task UnfollowAsync(string username, CancellationToken cancellationToken = default);

    Task<UserProfileResponse> GetProfileAsync(string username, CancellationToken cancellationToken = default);

    Task<PagedResponse<UserSummaryResponse>> GetFriendsAsync(
        string username, PagedQuery query, CancellationToken cancellationToken = default);

    Task<PagedResponse<UserSummaryResponse>> GetFollowersAsync(
        string username, PagedQuery query, CancellationToken cancellationToken = default);

    Task<PagedResponse<UserSummaryResponse>> GetFollowingAsync(
        string username, PagedQuery query, CancellationToken cancellationToken = default);

    /// <summary>Kullanıcı adı ön-ekiyle arama; en fazla 20 sonuç, aramayı yapan hariç.</summary>
    Task<IReadOnlyList<UserSummaryResponse>> SearchAsync(string query, CancellationToken cancellationToken = default);
}
