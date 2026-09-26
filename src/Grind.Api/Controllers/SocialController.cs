using Grind.Api.Models.Dtos.Social;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// Sosyal ÖZETLER (#418). Kişi bazlı uçlar (<c>/api/users/{username}/...</c>) UsersController'da
/// kalır; burada çağıranın çevresine dair toplu görünümler durur. İnce kalır: kural
/// FriendWeeklyService'te.
/// </summary>
[ApiController]
[Authorize]
[Route("api/social")]
public class SocialController(IFriendWeeklyService friendWeeklyService) : ControllerBase
{
    /// <summary>
    /// Haftalık sıralama: ÇAĞIRAN ve arkadaşları (#425). Gün sayısı, hedef, bugün antrenman
    /// yaptı mı, hacim ve set. Sıralama istemcide (bir arayüz kararı); gizlilik seviyesi
    /// <c>Gizli</c> olan ARKADAŞ yoktur, ama çağıranın kendi satırı her zaman vardır.
    /// </summary>
    [HttpGet("weekly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<WeeklyStandingResponse>>> GetWeeklyStandings(
        CancellationToken cancellationToken)
        => Ok(await friendWeeklyService.GetAsync(cancellationToken));
}
