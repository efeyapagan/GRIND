namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Dört istatistik ucunun (<c>volume/daily</c>, <c>volume/by-exercise</c>, <c>calendar</c>,
/// <c>body-weight-trend</c>) ve iki export ucunun (<c>export/json</c>, <c>export/text</c>, Faz 11)
/// ortak parametreleri. TR yerel günü, iki ucu da dahil, ikisi de opsiyonel (verilmezse o yönde sınır
/// yok). Tek bir tip: her uçta ayrı bir sorgu sınıfı tanımlamak aynı kuralı altı kez yazmak olurdu.
/// </summary>
public class StatsRangeQuery
{
    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }
}
