using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Auth;

/// <summary>
/// Uygunluk sorgusunun sorgu dizesi (#372). Biçim kuralı <see cref="RegisterRequest.Username"/> ile
/// AYNI — istemci de aynı kuralı uyguluyor, ama uç bozuk girdiyi yine de kabul etmez (biri değişirse
/// diğeri BİLEREK kontrol edilmeli; UpdateProfileRequest'teki aynı not).
/// </summary>
public class UsernameAvailabilityRequest
{
    [Required(ErrorMessage = "Kullanıcı adı zorunlu.")]
    [RegularExpression("^[a-zA-Z0-9_-]{3,50}$",
        ErrorMessage = "Kullanıcı adı 3-50 karakter olmalı; yalnızca İngilizce harf, rakam, _ ve - içerebilir.")]
    public string Username { get; set; } = string.Empty;
}
