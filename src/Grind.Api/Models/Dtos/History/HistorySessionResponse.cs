using Grind.Api.Models.Dtos.Set;
using Grind.Api.Models.Enums;

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
///
/// <see cref="DurationSeconds"/> açık oturumda (issue #73) null — bkz. <see cref="Grind.Api.Common.Time.DurationCalculator"/>.
///
/// <see cref="MedianRestSeconds"/> (#71): <see cref="Sets"/>'teki dinlenmelerin medyanı — filtreliyken de
/// listeyle tutarlı. Setlerin dinlenmesi ise filtreden BAĞIMSIZDIR (oturumun tüm setlerinden hesaplanır).
/// Hiç dinlenme yoksa <c>null</c>.
///
/// <see cref="Difficulty"/> (#118): bitirirken seçilen zorluk; null ise seçilmedi/atlandı ya da
/// oturum hâlâ açık. Export ucu (Faz 11) bu DTO'yu aynen kullandığı için ikinci bir alan
/// eklemeye gerek kalmadı (DRY).
/// </summary>
public record HistorySessionResponse(
    long SessionId,
    DateTime StartedAt,
    DateTime? EndedAt,
    long? DurationSeconds,
    string? TemplateName,
    string? Notes,
    SessionDifficulty? Difficulty,
    decimal TotalVolume,
    int SetCount,
    int? MedianRestSeconds,
    IReadOnlyList<SetEntryResponse> Sets);
