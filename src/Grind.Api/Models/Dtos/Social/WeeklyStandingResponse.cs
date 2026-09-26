namespace Grind.Api.Models.Dtos.Social;

/// <summary>
/// Haftalık sıralamanın bir satırı (#418, #425): bir arkadaşın ya da ÇAĞIRANIN KENDİSİNİN bu
/// haftaki özeti. Kullanıcı kendini de listede görür (#425) — kendi satırı gizlilik seviyesinden
/// etkilenmez ve sıralamada ayrıcalığı yoktur, aynı kurala girer.
///
/// Hafta Pazartesi–Pazar, gün TR yerel günüdür (CLAUDE.md); aynı gün içindeki birden fazla
/// antrenman BİR gün sayılır. <see cref="WeeklyTargetDays"/> <c>null</c> ise kullanıcı hedef
/// koymamıştır — satır listede kalır, ilerleme çubuğu yerine yalnızca gün sayısı gösterilir.
///
/// Sıralama BİLEREK sunucuda yapılmaz: "hedefe ulaşma oranı" bir arayüz kararıdır ve hedefsiz
/// satırların nereye düşeceği de öyle; hesap `packages/shared/src/lib/arkadasSiralamasi.ts`te
/// saf bir fonksiyonda ve testlidir.
/// </summary>
public record WeeklyStandingResponse(
    string Username,
    string? DisplayName,
    bool HasAvatar,
    long? AvatarVersion,
    int TrainedDaysThisWeek,
    int? WeeklyTargetDays,
    bool TrainedToday,
    int WeeklySetCount,
    decimal WeeklyVolume,
    /// <summary>Satır çağıranın kendisi mi (#425) — istemci kendi satırını vurgular.</summary>
    bool IsSelf);
