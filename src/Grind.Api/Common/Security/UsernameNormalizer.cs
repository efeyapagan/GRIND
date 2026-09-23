namespace Grind.Api.Common.Security;

/// <summary>
/// Kullanıcı adı veritabanında her zaman küçük harf durur (CLAUDE.md: username case-insensitive).
/// Kayıt/giriş (<c>AuthService</c>) ve takip uçları (#281, URL'den gelen ad) aynı kuralı kullanır.
/// Kayıt DTO regex'i adı ASCII'ye kısıtladığı için ToLowerInvariant güvenli (Türkçe İ sorunu oluşamaz);
/// URL'den gelen ASCII dışı bir ad zaten hiçbir kayıtla eşleşmez.
/// </summary>
public static class UsernameNormalizer
{
    public static string Normalize(string username) => username.Trim().ToLowerInvariant();
}
