namespace Grind.Api.Services;

/// <summary>
/// Arkadaşlık isteği (#628). Hedef kullanıcı adıyla verilir; pasif/olmayan hedef 404, kendine 400.
/// Kabul ve ret yalnızca BANA gelen, geri çekme yalnızca BENİM gönderdiğim isteğe uygulanır.
/// </summary>
public interface IFriendRequestService
{
    /// <summary>İdempotent: zaten arkadaşsa ya da istek bekliyorsa hiçbir şey yapmaz. Ret sınırı dolmuşsa 400.</summary>
    Task SendAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>İdempotent: bekleyen istek yoksa hiçbir şey yapmaz. Geri çekilen istek ret sınırına sayılmaz.</summary>
    Task WithdrawAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>Ondan bana bekleyen istek yoksa 404. Eksik takipleri ekler, çiftin isteklerini siler.</summary>
    Task AcceptAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>Ondan bana bekleyen istek yoksa 404. Takipler değişmez.</summary>
    Task RejectAsync(string username, CancellationToken cancellationToken = default);
}
