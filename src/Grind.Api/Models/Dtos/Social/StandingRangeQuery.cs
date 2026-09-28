namespace Grind.Api.Models.Dtos.Social;

/// <summary>
/// Arkadaş sıralamasının dönemi (#420): TR yerel günü, iki ucu dahil. İkisi birden ya da hiçbiri —
/// hiçbiri bugünkü haftadır (parametresiz çağrının #418'den beri süren davranışı). Kurallar
/// <see cref="Services.StandingRange"/>'de.
///
/// <c>StatsRangeQuery</c> ile aynı ŞEKİL ama aynı kural DEĞİL: orada uçlar bağımsız ve verilmeyen
/// yönde sınır yoktur; burada aralık her zaman somut ve en fazla bir takvim ayıdır.
/// </summary>
public class StandingRangeQuery
{
    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }
}
