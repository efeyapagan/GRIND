namespace Grind.Api.Models.Entities;

/// <summary>
/// Bir AI yorumunun tek bir dildeki metni (#199). Bir üretim = bir <see cref="AiInsight"/> (aralık,
/// model, token, maliyet, an) + dil başına bir bu satır.
///
/// Neden ayrı tablo, neden <c>AiInsight</c>'ta "ContentEn" gibi ikinci bir kolon DEĞİL: her yeni dil
/// bir migration demek olurdu ve "uygulamaya yeni dil eklendikçe AI da o dilde yorumlasın" şartıyla
/// çelişirdi; tekrar eden grup 1NF'yi de ihlal ederdi.
///
/// Neden dil başına ayrı bir <c>AiInsight</c> satırı DEĞİL: <c>TokensUsed</c>/<c>EstimatedCostUsd</c>
/// TEK bir LLM çağrısına aittir, satır başına kopyalanması onları yanlış yapardı; haftalık üretim
/// sınırı da <c>AiInsight</c> sayar, iki dil bir hakkı iki sayardı.
/// </summary>
public class AiInsightTranslation
{
    public long Id { get; set; }
    public long AiInsightId { get; set; }

    /// <summary>Dil kodu (<c>InsightLanguages.All</c> ile aynı yazım: "tr", "en").</summary>
    public string Language { get; set; } = null!;

    public string Content { get; set; } = null!;

    public AiInsight AiInsight { get; set; } = null!;
}
