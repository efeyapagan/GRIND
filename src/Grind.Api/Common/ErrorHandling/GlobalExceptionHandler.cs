using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Grind.Api.Common.ErrorHandling;

/// <summary>
/// Altından kaçan her exception'ı yakalar, loglar ve RFC 7807 ProblemDetails olarak yanıtlar.
/// Rollback İŞİ DEĞİLDİR — o, Unit of Work seviyesinde bundan önce bitmiş olmalıdır.
/// </summary>
public class GlobalExceptionHandler(
    IProblemDetailsService problemDetailsService,
    IHostEnvironment environment,
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (statusCode, title) = Map(exception);
        var userId = httpContext.User.FindFirst(AppClaims.UserId)?.Value ?? "anonim";

        // 5xx bizim hatamız, 4xx çağıranın: ikisini aynı seviyede loglamak gürültü yaratır.
        if (statusCode >= StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception,
                "İşlenmemiş hata. Yol: {Path}, Kullanıcı: {UserId}", httpContext.Request.Path, userId);
        }
        else
        {
            logger.LogWarning(
                "İstek reddedildi ({StatusCode}). Yol: {Path}, Kullanıcı: {UserId}, Sebep: {Reason}",
                statusCode, httpContext.Request.Path, userId, exception.Message);
        }

        httpContext.Response.StatusCode = statusCode;

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = statusCode,
                Title = title,
                Detail = Detail(exception, statusCode),
                Instance = httpContext.Request.Path
            }
        });
    }

    private static (int StatusCode, string Title) Map(Exception exception) => exception switch
    {
        NotFoundException => (StatusCodes.Status404NotFound, "Kayıt bulunamadı"),
        ValidationException => (StatusCodes.Status400BadRequest, "Geçersiz istek"),
        UnauthorizedException => (StatusCodes.Status401Unauthorized, "Kimlik doğrulanamadı"),
        ForbiddenException => (StatusCodes.Status403Forbidden, "İzin yok"),
        ConflictException => (StatusCodes.Status409Conflict, "Çakışma"),
        _ => (StatusCodes.Status500InternalServerError, "Beklenmeyen bir hata oluştu")
    };

    /// <summary>
    /// Domain exception'larının mesajı kullanıcıya söylenmek içindir. 500'ünki değildir:
    /// iç mesaj bağlantı dizesi, dosya yolu veya şema ayrıntısı sızdırabilir.
    /// </summary>
    private string Detail(Exception exception, int statusCode)
        => statusCode == StatusCodes.Status500InternalServerError && !environment.IsDevelopment()
            ? "Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin."
            : exception.Message;
}
