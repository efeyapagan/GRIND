using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Social;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// Kullanıcılar arası takip (#281). Yalnızca herkese açık başlık bilgisi döner — antrenman verisi yok.
/// Hedef kullanıcı adıyla verilir; kimlik (takip eden) her zaman token'dan gelir.
/// </summary>
[ApiController]
[Authorize]
[Route("api/users")]
public class UsersController(IFollowService followService) : ControllerBase
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
