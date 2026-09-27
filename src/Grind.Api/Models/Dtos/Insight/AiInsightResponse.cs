using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Insight;

/// <summary>
/// Saklanan bir AI yorumu. <c>RangeFrom</c>/<c>RangeTo</c> yorumun kapsadığı TR günleridir (Suggestion'da
/// null). <c>Model</c> fiilen yanıtlayan modeldir. <c>EstimatedCostUsd</c> fiyat yapılandırılmamışsa null.
///
/// <c>Translations</c> (#199): her üretim desteklenen TÜM dilleri içerir, bu yüzden istemci dili
/// değiştirmek için YENİ BİR İSTEK ATMAZ -- eldeki çeviriyi gösterir. Tek dilli dönemde üretilmiş
/// kayıtlarda yalnızca "tr" vardır; istemci seçili dili bulamazsa eldekini gösterir.
/// </summary>
public record AiInsightResponse(
    long Id,
    AiInsightKind Kind,
    long? WorkoutSessionId,
    long? SetEntryId,
    DateOnly? RangeFrom,
    DateOnly? RangeTo,
    IReadOnlyList<AiInsightTranslationResponse> Translations,
    string Model,
    int? TokensUsed,
    decimal? EstimatedCostUsd,
    DateTime CreatedAt);

/// <summary>Bir yorumun tek bir dildeki metni (#199).</summary>
public record AiInsightTranslationResponse(string Language, string Content);
