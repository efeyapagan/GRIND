namespace Grind.Api.Models.Dtos.Profile;

/// <summary>
/// Kullanıcının kendi profili (#280). <see cref="Age"/> saklanmaz, doğum tarihinden TR gününe göre
/// hesaplanır. <see cref="AvatarVersion"/> fotoğrafın son yükleme anı (Unix ms); istemci fotoğraf
/// adresine önbellek kırıcı olarak ekler (<c>?v=</c>).
/// </summary>
public record ProfileResponse(
    string Username,
    string? DisplayName,
    DateOnly? BirthDate,
    int? Age,
    bool HasAvatar,
    long? AvatarVersion);
