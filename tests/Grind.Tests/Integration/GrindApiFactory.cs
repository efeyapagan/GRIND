using Microsoft.AspNetCore.Mvc.Testing;

namespace Grind.Tests.Integration;

/// <summary>
/// CI (bkz. .github/workflows/ci.yml) ortam değişkeni olarak sadece
/// <c>ConnectionStrings__Postgres</c> sağlar; <c>Jwt__Key</c> hiçbir ortamda ambient değildir
/// (user-secrets sadece geliştirici makinesinde durur, CI'ya hiç taşınmaz). Uygulama
/// <c>AddCrossCutting</c> içinde bunu fail-fast kontrol ediyor (bkz.
/// <c>Grind.Api.Common.DependencyInjection.MinimumKeyBytes</c>) — anahtar yoksa host ayağa
/// kalkamadan <see cref="InvalidOperationException"/> fırlatır.
///
/// DİKKAT — <c>WebApplicationFactory&lt;TEntryPoint&gt;.ConfigureWebHost</c>'un standart
/// <c>ConfigureAppConfiguration</c> kancası burada İŞE YARAMAZ ve denenip atıldı: o kanca,
/// konfigürasyonu <c>Build()</c> ANINDA ekliyor, ama <c>Program.cs</c>
/// (<c>builder.Configuration.GetConnectionString(...)</c> ve
/// <c>builder.Configuration.GetSection("Jwt").Get&lt;JwtSettings&gt;()</c>) bu değerleri
/// <c>Build()</c>'DAN ÖNCE, top-level statement'lar sırasında EAGER okuyor — yani test
/// kancasının eklediği değer, uygulama onu okumaya çalıştığında henüz konfigürasyon
/// zincirinde yer almıyor (deneyle doğrulandı: yerel Jwt:Key user-secret'ı geçici olarak
/// silinip factory'nin ConfigureAppConfiguration ile Jwt:Key vermesi denendiğinde host yine
/// aynı fail-fast hatasıyla çöktü). Ortam değişkenleri ise <c>WebApplication.CreateBuilder</c>
/// tarafından EN BAŞTA, Program.cs'in ilk satırı çalışmadan ÖNCE okunur — bu yüzden burada
/// gerçek işlemi process ortam değişkeni set etmek yapıyor, tıpkı CI'nin
/// <c>ConnectionStrings__Postgres</c>'i verdiği gibi.
///
/// MALİYET GÜVENCESİ: aynı sebeple <c>Ai:Provider</c> ve <c>Ai:ApiKey</c> de burada ortam
/// değişkeniyle sabitlenir. Test host'u Development ortamında ayağa kalkar ve
/// <c>Program.cs</c>, geliştiricinin kendi makinesindeki user-secrets'ını okur — geliştirici
/// spec'in etkinleştirme adımını (<c>dotnet user-secrets set "Ai:Provider" "Anthropic"</c>)
/// bir kez çalıştırırsa, bu sabitleme olmadan test host'u GERÇEK, ÜCRETLİ Anthropic
/// sağlayıcısını çözer ve testler ağa gerçek istek atar. Bu bir kolaylık değil, bir
/// güvenlik ağıdır: ortam değişkenleri konfigürasyon zincirinde user-secrets'tan SONRA
/// geldiği için burada verilen "None" her zaman kazanır.
/// </summary>
public class GrindApiFactory : WebApplicationFactory<Program>
{
    /// <summary>
    /// TEST İZOLASYONU GÜVENCESİ (issue #74): mevcut test mimarisi her testin kendi kullanıcısını
    /// KAYDETMESİNE dayanır (bkz. <c>TestDatabase.NewUser</c>) -- üretimin gerçek 5/saat register
    /// sınırıyla, paylaşılan bir <c>IClassFixture</c> içindeki onlarca test (en yoğun sınıfta
    /// ~18 kayıt) birbirini kilitlerdi. Bu değer TÜM test sınıfları için AYNIDIR (hiçbir sınıf
    /// farklı bir değer set etmez) -- ortam değişkenleri process genelinde paylaşıldığı için,
    /// sınıflar arası farklı değerler xUnit'in varsayılan paralel çalıştırmasında yarış koşulu
    /// yaratırdı. <see cref="AuthRateLimitingEndpointsTests"/> gerçek 429 mekanizmasını bu AYNI
    /// (ama hâlâ sonlu) değerle uçtan uca sınar; ondalık limit sayılarının (10/5dk, 5/1sa) bizzat
    /// doğru olduğu ayrı, HTTP'siz bir birim testiyle (<c>AuthRateLimiterPartitionsTests</c>) kilitlenir.
    /// </summary>
    public const int RelaxedRateLimit = 30;

    public GrindApiFactory()
    {
        Environment.SetEnvironmentVariable("ConnectionStrings__Postgres", TestDatabase.ConnectionString);
        Environment.SetEnvironmentVariable(
            "Jwt__Key", "test-ortaminin-kendi-jwt-anahtari-en-az-otuz-iki-bayt-uzunlugunda");
        Environment.SetEnvironmentVariable("Ai__Provider", "None");
        Environment.SetEnvironmentVariable("Ai__ApiKey", string.Empty);
        Environment.SetEnvironmentVariable("RateLimiting__LoginPermitLimit", RelaxedRateLimit.ToString());
        Environment.SetEnvironmentVariable("RateLimiting__RegisterPermitLimit", RelaxedRateLimit.ToString());
    }
}
