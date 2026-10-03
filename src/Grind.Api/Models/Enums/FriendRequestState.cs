namespace Grind.Api.Models.Enums;

/// <summary>Bakanın gözünden bekleyen arkadaşlık isteğinin yönü (#628). Karşılıklı takipte her zaman None.</summary>
public enum FriendRequestState
{
    None,

    /// <summary>Bakan istek gönderdi, cevap bekleniyor.</summary>
    Sent,

    /// <summary>O bakana istek gönderdi.</summary>
    Received
}
