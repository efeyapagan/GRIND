using System.Globalization;
using System.Text;
using Grind.Api.Common.ErrorHandling;
using Grind.Api.Common.Security;
using Grind.Api.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

namespace Grind.Api.Common;

public static class DependencyInjection
{
    /// <summary>HmacSha256 en az 256 bit anahtar ister.</summary>
    private const int MinimumKeyBytes = 32;

    public static IServiceCollection AddCrossCutting(
        this IServiceCollection services, JwtSettings jwtSettings, IHostEnvironment environment)
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
                // Development dışında ayrıntılı doğrulama hatası (ör. token süresi, ne zaman
                // geçerli olacağı) WWW-Authenticate başlığında client'a sızmasın.
                options.IncludeErrorDetails = environment.IsDevelopment();
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
                    ClockSkew = TimeSpan.Zero,
                    // Varsayılan ClaimTypes.Name eşlemesi token'da yok; ayarlamazsak
                    // User.Identity.Name sessizce null döner.
                    NameClaimType = AppClaims.Username
                };

                // Token imzayı ve ömrü geçse bile hesap pasifleştirilmişse istek kimliksiz sayılır
                // (Faz 13 spec Karar 3). CLAUDE.md'nin kuralı: zamanla değişebilen bir öznitelik
                // token'a gömülmez, her istekte GÜNCEL durum veritabanından okunur. Token 7 gün
                // geçerli olduğu için bu kontrol olmasaydı pasifleştirme bir hafta boyunca etkisiz
                // kalırdı. [AllowAnonymous] uçları (register/login) token taşımadığı için buradan
                // geçmez — pasif kullanıcının giriş yapıp hesabını geri açması engellenmez.
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        // İstek scope'undan: repository ve logger scoped, bu olay ise singleton
                        // seçenekler içinde yaşıyor.
                        var logger = context.HttpContext.RequestServices
                            .GetRequiredService<ILoggerFactory>()
                            .CreateLogger("Grind.Api.Common.DependencyInjection");

                        var raw = context.Principal?.FindFirst(AppClaims.UserId)?.Value;

                        if (!long.TryParse(
                                raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var userId))
                        {
                            logger.LogWarning(
                                "Token reddedildi: kullanıcı kimliği ayrıştırılamadı. Yol: {Path}",
                                context.HttpContext.Request.Path);
                            context.Fail("Token geçerli bir kullanıcı kimliği taşımıyor.");
                            return;
                        }

                        var users = context.HttpContext.RequestServices.GetRequiredService<IUserRepository>();

                        if (!await users.ExistsActiveAsync(userId, context.HttpContext.RequestAborted))
                        {
                            logger.LogWarning(
                                "Token reddedildi: hesap pasif. Yol: {Path}, Kullanıcı: {UserId}",
                                context.HttpContext.Request.Path, userId);
                            context.Fail("Hesap pasif.");
                        }
                    }
                };
            });

        // Fallback: [Authorize] ya da [AllowAnonymous] TAŞIMAYAN her endpoint kimlik ister.
        // Böylece yeni bir controller'da [Authorize] yazmayı unutmak endpoint'i açıkta
        // bırakmaz, kapatır. Eşleşmeyen yollar da bu politikaya tabidir: kimliksiz bir
        // istemci 404/401 farkından hangi rotaların var olduğunu çıkaramaz.
        services.AddAuthorization(options =>
        {
            options.FallbackPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
        });

        return services;
    }
}
