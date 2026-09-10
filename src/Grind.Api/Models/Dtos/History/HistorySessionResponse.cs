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
///
/// BİLEREK: hiç seti girilmemiş (açılıp hiç kullanılmamış) bir oturum burada
/// <c>SetCount = 0, TotalVolume = 0</c> ile YİNE GÖRÜNÜR, ama takvim/günlük hacim/streak
/// uçlarında hiç görünmez (spec Karar 3). Bu bir tutarsızlık değil: geçmiş bir oturum
/// GÜNLÜĞÜdür (oturumun kendisi olay), istatistikler bir ANTRENMAN günlüğüdür (yalnızca
/// gerçekten çalışılan gün sayılır). Bu ayrımı "düzeltmeye" kalkışmayın.
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
