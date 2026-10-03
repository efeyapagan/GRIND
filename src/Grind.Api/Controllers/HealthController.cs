using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// #174: mobil istemcinin "sunucuya ulaşılabiliyor mu" yoklaması (çevrimdışı şeridi). Bilerek kimliksiz ve
/// verisiz: oturum düşmüşken de yoklanabilmeli, hiçbir bilgi sızdırmamalı.
/// </summary>
[ApiController]
[Route("api/health")]
[AllowAnonymous]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => NoContent();
}
