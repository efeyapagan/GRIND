using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http;

namespace Grind.Api.Common;

/// <summary>
/// Login/register limitleyicilerinin bölümleme (partition) mantığı — Program.cs'teki gerçek HTTP
/// kablolamasından (<c>RateLimiterOptions.AddPolicy</c>, ki geriye okunamaz — public bir
/// <c>GetPolicy</c> yoktur) BİLEREK ayrı, saf bir fonksiyon olarak tutulur ki ASP.NET Core
/// pipeline'ı hiç kurmadan, doğrudan birim testiyle sınanabilsin (issue #74).
/// </summary>
public static class AuthRateLimiterPartitions
{
    public static RateLimitPartition<string> Login(HttpContext httpContext, AuthRateLimitSettings settings) =>
        RateLimitPartition.GetFixedWindowLimiter(ClientIp(httpContext), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = settings.LoginPermitLimit,
            Window = TimeSpan.FromMinutes(settings.LoginWindowMinutes),
            QueueLimit = 0
        });

    public static RateLimitPartition<string> Register(HttpContext httpContext, AuthRateLimitSettings settings) =>
        RateLimitPartition.GetFixedWindowLimiter(ClientIp(httpContext), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = settings.RegisterPermitLimit,
            Window = TimeSpan.FromMinutes(settings.RegisterWindowMinutes),
            QueueLimit = 0
        });

    /// <summary>
    /// Bölümleme anahtarı IP. DİKKAT: uygulama bir reverse proxy arkasına girerse
    /// ForwardedHeaders yapılandırılmadığı sürece TÜM istekler proxy'nin IP'sinden geliyor
    /// görünür ve bir kullanıcı herkesi kilitler — deploy anında hatırlanmalı.
    /// </summary>
    public static string ClientIp(HttpContext httpContext) =>
        httpContext.Connection.RemoteIpAddress?.ToString() ?? "bilinmiyor";
}
