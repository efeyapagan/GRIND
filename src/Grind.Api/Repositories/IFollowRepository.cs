using Grind.Api.Models.Entities;
using Grind.Api.Models.Projections;

namespace Grind.Api.Repositories;

/// <summary>
/// Takip satırları (#281). Liste ve sayaç sorguları karşı tarafı pasif (<c>DeletedAt</c> dolu) olan
/// satırları DIŞARIDA bırakır ama silmez — hesap geri açılınca ilişki kendiliğinden geri gelir.
/// </summary>
public interface IFollowRepository : IRepository<Follow>
{
    Task<Follow?> GetAsync(long followerId, long followeeId, CancellationToken cancellationToken = default);

    /// <summary>
    /// İki kullanıcı arkadaş mı (karşılıklı takip, #281) — iki satırın varlığından, tek sorguda. Hesap
    /// aktifliğine BAKMAZ; o, kullanıcı adı çözülürken kontrol edilir.
    /// </summary>
    Task<bool> AreFriendsAsync(long userId, long otherId, CancellationToken cancellationToken = default);

    Task<FollowCounts> GetCountsAsync(long userId, CancellationToken cancellationToken = default);

    /// <summary><paramref name="userId"/>'yi takip edenler, en yeni takip önce.</summary>
    Task<(IReadOnlyList<UserRef> Items, int TotalCount)> GetFollowersAsync(
        long userId, int skip, int take, CancellationToken cancellationToken = default);

    /// <summary><paramref name="userId"/>'nin takip ettikleri, en yeni takip önce.</summary>
    Task<(IReadOnlyList<UserRef> Items, int TotalCount)> GetFollowingAsync(
        long userId, int skip, int take, CancellationToken cancellationToken = default);

    /// <summary>Karşılıklı takipleştikleri, <paramref name="userId"/>'nin onları takip etmeye başlama sırasıyla (en yeni önce).</summary>
    Task<(IReadOnlyList<UserRef> Items, int TotalCount)> GetFriendsAsync(
        long userId, int skip, int take, CancellationToken cancellationToken = default);

    /// <summary>
    /// <paramref name="viewerId"/>'nin <paramref name="otherIds"/> içinden takip ettikleri ve onu takip
    /// edenler — bir listenin tüm satırlarının ilişkisi TEK sorguda çıkar (satır başına sorgu yok).
    /// </summary>
    Task<(HashSet<long> ViewerFollows, HashSet<long> FollowsViewer)> GetRelationsAsync(
        long viewerId, IReadOnlyCollection<long> otherIds, CancellationToken cancellationToken = default);
}
