using Grind.Api.Models.Entities;

namespace Grind.Api.Repositories;

/// <summary>Arkadaşlık istekleri (#628). Satırlar her zaman (gönderen, hedef) çiftiyle aranır — Id ile değil.</summary>
public interface IFriendRequestRepository : IRepository<FriendRequest>
{
    /// <summary><paramref name="requesterId"/>'den <paramref name="targetId"/>'ye bekleyen istek.</summary>
    Task<FriendRequest?> GetPendingAsync(long requesterId, long targetId, CancellationToken cancellationToken = default);

    /// <summary>Bu yönde reddedilmiş istek sayısı (ret sınırı).</summary>
    Task<int> CountRejectedAsync(long requesterId, long targetId, CancellationToken cancellationToken = default);

    /// <summary>Çiftin iki yöndeki TÜM satırları (bekleyen + reddedilmiş).</summary>
    Task<IReadOnlyList<FriendRequest>> GetPairAsync(long a, long b, CancellationToken cancellationToken = default);
}
