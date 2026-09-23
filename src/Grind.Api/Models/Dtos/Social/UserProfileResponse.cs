using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Social;

/// <summary>
/// Profil başlığı (#281): herkese açık başlık bilgisi — antrenman verisi DEĞİL. Sayaçlar hedefin
/// kendi sayılarıdır ve pasif hesapları saymaz; <see cref="Relation"/> bakanın gözünden. Görünen isim,
/// yaş ve fotoğraf (#280) henüz burada değil — kullanıcının kendi profili <c>GET /api/profile</c>'da,
/// fotoğraf <c>GET /api/users/{username}/avatar</c>'da; başlığa eklenmesi arayüz issue'sunda.
/// </summary>
public record UserProfileResponse(
    string Username,
    int FriendCount,
    int FollowerCount,
    int FollowingCount,
    FollowRelation Relation);
