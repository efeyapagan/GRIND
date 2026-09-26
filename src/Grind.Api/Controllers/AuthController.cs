using Grind.Api.Common;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Grind.Api.Controllers;

/// <summary>
/// İnce kalır: doğrulamayı [ApiController] + DataAnnotations, hata çevirisini
/// GlobalExceptionHandler yapar. Burada if/try yoktur.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    /// <summary>Yeni kullanıcı oluşturur ve doğrudan giriş yapmış sayar (token döner).</summary>
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Register)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<AuthResponse>> Register(
        RegisterRequest request, CancellationToken cancellationToken)
        => Ok(await authService.RegisterAsync(request, cancellationToken));

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Login)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<AuthResponse>> Login(
        LoginRequest request, CancellationToken cancellationToken)
        => Ok(await authService.LoginAsync(request, cancellationToken));

    /// <summary>
    /// "Bu kullanıcı adı alınabilir mi?" (#372). Profili düzenle penceresi, kullanıcı yazmayı
    /// bırakınca bunu sorar; Kaydet'te 409 yemesin diye. Kimlikli: anonim bir istemcinin kullanıcı
    /// adı taraması için açık bir uç değildir.
    /// </summary>
    [HttpGet("username-available")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UsernameAvailabilityResponse>> IsUsernameAvailable(
        [FromQuery] UsernameAvailabilityRequest request, CancellationToken cancellationToken)
        => Ok(await authService.IsUsernameAvailableAsync(request, cancellationToken));

    /// <summary>
    /// Hesabı pasifleştirir: HİÇBİR veri silinmez, kullanıcı giriş yapamaz hâle gelir ve elindeki
    /// token anında geçersizleşir. Doğru şifreyle tekrar giriş yapmak hesabı geri açar; kullanıcı adı
    /// bu süre boyunca rezerve kalır (spec Karar 4). Şifre teyidi gövdededir.
    /// </summary>
    [HttpDelete("me")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DeleteMe(
        DeleteAccountRequest request, CancellationToken cancellationToken)
    {
        await authService.DeactivateAsync(request, cancellationToken);

        return NoContent();
    }

    /// <summary>
    /// Kullanıcı adı ve/veya şifre değiştirir (issue #65). [Authorize] BİLEREK bu action'a ayrı
    /// eklenir, sınıf seviyesine DEĞİL -- bkz. Register/Login'deki [AllowAnonymous] yorumu: sınıf
    /// seviyesindeki bir öznitelik, ileride eklenecek her yeni action'ı sessizce ezerdi.
    /// </summary>
    [HttpPatch("me")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthResponse>> UpdateMe(
        UpdateProfileRequest request, CancellationToken cancellationToken)
        => Ok(await authService.UpdateProfileAsync(request, cancellationToken));
}
