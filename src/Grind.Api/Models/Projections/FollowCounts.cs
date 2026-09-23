namespace Grind.Api.Models.Projections;

/// <summary>Bir kullanıcının takip sayaçları; yalnızca aktif (pasifleştirilmemiş) karşı tarafları sayar.</summary>
public record FollowCounts(int Followers, int Following, int Friends);
