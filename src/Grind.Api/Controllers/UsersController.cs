using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Dtos.Profile;
using Grind.Api.Models.Dtos.Record;
using Grind.Api.Models.Dtos.Social;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace Grind.Api.Controllers;

/// <summary>
/// Kullanıcılar arası takip (#281) ve profil fotoğrafı (#280) herkese açık başlık bilgisidir. Antrenman
/// verisi yalnızca <c>history</c>/<c>records</c> uçlarında ve hedefin gizlilik seviyesine göre açıktır
/// (#282, #294). Hedef kullanıcı adıyla verilir; kimlik (bakan) her zaman token'dan gelir.
/// </summary>
[ApiController]
[Authorize]
[Route("api/users")]
public class UsersController(
    IFollowService followService,
    IProfileService profileService,
    IPublicActivityService publicActivityService) : ControllerBase
{
    /// <summary>Kullanıcı adı ön-ekiyle arama (büyük/küçük harf duyarsız), en fazla 20 sonuç.</summary>
    [HttpGet("search")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<UserSummaryResponse>>> Search(
        [FromQuery, Required, StringLength(50, MinimumLength = 1)] string q, CancellationToken cancellationToken)
        => Ok(await followService.SearchAsync(q, cancellationToken));

    /// <summary>Profil başlığı: sayaçlar ve bakanın ilişkisi (kendisi / yok / takip / takipçi / arkadaş).</summary>
    [HttpGet("{username}/profile")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserProfileResponse>> GetProfile(string username, CancellationToken cancellationToken)
        => Ok(await followService.GetProfileAsync(username, cancellationToken));

    /// <summary>
    /// Profil fotoğrafı (#280) — kimlikli her kullanıcı görebilir; kullanıcı yok, pasif ya da fotoğrafsızsa
    /// 404. <c>no-cache</c> + <c>ETag</c>: tarayıcı saklar ama her seferinde sorar, değişmediyse 304 alır —
    /// başkasının fotoğrafının güncel sürümünü bilmeyen istemci de eski resimde takılı kalmaz.
    /// </summary>
    [HttpGet("{username}/avatar")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status304NotModified)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAvatar(string username, CancellationToken cancellationToken)
    {
        var avatar = await profileService.GetAvatarAsync(username, cancellationToken);
        var etag = new EntityTagHeaderValue($"\"{avatar.Version}\"");

        Response.Headers.CacheControl = "private, no-cache";
        Response.Headers.ETag = etag.ToString();
        if (Request.GetTypedHeaders().IfNoneMatch.Any(tag => tag.Compare(etag, useStrongComparison: false)))
            return StatusCode(StatusCodes.Status304NotModified);

        return File(avatar.Content, avatar.ContentType);
    }

    /// <summary>Takip et — onay yok, idempotent. Kendini takip 400.</summary>
    [HttpPost("{username}/follow")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Follow(string username, CancellationToken cancellationToken)
    {
        await followService.FollowAsync(username, cancellationToken);
        return NoContent();
    }

    /// <summary>Takibi bırak — idempotent.</summary>
    [HttpDelete("{username}/follow")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Unfollow(string username, CancellationToken cancellationToken)
    {
        await followService.UnfollowAsync(username, cancellationToken);
        return NoContent();
    }

    /// <summary>Arkadaşlar (karşılıklı takip), en yeni önce.</summary>
    [HttpGet("{username}/friends")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResponse<UserSummaryResponse>>> GetFriends(
        string username, [FromQuery] PagedQuery query, CancellationToken cancellationToken)
        => Ok(await followService.GetFriendsAsync(username, query, cancellationToken));

    /// <summary>
    /// Hedefin antrenman geçmişi (#282, #294) — <c>/api/history</c> ile aynı filtreler, oturum notu hariç.
    /// Gizlilik seviyesine göre kısıtlanır (<c>Kisitli</c> = son 5, <c>Gizli</c> = boş liste); hedef
    /// pasif ya da yoksa 404.
    /// </summary>
    [HttpGet("{username}/history")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResponse<FriendHistorySessionResponse>>> GetHistory(
        string username, [FromQuery] HistoryQuery query, CancellationToken cancellationToken)
        => Ok(await publicActivityService.GetHistoryAsync(username, query, cancellationToken));

    /// <summary>
    /// Hedefin tüm zamanların rekorları (#282, #294) — <c>/api/records</c> ile aynı yanıt. Gizlilik
    /// seviyesinden bağımsız görünür.
    /// </summary>
    [HttpGet("{username}/records")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<ExerciseRecordResponse>>> GetRecords(
        string username, CancellationToken cancellationToken)
        => Ok(await publicActivityService.GetRecordsAsync(username, cancellationToken));

    /// <summary>Takipçiler, en yeni önce.</summary>
    [HttpGet("{username}/followers")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResponse<UserSummaryResponse>>> GetFollowers(
        string username, [FromQuery] PagedQuery query, CancellationToken cancellationToken)
        => Ok(await followService.GetFollowersAsync(username, query, cancellationToken));

    /// <summary>Takip edilenler, en yeni önce.</summary>
    [HttpGet("{username}/following")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResponse<UserSummaryResponse>>> GetFollowing(
        string username, [FromQuery] PagedQuery query, CancellationToken cancellationToken)
        => Ok(await followService.GetFollowingAsync(username, query, cancellationToken));
}
