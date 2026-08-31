using System.ComponentModel.DataAnnotations;
using Grind.Api.Common.Validation;

namespace Grind.Api.Models.Dtos.Auth;

public class RegisterRequest
{
    /// <summary>
    /// Yalnızca ASCII: Türkçe İ/ı'nın küçültme davranışı .NET ile PostgreSQL arasında ayrışıyor
    /// ("İ".ToLowerInvariant() iki kod noktası üretir, lower() ise 'i'). ASCII'ye kısınca sorun
    /// hiç var olmuyor (spec Soru 4).
    /// </summary>
    [Required(ErrorMessage = "Kullanıcı adı zorunlu.")]
    [RegularExpression("^[a-zA-Z0-9_-]{3,50}$",
        ErrorMessage = "Kullanıcı adı 3-50 karakter olmalı; yalnızca İngilizce harf, rakam, _ ve - içerebilir.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Şifre zorunlu.")]
    [MinLength(8, ErrorMessage = "Şifre en az 8 karakter olmalı.")]
    [MaxUtf8Bytes(72, ErrorMessage = "Şifre en fazla 72 bayt olabilir (BCrypt sınırı).")]
    public string Password { get; set; } = string.Empty;
}
