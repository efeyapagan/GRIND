using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.History;

namespace Grind.Api.Services;

/// <summary>
/// Antrenman geçmişi sorgusu. SALT OKUMA: <c>SaveChangesAsync</c> çağırmaz, <c>IUnitOfWork</c>
/// almaz.
/// </summary>
public interface IWorkoutHistoryService
{
    /// <summary>
    /// Filtreye uyan oturumlar, yeniden eskiye, setleriyle birlikte. Erişilemeyen bir
    /// <c>ExerciseId</c> için NotFoundException (404); sonuç yoksa BOŞ SAYFA (404 değil).
    /// </summary>
    Task<PagedResponse<HistorySessionResponse>> GetAsync(
        HistoryQuery query, CancellationToken cancellationToken = default);
}
