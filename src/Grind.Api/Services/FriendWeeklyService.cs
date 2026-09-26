using Grind.Api.Common;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.Social;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

/// <summary>
/// Ana ekrandaki arkadaş karşılaştırması (#418).
///
/// YETKİLENDİRME (CLAUDE.md'deki "herkese açık antrenman verisi" istisnasının genişlemesi):
/// haftalık özet yalnızca ARKADAŞLARA (karşılıklı takip, #281) ve yalnızca gizlilik seviyesi
/// <c>Acik</c>/<c>Kisitli</c> olanlar için görünür. <c>Gizli</c> bir arkadaş yanıtta HİÇ yer almaz
/// — "paylaşmıyor" satırı bile çizilmez (kullanıcı kararı): bir satırın varlığı bile o kişinin
/// antrenman yapıp yapmadığına dair bir ipucu taşımamalı.
///
/// Tüm hesap SORGULANIR, saklanmaz (CLAUDE.md, Veritabanı Tasarım Kuralları): iki sorgu -- biri
/// arkadaş listesi, biri o arkadaşların bu haftaki oturum toplamları. Arkadaş başına istek yok.
/// </summary>
public class FriendWeeklyService(
    IFollowRepository followRepository,
    IWorkoutSessionRepository sessionRepository,
    IUserAvatarRepository avatarRepository,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IFriendWeeklyService
{
    public async Task<IReadOnlyList<FriendWeeklyResponse>> GetAsync(
        CancellationToken cancellationToken = default)
    {
        var arkadaslar = (await followRepository.GetFriendsForWeeklyAsync(currentUser.UserId, cancellationToken))
            .Where(a => a.PrivacyLevel != PrivacyLevel.Gizli)
            .ToList();

        if (arkadaslar.Count == 0)
        {
            return [];
        }

        var bugun = TurkeyDay.LocalDateOf(timeProvider.GetUtcNow().UtcDateTime);
        var haftaBasi = StreakCalculator.WeekStart(bugun);
        // Hafta sonunun UTC karşılığı: Pazar'ın SONU = ertesi Pazartesi'nin başlangıcı (hariç).
        var (baslangicUtc, _) = TurkeyDay.RangeForLocalDate(haftaBasi);
        var (_, bitisUtc) = TurkeyDay.RangeForLocalDate(haftaBasi.AddDays(6));

        var idler = arkadaslar.Select(a => a.Id).ToList();
        var oturumlar = await sessionRepository.GetSessionAggregatesForUsersAsync(
            idler, baslangicUtc, bitisUtc, cancellationToken);
        var avatarlar = await avatarRepository.GetUpdatedAtsAsync(idler, cancellationToken);

        var kisiBasi = oturumlar.ToLookup(o => o.UserId);

        return arkadaslar.Select(arkadas => Satir(arkadas, kisiBasi[arkadas.Id], bugun, avatarlar)).ToList();
    }

    private static FriendWeeklyResponse Satir(
        FriendRef arkadas,
        IEnumerable<UserSessionAggregate> oturumlar,
        DateOnly bugun,
        IReadOnlyDictionary<long, DateTime> avatarlar)
    {
        var liste = oturumlar.ToList();
        // Aynı gün içindeki birden fazla antrenman BİR gün sayılır (takvim/seri kuralıyla aynı).
        var gunler = liste.Select(o => TurkeyDay.LocalDateOf(o.StartedAt)).ToHashSet();
        var avatarGuncelleme = avatarlar.TryGetValue(arkadas.Id, out var an) ? an : (DateTime?)null;

        return new FriendWeeklyResponse(
            arkadas.Username,
            arkadas.DisplayName,
            avatarGuncelleme is not null,
            avatarGuncelleme is { } guncelleme ? AvatarVersion.Of(guncelleme) : null,
            gunler.Count,
            arkadas.WeeklyTargetDays,
            gunler.Contains(bugun),
            liste.Sum(o => o.SetCount),
            liste.Sum(o => o.Volume));
    }
}
