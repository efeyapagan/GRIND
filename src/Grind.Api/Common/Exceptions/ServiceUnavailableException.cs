namespace Grind.Api.Common.Exceptions;

/// <summary>
/// Bağımlı olunan bir hizmet şu an kullanılamıyor: AI sağlayıcısı kapalı, erişilemiyor ya da yanıt
/// üretmedi (Faz 12 spec Karar 12). Mesaj istemciye aynen gider; bu yüzden dış sağlayıcının hata metni
/// buraya ASLA konmaz, yalnızca koddaki sabit mesajlar.
/// </summary>
public class ServiceUnavailableException(string message) : Exception(message);
