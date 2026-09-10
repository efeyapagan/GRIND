using Grind.Api.Models.Dtos.Set;

namespace Grind.Api.Services;

public interface ISetEntryService
{
    /// <summary>
    /// Bugüne ait açık oturumu bulur (yoksa açar) ve seti ona ekler; oturum ve set TEK
    /// SaveChangesAsync altında commit edilir. Arşivlenmiş egzersizde ValidationException,
    /// erişilemeyen egzersizde NotFoundException.
    /// </summary>
    Task<SetEntryResponse> CreateAsync(
        CreateSetRequest request, CancellationToken cancellationToken = default);

    /// <summary>Başkasının oturumunda NotFoundException (404).</summary>
    Task<IReadOnlyList<SetEntryResponse>> GetForSessionAsync(
        long sessionId, CancellationToken cancellationToken = default);

    /// <summary>Düzeltir ve o egzersizin rekorlarını HER ZAMAN yeniden hesaplar.</summary>
    Task<SetEntryResponse> PatchAsync(
        long id, PatchSetRequest request, CancellationToken cancellationToken = default);

    /// <summary>Siler ve o egzersizin rekorlarını HER ZAMAN yeniden hesaplar.</summary>
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
