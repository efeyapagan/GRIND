using Grind.Api.Models.Dtos.Auth;

namespace Grind.Api.Services;

public interface IAuthService
{
    /// <summary>Kullanıcı adı alınmışsa ConflictException fırlatır (karşılaştırma küçük harf üzerinden).</summary>
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kullanıcı yoksa da şifre yanlışsa da AYNI UnauthorizedException'ı fırlatır. Şifre doğruysa ve
    /// hesap pasifse hesabı yeniden aktifleştirir (Faz 13 spec Karar 2).
    /// </summary>
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Giriş yapmış kullanıcının hesabını pasifleştirir: yalnızca <c>DeletedAt</c> damgalanır, HİÇBİR
    /// satır silinmez. Şifre yanlışsa UnauthorizedException.
    /// </summary>
    Task DeactivateAsync(DeleteAccountRequest request, CancellationToken cancellationToken = default);
}
