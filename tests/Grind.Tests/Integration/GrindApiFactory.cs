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
/// </summary>
public class GrindApiFactory : WebApplicationFactory<Program>
{
    public GrindApiFactory()
    {
        Environment.SetEnvironmentVariable("ConnectionStrings__Postgres", TestDatabase.ConnectionString);
        Environment.SetEnvironmentVariable(
            "Jwt__Key", "test-ortaminin-kendi-jwt-anahtari-en-az-otuz-iki-bayt-uzunlugunda");
    }
}
