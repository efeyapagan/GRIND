using Grind.Api.Common;
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.Social;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;
using Grind.Api.Repositories;

namespace Grind.Api.Services;

/// <summary>
/// Ana ekrandaki haftalık sıralama (#418) -- ÇAĞIRAN ve arkadaşları (#425).
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
    IUserRepository userRepository,
    IWorkoutSessionRepository sessionRepository,
    IUserAvatarRepository avatarRepository,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IFriendWeeklyService
{
    public async Task<IReadOnlyList<WeeklyStandingResponse>> GetAsync(
        CancellationToken cancellationToken = default)
    {
        var arkadaslar = (await followRepository.GetFriendsForWeeklyAsync(currentUser.UserId, cancellationToken))
            .Where(a => a.PrivacyLevel != PrivacyLevel.Gizli)
            .ToList();

        // #425: kullanici siralamada kendini de gorur. Kendi satiri gizlilikten etkilenmez.
        var kendisi = await userRepository.GetByIdAsync(currentUser.UserId, cancellationToken)
                      ?? throw new NotFoundException("Kullanıcı bulunamadı.");
        var satirSahipleri = arkadaslar
            .Append(new FriendRef(
                kendisi.Id, kendisi.Username, kendisi.DisplayName,
                kendisi.PrivacyLevel, kendisi.WeeklyTargetDays))
            .ToList();

        var bugun = TurkeyDay.LocalDateOf(timeProvider.GetUtcNow().UtcDateTime);
        var haftaBasi = StreakCalculator.WeekStart(bugun);
        // Hafta sonunun UTC karşılığı: Pazar'ın SONU = ertesi Pazartesi'nin başlangıcı (hariç).
        var (baslangicUtc, _) = TurkeyDay.RangeForLocalDate(haftaBasi);
        var (_, bitisUtc) = TurkeyDay.RangeForLocalDate(haftaBasi.AddDays(6));

        var idler = satirSahipleri.Select(a => a.Id).ToList();
        var oturumlar = await sessionRepository.GetSessionAggregatesForUsersAsync(
            idler, baslangicUtc, bitisUtc, cancellationToken);
        var avatarlar = await avatarRepository.GetUpdatedAtsAsync(idler, cancellationToken);

        var kisiBasi = oturumlar.ToLookup(o => o.UserId);

        return satirSahipleri
            .Select(kisi => Satir(kisi, kisiBasi[kisi.Id], bugun, avatarlar, kisi.Id == currentUser.UserId))
            .ToList();
    }

    private static WeeklyStandingResponse Satir(
        FriendRef arkadas,
        IEnumerable<UserSessionAggregate> oturumlar,
        DateOnly bugun,
        IReadOnlyDictionary<long, DateTime> avatarlar,
        bool kendisi)
    {
        var liste = oturumlar.ToList();
        // Aynı gün içindeki birden fazla antrenman BİR gün sayılır (takvim/seri kuralıyla aynı).
        var gunler = liste.Select(o => TurkeyDay.LocalDateOf(o.StartedAt)).ToHashSet();
        var avatarGuncelleme = avatarlar.TryGetValue(arkadas.Id, out var an) ? an : (DateTime?)null;

        return new WeeklyStandingResponse(
            arkadas.Username,
            arkadas.DisplayName,
            avatarGuncelleme is not null,
            avatarGuncelleme is { } guncelleme ? AvatarVersion.Of(guncelleme) : null,
            gunler.Count,
            arkadas.WeeklyTargetDays,
            gunler.Contains(bugun),
            liste.Sum(o => o.SetCount),
            liste.Sum(o => o.Volume),
            kendisi);
    }
}
