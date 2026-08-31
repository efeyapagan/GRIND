namespace Grind.Api.Common.Security;

/// <summary>
/// `appsettings.json`'daki "Jwt" bölümü. `Key` orada BOŞ durur; gerçek değer
/// user-secrets veya ortam değişkeninden gelir.
/// </summary>
public class JwtSettings
{
    public string Key { get; set; } = string.Empty;

    public string Issuer { get; set; } = string.Empty;

    public string Audience { get; set; } = string.Empty;

    public int ExpiryMinutes { get; set; }
}
