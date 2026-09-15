using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

public class AuthService(
    IUserRepository userRepository,
    IUnitOfWork unitOfWork,
    ITokenService tokenService,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IAuthService
{
    /// <summary>~220 ms/hash. Donanım hızlandıkça yükseltilecek yer burasıdır.</summary>
    private const int WorkFactor = 12;

    /// <summary>
    /// Kullanıcı yok da olsa şifre yanlış da olsa AYNI metin. Bir dalın mesajını
    /// zenginleştirmek ("böyle bir kullanıcı yok") kararın tamamını geçersiz kılar.
    /// </summary>
    internal const string InvalidCredentials = "Kullanıcı adı veya şifre hatalı.";

    /// <summary>
    /// Kullanıcı bulunamadığında karşılaştırılacak GERÇEK bir BCrypt hash'i. Yer tutucu bir
    /// metin olamaz: BCrypt.Verify bozuk hash'te SaltParseException fırlatır ve yanıt 500 olur.
    /// </summary>
    internal static readonly string DummyPasswordHash =
        BCrypt.Net.BCrypt.HashPassword("kullanici-bulunamadi", WorkFactor);

    public async Task<AuthResponse> RegisterAsync(
        RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var username = Normalize(request.Username);

        if (await userRepository.UsernameExistsAsync(username, excludeId: null, cancellationToken))
        {
            throw new ConflictException($"'{username}' kullanıcı adı zaten alınmış.");
        }

        var user = new User
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, WorkFactor),
            CreatedAt = Now()
        };

        userRepository.Add(user);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Respond(user);
    }

    public async Task<AuthResponse> LoginAsync(
        LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByUsernameAsync(Normalize(request.Username), cancellationToken);

        // DİKKAT: Verify HER ZAMAN çalışmalı. Bunu `user is null || !Verify(...)` hâline
        // getirmek kısa devre yapar; kullanıcı yokken yanıt ~1ms'de döner ve zamanlama farkı
        // kayıtlı username'leri sayar hâle gelir. Değişken bu yüzden önce hesaplanıyor.
        var passwordMatches = BCrypt.Net.BCrypt.Verify(
            request.Password, user?.PasswordHash ?? DummyPasswordHash);

        if (user is null || !passwordMatches)
        {
            throw new UnauthorizedException(InvalidCredentials);
        }

        if (user.DeletedAt is not null)
        {
            // Şifre DOĞRULANDIKTAN sonra: pasiflik bilgisi yanlış şifreyle sızmamalı (spec Karar 2).
            // Ayrı bir "geri aç" ucu yok — doğru şifreyle giriş yapmak niyetin kendisidir.
            user.DeletedAt = null;
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return Respond(user);
    }

    public async Task DeactivateAsync(
        DeleteAccountRequest request, CancellationToken cancellationToken = default)
    {
        // Kimlik token'dan gelir, gövdeden değil: pasifleştirilecek hesap her zaman çağıranın kendisi.
        var user = await userRepository.GetByIdAsync(currentUser.UserId, cancellationToken)
                   ?? throw new UnauthorizedException(InvalidCredentials);

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedException(InvalidCredentials);
        }

        // Yalnızca damga: oturumlar, setler, rekorlar, tartılar ve yorumlar olduğu gibi kalır.
        user.DeletedAt = Now();
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<AuthResponse> UpdateProfileAsync(
        UpdateProfileRequest request, CancellationToken cancellationToken = default)
    {
        if (request.NewUsername is null && request.NewPassword is null)
        {
            // Bos govde DTO dogrulamasini gecer (ikisi de opsiyonel). Sessizce 200 donmek
            // cagiranin isteginin uygulandigini sanmasina yol acardi (SetEntryService.PatchAsync
            // ile ayni gerekce).
            throw new ValidationException("En az kullanıcı adı ya da şifreden biri gönderilmeli.");
        }

        // Kimlik token'dan gelir, govdeden degil: degistirilecek hesap her zaman cagiranin kendisi.
        var user = await userRepository.GetByIdAsync(currentUser.UserId, cancellationToken)
                   ?? throw new UnauthorizedException(InvalidCredentials);

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        {
            throw new UnauthorizedException(InvalidCredentials);
        }

        if (request.NewUsername is { } yeniAd)
        {
            var normalized = Normalize(yeniAd);
            if (await userRepository.UsernameExistsAsync(normalized, user.Id, cancellationToken))
            {
                throw new ConflictException($"'{normalized}' kullanıcı adı zaten alınmış.");
            }
            user.Username = normalized;
        }

        if (request.NewPassword is { } yeniSifre)
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(yeniSifre, WorkFactor);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Respond(user);
    }

    /// <summary>
    /// Username veritabanında her zaman küçük harf durur. DTO regex'i girdiyi ASCII'ye
    /// kısıtladığı için ToLowerInvariant burada güvenli (Türkçe İ sorunu oluşamaz).
    /// </summary>
    private static string Normalize(string username) => username.Trim().ToLowerInvariant();

    private DateTime Now() => timeProvider.GetUtcNow().UtcDateTime;

    private AuthResponse Respond(User user)
    {
        var token = tokenService.CreateToken(user.Id, user.Username);
        return new AuthResponse(token.Token, token.ExpiresAtUtc, user.Username);
    }
}
