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
/// #436 (kullanıcı kararı): geçmiş artık yalnızca BİTMİŞ ve EN AZ BİR SETİ olan oturumları
/// gösterir. Devam eden antrenman kendi ucundan (<c>/api/sessions/open</c>) gelir; şablonla
/// açılıp hiç set girilmeden bırakılmış oturum listeyi "0 set 0 kg" satırlarıyla kirletiyordu.
/// Süzgeç <c>WorkoutSessionRepository.FilterHistory</c>'de, tek yerde.
///
/// Bu, önceki "geçmiş bir oturum GÜNLÜĞÜdür, setsiz oturum burada yine görünür" kararının
/// (spec Karar 3) yerini alır. Takvim/hacim/streak uçları zaten kendi süzgeçlerini uyguluyordu
/// ve değişmedi.
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
