using Grind.Api.Models.Dtos.Profile;
using Grind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Controllers;

/// <summary>
/// Kullanıcının kendi profili (#280): görünen isim, doğum tarihi (yaş hesaplanır), profil fotoğrafı.
/// Kimlik token'dan gelir. Başkasının fotoğrafı <c>GET /api/users/{username}/avatar</c>'dan okunur.
/// </summary>
[ApiController]
[Authorize]
[Route("api/profile")]
public class ProfileController(IProfileService profileService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<ProfileResponse>> Get(CancellationToken cancellationToken)
        => Ok(await profileService.GetAsync(cancellationToken));

    /// <summary>İki alan da yazılır, <c>null</c> temizler. Gelecek tarih ya da 13 yaş altı / 120 üstü 400.</summary>
    [HttpPut]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProfileResponse>> Put(
        UpdateProfileDetailsRequest request, CancellationToken cancellationToken)
        => Ok(await profileService.UpdateAsync(request, cancellationToken));

    /// <summary>
    /// Fotoğraf yükler ya da değiştirir (multipart, tek dosya <c>file</c>). En fazla 256 KB, JPEG/PNG/WebP.
    /// İstek boyutu sınırı, sınırı çok aşan bir gövdenin belleğe okunmasını baştan keser.
    /// </summary>
    [HttpPut("avatar")]
    [RequestSizeLimit(ProfileService.MaxAvatarBytes + 16 * 1024)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> PutAvatar(IFormFile file, CancellationToken cancellationToken)
    {
        await using var stream = file.OpenReadStream();
        await profileService.SetAvatarAsync(stream, cancellationToken);
        return NoContent();
    }

    [HttpDelete("avatar")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteAvatar(CancellationToken cancellationToken)
    {
        await profileService.DeleteAvatarAsync(cancellationToken);
        return NoContent();
    }
}
