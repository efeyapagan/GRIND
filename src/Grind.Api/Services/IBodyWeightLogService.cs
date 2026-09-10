using Grind.Api.Models.Dtos.BodyWeight;
using Grind.Api.Models.Dtos.Common;

namespace Grind.Api.Services;

public interface IBodyWeightLogService
{
    /// <summary>
    /// Kaydeder. Fazla ondalık veya şimdiden 5 dakikadan fazla ileride bir zaman
    /// ValidationException (400).
    /// </summary>
    Task<BodyWeightLogResponse> CreateAsync(
        CreateBodyWeightRequest request, CancellationToken cancellationToken = default);

    /// <summary>Yeniden eskiye, sayfalı. Sonuç yoksa BOŞ sayfa (404 değil).</summary>
    Task<PagedResponse<BodyWeightLogResponse>> GetPageAsync(
        PagedRangeQuery query, CancellationToken cancellationToken = default);

    /// <summary>Başkasının kaydında NotFoundException (404).</summary>
    Task<BodyWeightLogResponse> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    /// <summary>Boş gövdede ValidationException; başkasının kaydında NotFoundException.</summary>
    Task<BodyWeightLogResponse> PatchAsync(
        long id, PatchBodyWeightRequest request, CancellationToken cancellationToken = default);

    /// <summary>Başkasının kaydında NotFoundException.</summary>
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
