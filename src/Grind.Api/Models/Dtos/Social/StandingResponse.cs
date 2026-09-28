namespace Grind.Api.Models.Dtos.Social;

/// <summary>
/// Arkadaş sıralamasının bir satırı (#418, #425, #420): bir arkadaşın ya da ÇAĞIRANIN KENDİSİNİN
/// istenen DÖNEMDEKİ özeti. Kullanıcı kendini de listede görür (#425) — kendi satırı gizlilik
/// seviyesinden etkilenmez ve sıralamada ayrıcalığı yoktur, aynı kurala girer.
///
/// #420: dönem artık "bu hafta"ya sabit değil — istemci ana sayfa takviminin gösterdiği haftayı ya
/// da ayı ister. Bu yüzden alan adları haftayı değil DÖNEMİ anlatır. Gün TR yerel günüdür
/// (CLAUDE.md); aynı gün içindeki birden fazla antrenman BİR gün sayılır.
///
/// <see cref="WeeklyTargetDays"/> kullanıcının HAFTALIK hedefidir, döneme göre ölçeklenmez: aylık
/// dönemde ×4 bir arayüz kararıdır (kullanıcı kararı, #420) ve istemcide
/// (`packages/shared/src/lib/arkadasSiralamasi.ts`, `donemHedefi`) uygulanır. <c>null</c> ise
/// kullanıcı hedef koymamıştır — satır listede kalır, ilerleme çubuğu yerine yalnızca gün sayısı
/// gösterilir.
///
/// Sıralama BİLEREK sunucuda yapılmaz: "hedefe ulaşma oranı" bir arayüz kararıdır ve hedefsiz
/// satırların nereye düşeceği de öyle; hesap istemcide saf bir fonksiyonda ve testlidir.
/// </summary>
public record StandingResponse(
    string Username,
    string? DisplayName,
    bool HasAvatar,
    long? AvatarVersion,
    /// <summary>Dönemde antrenman yapılan (seti olan) TR günü sayısı.</summary>
    int TrainedDays,
    int? WeeklyTargetDays,
    /// <summary>
    /// Bugün antrenman yaptı mı — yalnızca dönem BUGÜNÜ kapsıyorsa doğru olabilir; geçmiş bir
    /// dönemde her zaman <c>false</c> (dönem dışındaki oturumlar hiç okunmaz).
    /// </summary>
    bool TrainedToday,
    int SetCount,
    decimal Volume,
    /// <summary>Satır çağıranın kendisi mi (#425) — istemci kendi satırını vurgular.</summary>
    bool IsSelf);
