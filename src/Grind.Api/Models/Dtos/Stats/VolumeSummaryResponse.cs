namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Hacim özeti zarfı. Generic: gün bazlı ve egzersiz bazlı uçlar aynı zarfı paylaşır ama
/// satır tipleri ayrıdır — tek bir satır tipinde hem <c>date</c> hem <c>exerciseId</c> taşıyıp
/// yarısını null bırakmak, istemcinin "hangi alan dolu" diye tahmin etmesi demek olurdu
/// (spec Karar 4).
/// <c>From</c>/<c>To</c> isteğin kendisidir; null ise o yönde sınır yoktu.
/// </summary>
public record VolumeSummaryResponse<T>(
    DateOnly? From,
    DateOnly? To,
    decimal TotalVolume,
    IReadOnlyList<T> Items);
