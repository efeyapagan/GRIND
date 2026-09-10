namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Üç istatistik ucunun ortak parametreleri. TR yerel günü, iki ucu da dahil, ikisi de
/// opsiyonel (verilmezse o yönde sınır yok). Tek bir tip: üç uçta üç ayrı sorgu sınıfı
/// tanımlamak aynı kuralı üç kez yazmak olurdu.
/// </summary>
public class StatsRangeQuery
{
    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }
}
