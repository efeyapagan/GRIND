namespace Grind.Api.Models.Entities;

/// <summary>
/// Arkadaşlık isteği (#628). Arkadaşlık yine SAKLANMAZ (karşılıklı takip, #281); bu satır yalnızca iki
/// kişiyi tek adımda karşılıklı takibe getiren isteğin kendisidir. <see cref="RejectedAt"/> <c>null</c> =
/// bekliyor; dolu = reddedildi — reddedilen satırlar ret sınırı için sayılır, ayrı bir sayaç tutulmaz.
/// Kabul edilince çiftin tüm satırları silinir (sayaç sıfırlanır).
/// </summary>
public class FriendRequest
{
    public long Id { get; set; }
    public long RequesterId { get; set; }
    public long TargetId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RejectedAt { get; set; }

    public User Requester { get; set; } = null!;
    public User Target { get; set; } = null!;
}
