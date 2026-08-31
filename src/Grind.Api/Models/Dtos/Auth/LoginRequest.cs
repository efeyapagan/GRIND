using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Auth;

/// <summary>
/// Kayıt kuralları BİLEREK tekrarlanmaz: kurallar sonradan sıkılaşırsa eski kullanıcılar
/// kilitlenir, ayrıca kurala uymayan bir username'e 400, uyana 401 dönmek saldırgana
/// ayrıştırma imkânı verir. Buradaki tek kural: alanlar dolu olsun.
/// </summary>
public class LoginRequest
{
    [Required(ErrorMessage = "Kullanıcı adı zorunlu.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Şifre zorunlu.")]
    public string Password { get; set; } = string.Empty;
}
