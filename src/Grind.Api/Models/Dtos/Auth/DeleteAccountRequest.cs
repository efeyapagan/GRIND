using System.ComponentModel.DataAnnotations;
using Grind.Api.Common.Validation;

namespace Grind.Api.Models.Dtos.Auth;

/// <summary>
/// Hesabı pasifleştirmeden önce şifre teyidi (Faz 13 spec Karar 5). 72 baytlık üst sınır
/// <see cref="LoginRequest"/> ile aynı gerekçeyle burada da var: BCrypt.Verify daha uzun girdiyi
/// sessizce keser.
/// </summary>
public class DeleteAccountRequest
{
    [Required(ErrorMessage = "Şifre zorunlu.")]
    [MaxUtf8Bytes(72, ErrorMessage = "Şifre en fazla 72 bayt olabilir (BCrypt sınırı).")]
    public string Password { get; set; } = string.Empty;
}
