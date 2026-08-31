namespace Grind.Api.Common.Security;

/// <summary>Üretilen erişim token'ı ve ne zaman geçersizleşeceği.</summary>
public record TokenResult(string Token, DateTime ExpiresAtUtc);

public interface ITokenService
{
    /// <summary>
    /// Yalnızca kimlik taşıyan bir JWT üretir. Rol/plan gibi zamanla değişebilen
    /// öznitelikler bilerek dışarıda bırakılır (CLAUDE.md kararı).
    /// </summary>
    TokenResult CreateToken(long userId, string username);
}
