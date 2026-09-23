namespace Grind.Api.Models.Dtos.Profile;

/// <summary>Sunulacak profil fotoğrafı (#280); <see cref="Version"/> <c>ETag</c> olarak kullanılır.</summary>
public record AvatarContent(byte[] Content, string ContentType, long Version);
