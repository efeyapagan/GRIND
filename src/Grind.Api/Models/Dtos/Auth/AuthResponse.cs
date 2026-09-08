namespace Grind.Api.Models.Dtos.Auth;

/// <summary>Kayıt ve giriş aynı yanıtı döner: istemci hemen isteğe devam edebilsin.</summary>
public record AuthResponse(string Token, DateTime ExpiresAtUtc, string Username);
