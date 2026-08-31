namespace Grind.Api.Common.Exceptions;

/// <summary>
/// Kimlik doğrulanamadı — hatalı kullanıcı adı VEYA şifre. İkisi bilerek ayrılmaz:
/// farklı yanıt vermek "bu username kayıtlı" bilgisini sızdırır. Kimliği doğrulanmış
/// ama yetkisi olmayan kullanıcı için bu DEĞİL, ForbiddenException kullanılır.
/// </summary>
public class UnauthorizedException(string message) : Exception(message);
