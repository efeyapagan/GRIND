using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Entities;

/// <summary>
/// Kullanıcının kapattığı bildirim kategorisi (#410). Satırın VARLIĞI "kapalı" demektir (<c>Follow</c> ile aynı
/// desen): satırı olmayan her kategori açıktır, yeni kullanıcıda hepsi açık başlar. <c>(UserId, Category)</c>
/// benzersiz. Bildirimler saklanmadığı için kapatmak hiçbir şeyi silmez — kategori açılınca hepsi geri gelir.
/// </summary>
public class MutedNotificationCategory
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public NotificationCategory Category { get; set; }

    public User User { get; set; } = null!;
}
