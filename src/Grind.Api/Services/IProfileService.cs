using Grind.Api.Models.Dtos.Profile;

namespace Grind.Api.Services;

/// <summary>
/// Profil alanları ve profil fotoğrafı (#280). Yazma uçlarında kimlik her zaman token'dan gelir;
/// fotoğraf okuma herkese açık başlık bilgisidir (kimlikli her kullanıcı).
/// </summary>
public interface IProfileService
{
    Task<ProfileResponse> GetAsync(CancellationToken cancellationToken = default);

    /// <summary>Görünen isim ve doğum tarihini yazar; geçersizse 400.</summary>
    Task<ProfileResponse> UpdateAsync(UpdateProfileDetailsRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Fotoğrafı yükler ya da değiştirir. En fazla <see cref="ProfileService.MaxAvatarBytes"/>; tür
    /// dosyanın imzasından belirlenir, yalnızca JPEG/PNG/WebP — aksi 400.
    /// </summary>
    Task SetAvatarAsync(Stream content, CancellationToken cancellationToken = default);

    /// <summary>Fotoğrafı siler — idempotent.</summary>
    Task DeleteAvatarAsync(CancellationToken cancellationToken = default);

    /// <summary>Aktif kullanıcının fotoğrafı; kullanıcı yok, pasif ya da fotoğrafsızsa 404.</summary>
    Task<AvatarContent> GetAvatarAsync(string username, CancellationToken cancellationToken = default);
}
