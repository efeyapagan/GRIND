namespace Grind.Api.Models.Dtos.Insight;

/// <summary>
/// Yorum üretme isteği (Faz 12 spec Karar 14). <c>From</c>/<c>To</c> TR yerel günüdür, iki ucu dahil.
/// Verilmezse son 30 gün: <c>To</c> = bugün, <c>From</c> = <c>To</c> − 29. En fazla 366 gün.
/// <c>StatsRangeQuery</c>'den bilerek ayrı: şekil aynı, anlam farklı — orada null "sınır yok", burada
/// "son 30 gün" demek.
/// </summary>
public class GenerateInsightRequest
{
    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }
}
