using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Dtos.Profile;
using Grind.Api.Models.Dtos.Record;
using Grind.Api.Models.Dtos.Social;
using Grind.Api.Models.Dtos.Template;
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
    IFriendRequestService friendRequestService,
    IProfileService profileService,
    IPublicActivityService publicActivityService,
    ISharedTemplateService sharedTemplateService) : ControllerBase
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

    /// <summary>#628: arkadaşlık isteği gönder — zaten arkadaşsa/bekliyorsa no-op; 3 retten sonra 400.</summary>
    [HttpPost("{username}/friend-request")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SendFriendRequest(string username, CancellationToken cancellationToken)
    {
        await friendRequestService.SendAsync(username, cancellationToken);
        return NoContent();
    }

    /// <summary>#628: gönderdiğim isteği geri çek — idempotent.</summary>
    [HttpDelete("{username}/friend-request")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> WithdrawFriendRequest(string username, CancellationToken cancellationToken)
    {
        await friendRequestService.WithdrawAsync(username, cancellationToken);
        return NoContent();
    }

    /// <summary>#628: bana gelen isteği kabul et — iki taraf karşılıklı takip eder. İstek yoksa 404.</summary>
    [HttpPost("{username}/friend-request/accept")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AcceptFriendRequest(string username, CancellationToken cancellationToken)
    {
        await friendRequestService.AcceptAsync(username, cancellationToken);
        return NoContent();
    }

    /// <summary>#628: bana gelen isteği reddet — takipler değişmez. İstek yoksa 404.</summary>
    [HttpPost("{username}/friend-request/reject")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RejectFriendRequest(string username, CancellationToken cancellationToken)
    {
        await friendRequestService.RejectAsync(username, cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// #628: bu kişiyi takipçilerimden çıkar. Arkadaşken "Arkadaşlıktan çıkar" da budur — arkadaşlık biter,
    /// ben takipte kalırım. İdempotent.
    /// </summary>
    [HttpDelete("{username}/follower")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveFollower(string username, CancellationToken cancellationToken)
    {
        await followService.RemoveFollowerAsync(username, cancellationToken);
        return NoContent();
    }

    /// <summary>#628: takip ettiğim birinden gelen tüm bildirimleri kapat/aç. Takip etmiyorsam 400.</summary>
    [HttpPut("{username}/mute")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetMuted(string username, MuteRequest request, CancellationToken cancellationToken)
    {
        await followService.SetMutedAsync(username, request.Muted, cancellationToken);
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

    /// <summary>
    /// Hedefin paylaşılan şablonları (#467) — arkadaşlık ŞARTTIR (History/Records'un aksine).
    /// Arkadaş değilsen boş liste, hedef pasif/yoksa 404.
    /// </summary>
    [HttpGet("{username}/templates")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<SharedTemplateResponse>>> GetSharedTemplates(
        string username, CancellationToken cancellationToken)
        => Ok(await sharedTemplateService.GetSharedTemplatesAsync(username, cancellationToken));

    /// <summary>Görünür değilse 404 (hangi şablonun var olduğunu sızdırmaz).</summary>
    [HttpGet("{username}/templates/{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SharedTemplateResponse>> GetSharedTemplateDetail(
        string username, long id, CancellationToken cancellationToken)
        => Ok(await sharedTemplateService.GetSharedTemplateDetailAsync(username, id, cancellationToken));

    /// <summary>Kendi hesabına anlık görüntü olarak kopyalar (#467).</summary>
    [HttpPost("{username}/templates/{id:long}/save")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TemplateResponse>> SaveSharedTemplate(
        string username, long id, CancellationToken cancellationToken)
    {
        var saved = await sharedTemplateService.SaveTemplateAsync(username, id, cancellationToken);
        return Created($"/api/templates/{saved.Id}", saved);
    }
}
