using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Social;

/// <summary>
/// Takip listelerinde ve aramada bir satır (#281). <see cref="Relation"/> BAKANIN o kişiyle ilişkisidir
/// (listenin sahibininki değil) — istemci satırdaki Takip et / Takibi bırak düğmesini buna göre çizer.
/// </summary>
public record UserSummaryResponse(string Username, FollowRelation Relation);
