using System.Globalization;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Grind.Api.Common.Security;

public class TokenService(JwtSettings settings) : ITokenService
{
    public TokenResult CreateToken(long userId, string username)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(settings.ExpiryMinutes);

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = settings.Issuer,
            Audience = settings.Audience,
            Expires = expiresAt,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.Key)),
                SecurityAlgorithms.HmacSha256),
            Claims = new Dictionary<string, object>
            {
                [AppClaims.UserId] = userId.ToString(CultureInfo.InvariantCulture),
                [AppClaims.Username] = username
            }
        };

        return new TokenResult(new JsonWebTokenHandler().CreateToken(descriptor), expiresAt);
    }
}
