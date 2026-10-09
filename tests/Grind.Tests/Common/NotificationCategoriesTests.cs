using Grind.Api.Common.Notifications;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Common;

public class NotificationCategoriesTests
{
    /// <summary>
    /// #410: her bildirim türü bir ayar kategorisine bağlıdır. Yeni bir tür eşlemeye eklenmezse burada patlar —
    /// kategorisiz tür, kullanıcının hiçbir anahtarla kapatamadığı bildirim demektir.
    /// </summary>
    [Fact]
    public void Her_bildirim_turunun_bir_kategorisi_vardir()
    {
        foreach (var tur in Enum.GetValues<NotificationKind>())
        {
            Assert.True(Enum.IsDefined(NotificationCategories.Of(tur)));
        }
    }
}
