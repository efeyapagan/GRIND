using Grind.Api.Models.Dtos.Auth;

namespace Grind.Api.Services;

public interface IAuthService
{
    /// <summary>Kullanıcı adı alınmışsa ConflictException fırlatır (karşılaştırma küçük harf üzerinden).</summary>
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);

    /// <summary>Kullanıcı yoksa da şifre yanlışsa da AYNI UnauthorizedException'ı fırlatır.</summary>
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
}
