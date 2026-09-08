using System.ComponentModel.DataAnnotations;
using Grind.Api.Common.Validation;

namespace Grind.Api.Models.Dtos.Auth;

/// <summary>
/// Kayıt kuralları BİLEREK tekrarlanmaz: kurallar sonradan sıkılaşırsa eski kullanıcılar
/// kilitlenir, ayrıca kurala uymayan bir username'e 400, uyana 401 dönmek saldırgana
/// ayrıştırma imkânı verir. Buradaki kurallar: alanlar dolu olsun ve şifre 72 baytı geçmesin.
/// </summary>
public class LoginRequest
{
    [Required(ErrorMessage = "Kullanıcı adı zorunlu.")]
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// Bu tek kural (72 bayt üst sınırı) BİLEREK tekrarlanıyor — format kuralları gibi
    /// hesaba özgü bir bilgi sızdırmıyor, herkes için aynı. Sınır olmasa BCrypt.Verify
    /// 72 bayttan uzun girdiyi sessizce keser (deneyle doğrulandı: 72 bayt 'a' ile hash'lenmiş
    /// bir şifre, sonuna rastgele ek yapılmış 100 baytlık girdiyle de doğrulanıyor) — yani tam
    /// 72 baytlık bir şifresi olan kullanıcı, şifresinin sonuna HERHANGİ bir ek yapılarak da
    /// giriş yapılabilir hâle gelirdi.
    /// </summary>
    [Required(ErrorMessage = "Şifre zorunlu.")]
    [MaxUtf8Bytes(72, ErrorMessage = "Şifre en fazla 72 bayt olabilir (BCrypt sınırı).")]
    public string Password { get; set; } = string.Empty;
}
