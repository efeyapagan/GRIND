namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Antrenman süresi özeti (issue #73). ORTALAMA yerine MEDYAN raporlanır (
/// <see cref="MedianSeconds"/>) — kapatmayı unutulan tek bir oturum ortalamayı anlamsızlaştırırdı.
/// <see cref="LikelyForgottenCount"/>, süresi 4 saati aşan (muhtemelen kapatmayı unutulmuş)
/// KAPANMIŞ oturum sayısıdır — bunlar hesaptan ÇIKARILMAZ (<see cref="TotalSeconds"/> hâlâ gerçek
/// toplamdır), sadece şeffaflık için ayrıca raporlanır. Hâlâ açık olan (<c>EndedAt</c> null)
/// oturumlar bu özete HİÇ girmez — <see cref="SessionCount"/> yalnızca KAPANMIŞ oturumları sayar.
/// </summary>
public record DurationSummaryResponse(
    DateOnly? From,
    DateOnly? To,
    long? MedianSeconds,
    long TotalSeconds,
    int SessionCount,
    int LikelyForgottenCount);
