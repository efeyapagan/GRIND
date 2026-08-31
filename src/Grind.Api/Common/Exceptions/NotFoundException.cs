namespace Grind.Api.Common.Exceptions;

/// <summary>
/// İstenen kayıt yok — ya da kullanıcı ona erişemiyor. İkisi bilerek ayrılmaz: erişilemeyen
/// bir kayıt için 403 dönmek "böyle bir kayıt var" bilgisini sızdırır.
/// </summary>
public class NotFoundException(string message) : Exception(message);
