using Grind.Api.Models.Dtos.Common;

namespace Grind.Api.Models.Dtos.History;

/// <summary>
/// Geçmiş sorgusu: ortak tarih aralığı + sayfalama (<see cref="PagedRangeQuery"/>) ve opsiyonel
/// egzersiz filtresi.
/// </summary>
public class HistoryQuery : PagedRangeQuery
{
    public long? ExerciseId { get; set; }
}
