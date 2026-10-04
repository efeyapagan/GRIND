namespace Grind.Api.Models.Entities;

/// <summary>
/// Tek yönlü takip (#281): <see cref="Follower"/>, <see cref="Followee"/>'yi takip ediyor. Onay yok —
/// satırın varlığı takibin kendisidir. Arkadaşlık SAKLANMAZ: karşılıklı iki satırdan sorgulanır; ayrı
/// bir tablo bu satırlarla senkron kalması gereken ikinci bir doğruluk kaynağı olurdu (3NF/DRY).
/// </summary>
public class Follow
{
    public long Id { get; set; }
    public long FollowerId { get; set; }
    public long FolloweeId { get; set; }
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// #628: <see cref="Follower"/>, bu kişiden gelen TÜM bildirimleri istemiyor. Takip satırında yaşar —
    /// takibi bırakınca sessize alma da kalkar (menü yalnızca takip ederken açılır).
    /// </summary>
    public bool NotificationsMuted { get; set; }

    public User Follower { get; set; } = null!;
    public User Followee { get; set; } = null!;
}
