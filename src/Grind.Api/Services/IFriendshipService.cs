namespace Grind.Api.Services;

/// <summary>
/// Arkadaşlık = karşılıklı takip (#281, #467). Tek yerde yaşar ki her arkadaşlık-şartlı
/// özellik (bugün şablon paylaşımı) aynı sorguyu tekrarlamasın (DRY).
/// </summary>
public interface IFriendshipService
{
    Task<bool> AreFriendsAsync(long userId1, long userId2, CancellationToken cancellationToken = default);
}
