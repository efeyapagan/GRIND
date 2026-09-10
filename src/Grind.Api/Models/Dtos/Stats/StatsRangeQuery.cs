namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Dört istatistik ucunun (<c>volume/daily</c>, <c>volume/by-exercise</c>, <c>calendar</c>,
/// <c>body-weight-trend</c>) ortak parametreleri. TR yerel günü, iki ucu da dahil, ikisi de
/// opsiyonel (verilmezse o yönde sınır yok). Tek bir tip: dört uçta dört ayrı sorgu sınıfı
/// tanımlamak aynı kuralı dört kez yazmak olurdu.
/// </summary>
public class StatsRangeQuery
{
    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }
}
