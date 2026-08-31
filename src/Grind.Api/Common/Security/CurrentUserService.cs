using System.Globalization;

namespace Grind.Api.Common.Security;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public long UserId
    {
        get
        {
            var raw = Claim(AppClaims.UserId);

            return long.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var id)
                ? id
                : throw new InvalidOperationException(
                    "İstekte geçerli bir kullanıcı kimliği yok. Endpoint [Authorize] taşımıyor olabilir.");
        }
    }

    public string Username
        => Claim(AppClaims.Username)
           ?? throw new InvalidOperationException(
               "İstekte kullanıcı adı claim'i yok. Endpoint [Authorize] taşımıyor olabilir.");

    private string? Claim(string claimType)
        => httpContextAccessor.HttpContext?.User.FindFirst(claimType)?.Value;
}
