using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthResponse>> Register(
        RegisterRequest request, CancellationToken cancellationToken)
        => Ok(await authService.RegisterAsync(request, cancellationToken));

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> Login(
        LoginRequest request, CancellationToken cancellationToken)
        => Ok(await authService.LoginAsync(request, cancellationToken));

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
}
