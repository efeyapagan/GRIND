using Grind.Api.Models.Dtos.Social;

namespace Grind.Api.Services;

public interface IFriendWeeklyService
{
    /// <summary>
    /// Çağıranın ve arkadaşlarının istenen DÖNEMDEKİ özeti (#418, #420; aralık yoksa bu hafta).
    /// Sıralama YAPILMAZ — o bir arayüz kararı (bkz. StandingResponse). Gizlilik seviyesi
    /// <c>Gizli</c> olan arkadaş listeye HİÇ girmez.
    /// </summary>
    /// <exception cref="Common.Exceptions.ValidationException">Tek uçlu, ters ya da bir aydan uzun aralık.</exception>
    Task<IReadOnlyList<StandingResponse>> GetAsync(
        StandingRangeQuery query, CancellationToken cancellationToken = default);
}
