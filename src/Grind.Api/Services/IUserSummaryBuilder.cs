using Grind.Api.Models.Dtos.Social;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Projections;

namespace Grind.Api.Services;

/// <summary>
/// Bir kişi listesini oturum açmış kullanıcının gözünden satıra çevirir: görünen isim, fotoğraf sürümü ve
/// BAKANIN ilişkisi (#281, #284). Takip listeleri, arama ve bildirimler (#325) aynı satırı çizer.
/// </summary>
public interface IUserSummaryBuilder
{
    /// <summary>Girdiyle aynı sırada; ilişkiler ve fotoğraflar için toplam iki sorgu.</summary>
    Task<IReadOnlyList<UserSummaryResponse>> BuildAsync(
        IReadOnlyList<UserRef> users, CancellationToken cancellationToken = default);

    /// <summary>Oturum açmış kullanıcının verilen kişilerle ilişkisi — tek sorgu, sonra bellekte.</summary>
    Task<Func<long, FollowRelation>> RelationsAsync(
        IReadOnlyCollection<long> otherIds, CancellationToken cancellationToken = default);
}
