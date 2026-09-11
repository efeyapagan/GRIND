using Grind.Api.Models.Dtos.BodyWeight;
using Grind.Api.Models.Dtos.History;
using Grind.Api.Models.Dtos.Record;

namespace Grind.Api.Models.Dtos.Export;

/// <summary>
/// Tam export (Faz 11). JSON ucu bunu olduğu gibi döner, metin ucu AYNI modeli formatlar (spec
/// Karar 3). Var olan DTO'lar yeniden kullanılıyor: aynı veri için ikinci bir şekil yok.
///
/// <see cref="GeneratedAt"/> UTC'dir. <see cref="From"/>/<see cref="To"/> istekteki TR günleridir
/// (null = o yönde sınır yok). <see cref="AllTimeRecords"/> ARALIKTAN BAĞIMSIZDIR (spec Karar 2).
/// Listeler eskiden yeniye sıralıdır (spec Karar 7).
/// </summary>
public record ExportResponse(
    DateTime GeneratedAt,
    DateOnly? From,
    DateOnly? To,
    ExportSummaryResponse Summary,
    IReadOnlyList<HistorySessionResponse> Sessions,
    IReadOnlyList<BodyWeightLogResponse> BodyWeights,
    IReadOnlyList<ExerciseRecordResponse> AllTimeRecords);
