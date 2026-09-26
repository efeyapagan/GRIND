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
    /// satır silinmez. Şifre yanlışsa UnauthorizedException; token'daki UserId veritabanında hiçbir
    /// satıra karşılık gelmiyorsa (örn. hesap bir şekilde silinmişse) da AYNI UnauthorizedException.
    /// </summary>
    Task DeactivateAsync(DeleteAccountRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Verilen kullanıcı adı KAYIT için alınabilir mi (#372). Pasif hesapların adı da REZERVEDIR
    /// (Faz 13 kararı), bu yüzden onlar da "alınmış" sayılır — `GET /api/users/{username}` bu soruya
    /// doğru cevap veremez, orada pasif hesap 404'tür. Çağıranın KENDİ adı uygun sayılır.
    /// </summary>
    Task<UsernameAvailabilityResponse> IsUsernameAvailableAsync(
        UsernameAvailabilityRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kullanıcı adı ve/veya şifre değiştirir (issue #65). <see cref="UpdateProfileRequest.CurrentPassword"/>
    /// yalnızca ŞİFRE değişiminde zorunludur (#378); gönderildiyse her hâlükârda doğrulanır ve
    /// yanlışsa UnauthorizedException. Yeni kullanıcı adı başkasına aitse
    /// ConflictException. En az biri (yeni ad ya da yeni şifre) verilmemişse ValidationException.
    /// Başarılı değişiklik sonrası YENİ bir token döner (register/login ile aynı şekilde) — kullanıcı
    /// adı değişince eski token'ın içindeki isim bayatlar, kullanıcı yeniden giriş yapmak zorunda
    /// kalmamalı.
    /// </summary>
    Task<AuthResponse> UpdateProfileAsync(UpdateProfileRequest request, CancellationToken cancellationToken = default);
}
