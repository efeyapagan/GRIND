namespace Grind.Api.Common;

/// <summary>
/// "RateLimiting" yapılandırma bölümü (issue #74). Varsayılanlar kararlaştırılan üretim
/// değerleridir: kaba kuvvet/DoS koruması, sabit pencere, IP başına. Test host'u bunları
/// env var ile gevşetir (Jwt/Ai ile aynı desen) — bkz. <c>GrindApiFactory</c>: her testin kendi
/// kullanıcısını KAYDETMESİ gereken mevcut test mimarisi, gerçek 5/saat register sınırıyla
/// birlikte yürüyemez.
/// </summary>
public class AuthRateLimitSettings
{
    public int LoginPermitLimit { get; set; } = 10;

    public int LoginWindowMinutes { get; set; } = 5;

    public int RegisterPermitLimit { get; set; } = 5;

    public int RegisterWindowMinutes { get; set; } = 60;
}
