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
/// Ana ekrandaki arkadaş sıralaması (#418) -- ÇAĞIRAN ve arkadaşları (#425). #420'den beri
/// "bu hafta"ya sabit değil: istemcinin istediği DÖNEMDE (takvimin gösterdiği hafta ya da ay)
/// hesaplanır; parametresiz çağrı bugünkü haftadır. Sınıf ve uç adındaki "weekly" o günden kalma.
///
/// YETKİLENDİRME (CLAUDE.md'deki "herkese açık antrenman verisi" istisnasının genişlemesi):
/// haftalık özet yalnızca ARKADAŞLARA (karşılıklı takip, #281) ve yalnızca gizlilik seviyesi
/// <c>Acik</c>/<c>Kisitli</c> olanlar için görünür. <c>Gizli</c> bir arkadaş yanıtta HİÇ yer almaz
/// — "paylaşmıyor" satırı bile çizilmez (kullanıcı kararı): bir satırın varlığı bile o kişinin
/// antrenman yapıp yapmadığına dair bir ipucu taşımamalı.
///
/// Tüm hesap SORGULANIR, saklanmaz (CLAUDE.md, Veritabanı Tasarım Kuralları): iki sorgu -- biri
/// arkadaş listesi, biri o arkadaşların dönemdeki oturum toplamları. Arkadaş başına istek yok.
/// </summary>
public class FriendWeeklyService(
    IFollowRepository followRepository,
    IUserRepository userRepository,
    IWorkoutSessionRepository sessionRepository,
    IUserAvatarRepository avatarRepository,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IFriendWeeklyService
{
    public async Task<IReadOnlyList<StandingResponse>> GetAsync(
        StandingRangeQuery query, CancellationToken cancellationToken = default)
    {
        var bugun = TurkeyDay.LocalDateOf(timeProvider.GetUtcNow().UtcDateTime);
        // Doğrulama her sorgudan ÖNCE: bozuk aralık veritabanına hiç gitmez.
        var (donemBasi, donemSonu) = StandingRange.Resolve(query.From, query.To, bugun);

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

        // Dönem sonunun UTC karşılığı: son günün SONU = ertesi günün başlangıcı (hariç).
        var (baslangicUtc, _) = TurkeyDay.RangeForLocalDate(donemBasi);
        var (_, bitisUtc) = TurkeyDay.RangeForLocalDate(donemSonu);

        var idler = satirSahipleri.Select(a => a.Id).ToList();
        var oturumlar = await sessionRepository.GetSessionAggregatesForUsersAsync(
            idler, baslangicUtc, bitisUtc, cancellationToken);
        var avatarlar = await avatarRepository.GetUpdatedAtsAsync(idler, cancellationToken);

        var kisiBasi = oturumlar.ToLookup(o => o.UserId);

        return satirSahipleri
            .Select(kisi => Satir(kisi, kisiBasi[kisi.Id], bugun, avatarlar, kisi.Id == currentUser.UserId))
            .ToList();
    }

    private static StandingResponse Satir(
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

        return new StandingResponse(
            arkadas.Username,
            arkadas.DisplayName,
            avatarGuncelleme is not null,
            avatarGuncelleme is { } guncelleme ? AvatarVersion.Of(guncelleme) : null,
            gunler.Count,
            arkadas.WeeklyTargetDays,
            // Geçmiş dönemde dönem dışındaki oturumlar okunmadığı için bu kendiliğinden false.
            gunler.Contains(bugun),
            liste.Sum(o => o.SetCount),
            liste.Sum(o => o.Volume),
            kendisi);
    }
}
