namespace Grind.Api.Common;

/// <summary>
/// Rate limiting politika adları (issue #74). Sabit: <c>[EnableRateLimiting(...)]</c> özniteliği
/// bir derleme-zamanı sabiti ister, bu yüzden Program.cs'teki tanımla controller'daki kullanım
/// aynı sabiti paylaşır (DRY) — bir string'i iki yerde elle eşitlemek yerine.
/// </summary>
public static class RateLimitPolicies
{
    public const string Login = "auth-login";
    public const string Register = "auth-register";
}
