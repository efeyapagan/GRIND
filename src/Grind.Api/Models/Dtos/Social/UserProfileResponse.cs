using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Social;

/// <summary>
/// Profil başlığı (#281): herkese açık başlık bilgisi — antrenman verisi DEĞİL. Sayaçlar hedefin
/// kendi sayılarıdır ve pasif hesapları saymaz; <see cref="Relation"/> bakanın gözünden. Görünen isim,
/// yaş ve fotoğraf sürümü (#284) kendi profilindeki (<c>GET /api/profile</c>) başlığın aynısını başkası
/// için de çizmeye yeter; doğum tarihi paylaşılmaz, yalnızca sorgu anındaki yaş.
/// </summary>
public record UserProfileResponse(
    string Username,
    string? DisplayName,
    int? Age,
    bool HasAvatar,
    long? AvatarVersion,
    int FriendCount,
    int FollowerCount,
    int FollowingCount,
    FollowRelation Relation);
