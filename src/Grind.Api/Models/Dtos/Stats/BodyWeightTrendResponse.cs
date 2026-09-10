namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Kilo ve antrenman hacmi, aynı zaman ekseninde çizilmek üzere İKİ AYRI SERİ (spec Karar 3). Her
/// seri yalnızca kendi verisi olan günleri taşır — gün gün birleşik satır, tartı olmayan günde
/// kiloyu, antrenman olmayan günde hacmi sürekli null bırakırdı (Faz 9 Karar 4'te reddedilen desen).
/// <see cref="Volume"/> satırları <c>GET /api/stats/volume/daily</c> ile AYNI tip ve AYNI hesap
/// yolundan gelir; iki uç aynı günü asla farklı raporlamaz.
/// </summary>
public record BodyWeightTrendResponse(
    DateOnly? From,
    DateOnly? To,
    IReadOnlyList<DailyBodyWeightResponse> BodyWeight,
    IReadOnlyList<DailyVolumeResponse> Volume);
