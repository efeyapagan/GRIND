using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Insight;

namespace Grind.Api.Services;

/// <summary>AI yorumları (Faz 12). Üretim yalnızca <c>Kind = Insight</c>; okuma ve silme her tür için.</summary>
public interface IAiInsightService
{
    /// <summary>
    /// Aralığın export metnini sağlayıcıya yorumlatır ve saklar. Ters/çok uzun/verisiz aralık
    /// ValidationException (400); sağlayıcı kapalı ya da başarısızsa ServiceUnavailableException (503) ve
    /// hiçbir satır yazılmaz.
    /// </summary>
    Task<AiInsightResponse> GenerateAsync(
        GenerateInsightRequest request, CancellationToken cancellationToken = default);

    /// <summary>Kendi yorumların, yeniden eskiye, sayfalı. Sonuç yoksa BOŞ sayfa (404 değil).</summary>
    Task<PagedResponse<AiInsightResponse>> GetPageAsync(
        AiInsightQuery query, CancellationToken cancellationToken = default);

    /// <summary>Başkasının ya da olmayan kayıtta NotFoundException (404).</summary>
    Task<AiInsightResponse> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    /// <summary>Başkasının ya da olmayan kayıtta NotFoundException (404).</summary>
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
