namespace Grind.Api.Common.Exceptions;

/// <summary>
/// Kullanıcı kaydı görebiliyor ama bu işlemi yapamaz — örn. global bir egzersizi
/// düzenlemeye çalışmak. Başkasının özel kaydı için bu DEĞİL, NotFoundException kullanılır.
/// </summary>
public class ForbiddenException(string message) : Exception(message);
