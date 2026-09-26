namespace Grind.Api.Models.Dtos.Social;

/// <summary>
/// Bir arkadaşın BU HAFTAKİ özeti (#418) — ana ekrandaki karşılaştırma listesinin satırı.
///
/// Hafta Pazartesi–Pazar, gün TR yerel günüdür (CLAUDE.md); aynı gün içindeki birden fazla
/// antrenman BİR gün sayılır. <see cref="WeeklyTargetDays"/> <c>null</c> ise kullanıcı hedef
/// koymamıştır — satır listede kalır, ilerleme çubuğu yerine yalnızca gün sayısı gösterilir.
///
/// Sıralama BİLEREK sunucuda yapılmaz: "hedefe ulaşma oranı" bir arayüz kararıdır ve hedefsiz
/// satırların nereye düşeceği de öyle; hesap `packages/shared/src/lib/arkadasSiralamasi.ts`te
/// saf bir fonksiyonda ve testlidir.
/// </summary>
public record FriendWeeklyResponse(
    string Username,
    string? DisplayName,
    bool HasAvatar,
    long? AvatarVersion,
    int TrainedDaysThisWeek,
    int? WeeklyTargetDays,
    bool TrainedToday,
    int WeeklySetCount,
    decimal WeeklyVolume);
