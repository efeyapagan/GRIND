using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Social;

/// <summary>
/// Takip listelerinde ve aramada bir satır (#281). <see cref="Relation"/> BAKANIN o kişiyle ilişkisidir
/// (listenin sahibininki değil) — istemci satırdaki Takip et / Takibi bırak düğmesini buna göre çizer.
/// Görünen isim ve fotoğraf sürümü (#284) satırdaki küçük fotoğraf ve isim içindir; fotoğrafın kendisi
/// <c>GET /api/users/{username}/avatar?v={AvatarVersion}</c>'dan gelir.
/// </summary>
public record UserSummaryResponse(
    string Username,
    string? DisplayName,
    bool HasAvatar,
    long? AvatarVersion,
    FollowRelation Relation);
