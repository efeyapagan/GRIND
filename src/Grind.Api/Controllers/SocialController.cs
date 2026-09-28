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
    /// Arkadaş sıralaması: ÇAĞIRAN ve arkadaşları (#425), istenen DÖNEMDE (#420 — takvimin
    /// gösterdiği hafta ya da ay; <c>from</c>/<c>to</c> ikisi birden ya da hiçbiri, hiçbiri = bu
    /// hafta, en fazla 31 gün). Gün sayısı, hedef, bugün antrenman yaptı mı, hacim ve set.
    /// Sıralama istemcide (bir arayüz kararı); gizlilik seviyesi <c>Gizli</c> olan ARKADAŞ yoktur,
    /// ama çağıranın kendi satırı her zaman vardır. Yol adındaki "weekly" #418'den kalma: ikinci bir
    /// uç açmak yerine bu uç genişletildi.
    /// </summary>
    [HttpGet("weekly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<StandingResponse>>> GetStandings(
        [FromQuery] StandingRangeQuery query, CancellationToken cancellationToken)
        => Ok(await friendWeeklyService.GetAsync(query, cancellationToken));
}
