using Grind.Api.Models.Dtos.Social;

namespace Grind.Api.Services;

public interface IFriendWeeklyService
{
    /// <summary>
    /// Çağıranın arkadaşlarının BU HAFTAKİ özeti (#418). Sıralama YAPILMAZ — o bir arayüz kararı
    /// (bkz. FriendWeeklyResponse). Gizlilik seviyesi <c>Gizli</c> olan arkadaş listeye HİÇ girmez.
    /// </summary>
    Task<IReadOnlyList<FriendWeeklyResponse>> GetAsync(CancellationToken cancellationToken = default);
}
