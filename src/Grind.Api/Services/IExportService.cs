using Grind.Api.Models.Dtos.Export;
using Grind.Api.Models.Dtos.Stats;

namespace Grind.Api.Services;

/// <summary>
/// Dışa aktarma (Faz 11). SALT OKUMA: <c>SaveChangesAsync</c> çağırmaz. Metin, JSON modelinin
/// formatlanmış halidir; ikisi ayrı sorgulardan üretilmez (spec Karar 3).
/// </summary>
public interface IExportService
{
    /// <summary>
    /// Aralığın tam export'u. <c>from</c>/<c>to</c> verilmezse tüm geçmiş. Rekorlar ve seriler
    /// aralıktan BAĞIMSIZDIR (spec Karar 2).
    /// </summary>
    Task<ExportResponse> GetAsync(StatsRangeQuery query, CancellationToken cancellationToken = default);

    /// <summary><see cref="GetAsync"/>'in bir yapay zeka ajanına yapıştırılabilir metin hali.</summary>
    Task<string> GetTextAsync(StatsRangeQuery query, CancellationToken cancellationToken = default);
}
