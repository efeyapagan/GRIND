namespace Grind.Api.Models.Dtos.Profile;

/// <summary>
/// Profil alanları (#280) — PUT: iki alan da her istekte yazılır, <c>null</c> temizler. Doğrulama
/// serviste: isim sınırı kırpmadan SONRA uygulanır, yaş sınırı "bugün"e bağlıdır; ikisi de bir
/// DataAnnotation ile ifade edilemez. Kullanıcı adı ve şifre burada değil, <c>PATCH /api/auth/me</c>'de.
/// </summary>
public class UpdateProfileDetailsRequest
{
    public string? DisplayName { get; set; }
    public DateOnly? BirthDate { get; set; }
}
