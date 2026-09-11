using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Insight;

/// <summary>
/// Saklanan bir AI yorumu. <c>RangeFrom</c>/<c>RangeTo</c> yorumun kapsadığı TR günleridir (Suggestion'da
/// null). <c>Model</c> fiilen yanıtlayan modeldir. <c>EstimatedCostUsd</c> fiyat yapılandırılmamışsa null.
/// </summary>
public record AiInsightResponse(
    long Id,
    AiInsightKind Kind,
    long? WorkoutSessionId,
    long? SetEntryId,
    DateOnly? RangeFrom,
    DateOnly? RangeTo,
    string Content,
    string Model,
    int? TokensUsed,
    decimal? EstimatedCostUsd,
    DateTime CreatedAt);
