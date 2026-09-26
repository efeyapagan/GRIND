namespace Grind.Api.Models.Dtos.Auth;

/// <summary>
/// "Bu kullanıcı adı alınabilir mi?" sorusunun cevabı (#372). BİLEREK tek bir boolean taşır:
/// adın kime ait olduğu, hesabın aktif mi pasif mi olduğu söylenmez — bu uç bir kullanıcı arama
/// aracı değil, form doğrulaması içindir.
/// </summary>
public record UsernameAvailabilityResponse(bool Available);
