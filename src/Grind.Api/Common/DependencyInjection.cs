using System.Text;
using Grind.Api.Common.ErrorHandling;
using Grind.Api.Common.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace Grind.Api.Common;

public static class DependencyInjection
{
    /// <summary>HmacSha256 en az 256 bit anahtar ister.</summary>
    private const int MinimumKeyBytes = 32;

    public static IServiceCollection AddCrossCutting(
        this IServiceCollection services, JwtSettings jwtSettings)
    {
        if (Encoding.UTF8.GetByteCount(jwtSettings.Key) < MinimumKeyBytes)
        {
            throw new InvalidOperationException(
                $"Jwt:Key en az {MinimumKeyBytes} byte olmalı (HmacSha256 gereği). " +
                "Değeri user-secrets veya ortam değişkeninden verin.");
        }

        services.AddSingleton(jwtSettings);
        services.AddSingleton<ITokenService, TokenService>();

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        services.AddProblemDetails();
        services.AddExceptionHandler<GlobalExceptionHandler>();

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // .NET varsayılanı gelen "sub" claim'ini ClaimTypes.NameIdentifier'a
                // yeniden adlandırır; kapatmazsak AppClaims.UserId ile okumak boş döner.
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = jwtSettings.Issuer,
                    ValidAudience = jwtSettings.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtSettings.Key)),
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateIssuerSigningKey = true,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };
            });

        services.AddAuthorization();

        return services;
    }
}
