using Grind.Api.Models.Dtos.Set;

namespace Grind.Api.Models.Dtos.History;

/// <summary>
/// Geçmişteki bir oturum ve setleri. Setler için Faz 8'in <see cref="SetEntryResponse"/>'u
/// yeniden kullanılıyor — ikinci bir set DTO'su aynı veriyi iki biçimde sunmanın bakım
/// maliyetini getirirdi (DRY).
///
/// DİKKAT: <c>exerciseId</c> filtresi verildiğinde <see cref="TotalVolume"/> ve
/// <see cref="SetCount"/> YALNIZCA o egzersizin setlerini kapsar ve <see cref="Sets"/> ile
/// birebir tutarlıdır (spec Karar 8) — ekranda "14 set" yazıp listede 4 set göstermemek için.
/// </summary>
public record HistorySessionResponse(
    long SessionId,
    DateTime StartedAt,
    DateTime? EndedAt,
    string? TemplateName,
    string? Notes,
    decimal TotalVolume,
    int SetCount,
    IReadOnlyList<SetEntryResponse> Sets);
