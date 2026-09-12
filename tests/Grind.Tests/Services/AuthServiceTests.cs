using System.Diagnostics;
using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Services;

[Trait("Category", "Database")]
public class AuthServiceTests
{
    private const string Password = "yeterince-uzun-sifre";

    private static JwtSettings Settings => new()
    {
        Key = "bu-test-anahtari-en-az-otuz-iki-bayt-uzunlugunda",
        Issuer = "grind-api",
        Audience = "grind-app",
        ExpiryMinutes = 60
    };

    /// <summary>TR 20:00 (UTC 17:00), 10 Mart — pasifleştirme damgası testte deterministik olsun.</summary>
    private static readonly DateTime An = new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    private sealed class SahteSaat(DateTime utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(utcNow, TimeSpan.Zero);
    }

    private sealed class StubCurrentUser(long userId) : Grind.Api.Common.Security.ICurrentUserService
    {
        public long UserId { get; } = userId;
        public string Username { get; } = $"kullanici{userId}";
    }

    /// <summary>Her test kendi transaction'ında çalışır; sonunda geri alınır.</summary>
    private static async Task<(AuthService Service, AppDbContext Context, IAsyncDisposable Transaction)> CreateAsync()
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();
        var service = new AuthService(
            new UserRepository(context), new UnitOfWork(context), new TokenService(Settings),
            new StubCurrentUser(0), new SahteSaat(An));
        return (service, context, transaction);
    }

    private static string UniqueUsername() => $"kul_{Guid.NewGuid():N}"[..20];

    private static RegisterRequest Register(string username) =>
        new() { Username = username, Password = Password };

    [Fact]
    public async Task Kayit_kullaniciyi_kucuk_harfle_saklar()
    {
        var (service, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();

            await service.RegisterAsync(Register(username.ToUpperInvariant()));

            var saved = await new UserRepository(context).GetByUsernameAsync(username);
            Assert.NotNull(saved);
            Assert.Equal(username, saved.Username);
        }
    }

    [Fact]
    public async Task Kayit_sifreyi_duz_metin_saklamaz()
    {
        var (service, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            await service.RegisterAsync(Register(username));

            var saved = await new UserRepository(context).GetByUsernameAsync(username);
            Assert.NotNull(saved);
            Assert.NotEqual(Password, saved.PasswordHash);
            Assert.True(BCrypt.Net.BCrypt.Verify(Password, saved.PasswordHash));
        }
    }

    [Fact]
    public async Task Kayit_yeni_kullanicinin_idsini_tasiyan_token_doner()
    {
        var (service, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();

            var response = await service.RegisterAsync(Register(username));

            var saved = await new UserRepository(context).GetByUsernameAsync(username);
            Assert.NotNull(saved);
            Assert.Equal(username, response.Username);
            Assert.NotEmpty(response.Token);

            var token = new Microsoft.IdentityModel.JsonWebTokens.JsonWebTokenHandler()
                .ReadJsonWebToken(response.Token);
            Assert.Equal(saved.Id.ToString(), token.GetClaim(AppClaims.UserId).Value);
        }
    }

    [Fact]
    public async Task Ayni_username_farkli_harf_buyuklugunde_reddedilir()
    {
        var (service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            await service.RegisterAsync(Register(username));

            await Assert.ThrowsAsync<ConflictException>(
                () => service.RegisterAsync(Register(username.ToUpperInvariant())));
        }
    }

    [Fact]
    public async Task Dogru_sifreyle_giris_basarili()
    {
        var (service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            await service.RegisterAsync(Register(username));

            var response = await service.LoginAsync(
                new LoginRequest { Username = username.ToUpperInvariant(), Password = Password });

            Assert.Equal(username, response.Username);
            Assert.NotEmpty(response.Token);
        }
    }

    /// <summary>
    /// Kararın özü: "kullanıcı yok" ile "şifre yanlış" AYNI yanıtı vermeli. Farklı mesaj,
    /// saldırgana hangi username'lerin kayıtlı olduğunu sayma imkânı verir.
    /// </summary>
    [Fact]
    public async Task Yanlis_sifre_ve_olmayan_kullanici_BIREBIR_ayni_hatayi_verir()
    {
        var (service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            await service.RegisterAsync(Register(username));

            var yanlisSifre = await Assert.ThrowsAsync<UnauthorizedException>(
                () => service.LoginAsync(new LoginRequest { Username = username, Password = "bambaska-sifre" }));

            var olmayanKullanici = await Assert.ThrowsAsync<UnauthorizedException>(
                () => service.LoginAsync(new LoginRequest { Username = UniqueUsername(), Password = Password }));

            Assert.Equal(yanlisSifre.Message, olmayanKullanici.Message);
        }
    }

    /// <summary>
    /// İKİ şeyi birden korur:
    /// (1) Kullanıcı bulunamadığında da BCrypt doğrulaması çalışmalı; yoksa yanıt tek haneli
    ///     ms'de döner ve zamanlama farkı username'leri sayar hâle gelir.
    /// (2) Fırlatılan tipin UnauthorizedException olması. Sahte hash geçerli bir BCrypt hash'i
    ///     olmasaydı BCrypt.Verify SaltParseException fırlatırdı (deneyle doğrulandı) ve yanıt
    ///     401 yerine 500 olurdu — durum kodu tam da gizlemeye çalıştığımız bilgiyi sızdırırdı.
    ///
    /// ISINMA ÇAĞRISI KASITLI, SİLİNMESİN: Stopwatch başlamadan önce bir kez daha aynı şekilde
    /// başarısız bir giriş denemesi yapılıyor. Sebep: bir test sürecinin İLK EF Core/Npgsql
    /// sorgusu (model derleme + bağlantı açma) tek başına ~250ms tutuyor — bu, gerçek BCrypt
    /// maliyetinden (~220ms) bile yüksek ve kısa devre yapılmış (short-circuit) bir hatalı koddan
    /// tamamen bağımsız. Isınma çağrısı olmadan bu test, Verify tamamen atlansa bile (kısa devre
    /// hatasıyla) hep YEŞİL kalıyordu — ölçülen soğuk-başlangıç gecikmesi eşiği kendi başına
    /// aşıyordu (deneyle doğrulandı, bkz. Task 3 Fix Round 1 raporu). Isınma çağrısı bu soğuk
    /// başlangıç maliyetini stopwatch'tan ÖNCEYE çekip ölçümün dışına alıyor; ayrıca JIT'i de
    /// ısıtıyor. Alt sınır: eşik 100ms — ısınmış bir kısa devre yolu (tek DB round trip) tek
    /// haneli ms sürer, ısınmış gerçek BCrypt maliyeti ise ~220ms; 100ms ikisinin ortasında,
    /// gerçek maliyetin ~2 katı altında ve kırık yoldan ~20 kat yukarıda durur. Yine de bir ALT
    /// sınır olduğu için yavaş bir CI makinesi testi sadece daha güvenli yapar, kırmadan gizlemez.
    /// </summary>
    [Fact]
    public async Task Olmayan_kullanicida_da_dogrulama_calisir_ve_yetkisiz_hatasi_verir()
    {
        var (service, _, transaction) = await CreateAsync();
        await using (transaction)
        {
            // Isınma: soğuk EF Core/Npgsql maliyetini (bkz. yukarıdaki not) stopwatch'tan önce
            // tüket. Kendi hatası önemsiz — tek görevi ısıtmak.
            await Assert.ThrowsAsync<UnauthorizedException>(
                () => service.LoginAsync(new LoginRequest { Username = UniqueUsername(), Password = Password }));

            var stopwatch = Stopwatch.StartNew();

            await Assert.ThrowsAsync<UnauthorizedException>(
                () => service.LoginAsync(new LoginRequest { Username = UniqueUsername(), Password = Password }));

            Assert.True(stopwatch.ElapsedMilliseconds > 100,
                $"Doğrulama atlanmış görünüyor ({stopwatch.ElapsedMilliseconds}ms) — zamanlama sızıntısı.");
        }
    }

    // ---- Faz 13: hesap pasifleştirme ----

    /// <summary>
    /// Pasifleştirmenin sözü: damga düşer ama VERİ DURUR. Sayımlar veritabanından okunuyor —
    /// izleyicideki nesneye bakmak, silinmiş bir satırı fark etmezdi.
    /// </summary>
    [Fact]
    public async Task Pasiflestirme_damgayi_yazar_ve_veriyi_silmez()
    {
        var (_, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            var repository = new UserRepository(context);
            var kayit = new AuthService(
                repository, new UnitOfWork(context), new TokenService(Settings),
                new StubCurrentUser(0), new SahteSaat(An));
            await kayit.RegisterAsync(Register(username));
            var user = (await repository.GetByUsernameAsync(username))!;

            var exercise = TestDatabase.NewExercise(user, $"Egzersiz {Guid.NewGuid():N}");
            var session = TestDatabase.NewSession(user);
            context.AddRange(exercise, session);
            await context.SaveChangesAsync();

            var service = new AuthService(
                repository, new UnitOfWork(context), new TokenService(Settings),
                new StubCurrentUser(user.Id), new SahteSaat(An));

            await service.DeactivateAsync(new DeleteAccountRequest { Password = Password });

            context.ChangeTracker.Clear();
            var satir = await context.Set<User>().SingleAsync(u => u.Id == user.Id);
            Assert.Equal(An, satir.DeletedAt);
            Assert.Equal(1, await context.Set<Exercise>().CountAsync(e => e.UserId == user.Id));
            Assert.Equal(1, await context.Set<WorkoutSession>().CountAsync(s => s.UserId == user.Id));
        }
    }

    [Fact]
    public async Task Yanlis_sifreyle_pasiflestirme_reddedilir()
    {
        var (_, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            var repository = new UserRepository(context);
            var kayit = new AuthService(
                repository, new UnitOfWork(context), new TokenService(Settings),
                new StubCurrentUser(0), new SahteSaat(An));
            await kayit.RegisterAsync(Register(username));
            var user = (await repository.GetByUsernameAsync(username))!;

            var service = new AuthService(
                repository, new UnitOfWork(context), new TokenService(Settings),
                new StubCurrentUser(user.Id), new SahteSaat(An));

            await Assert.ThrowsAsync<UnauthorizedException>(
                () => service.DeactivateAsync(new DeleteAccountRequest { Password = "bambaska-bir-sifre" }));

            context.ChangeTracker.Clear();
            var satir = await context.Set<User>().SingleAsync(u => u.Id == user.Id);
            Assert.Null(satir.DeletedAt);
        }
    }

    /// <summary>Geri açma (spec Karar 2): doğru şifreyle giriş pasif hesabı yeniden aktifleştirir.</summary>
    [Fact]
    public async Task Pasif_hesap_dogru_sifreyle_giriste_geri_acilir()
    {
        var (service, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            await service.RegisterAsync(Register(username));
            var repository = new UserRepository(context);
            var user = (await repository.GetByUsernameAsync(username))!;
            user.DeletedAt = An;
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            var response = await service.LoginAsync(new LoginRequest { Username = username, Password = Password });

            Assert.False(string.IsNullOrWhiteSpace(response.Token));
            context.ChangeTracker.Clear();
            var satir = await context.Set<User>().SingleAsync(u => u.Id == user.Id);
            Assert.Null(satir.DeletedAt);
        }
    }

    /// <summary>
    /// AYIRT EDİCİ (spec Karar 2): pasiflik kontrolü şifreden SONRA gelmeli. Önce gelseydi yanlış
    /// şifreyle de farklı bir davranış görülür ve hesabın pasifliği sızardı; burada hem mesaj nötr
    /// kalmalı hem de hesap pasif kalmalı.
    /// </summary>
    [Fact]
    public async Task Pasif_hesap_yanlis_sifreyle_giriste_acilmaz()
    {
        var (service, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            await service.RegisterAsync(Register(username));
            var repository = new UserRepository(context);
            var user = (await repository.GetByUsernameAsync(username))!;
            user.DeletedAt = An;
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            var hata = await Assert.ThrowsAsync<UnauthorizedException>(
                () => service.LoginAsync(new LoginRequest { Username = username, Password = "bambaska-bir-sifre" }));

            Assert.Equal(AuthService.InvalidCredentials, hata.Message);
            context.ChangeTracker.Clear();
            var satir = await context.Set<User>().SingleAsync(u => u.Id == user.Id);
            Assert.Equal(An, satir.DeletedAt);
        }
    }

    /// <summary>
    /// Spec Karar 4: pasif hesabın adı REZERVE. Kayıt 409 vermeliydi; vermeseydi aynı adla kayıt olan
    /// biri pasif hesabın şifresini ezip hesabı devralabilirdi — bu yüzden hash'in değişmediği de
    /// ayrıca doğrulanıyor.
    /// </summary>
    [Fact]
    public async Task Pasif_hesabin_adiyla_kayit_reddedilir_ve_sifre_ezilmez()
    {
        var (service, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var username = UniqueUsername();
            await service.RegisterAsync(Register(username));
            var repository = new UserRepository(context);
            var user = (await repository.GetByUsernameAsync(username))!;
            var eskiHash = user.PasswordHash;
            user.DeletedAt = An;
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear();

            await Assert.ThrowsAsync<ConflictException>(() => service.RegisterAsync(
                new RegisterRequest { Username = username, Password = "yepyeni-bir-sifre" }));

            context.ChangeTracker.Clear();
            var satir = await context.Set<User>().SingleAsync(u => u.Id == user.Id);
            Assert.Equal(eskiHash, satir.PasswordHash);
            Assert.Equal(An, satir.DeletedAt);
        }
    }

    /// <summary>Başka kullanıcının hesabı ve verisi etkilenmez (PLAN 13.3).</summary>
    [Fact]
    public async Task Pasiflestirme_baska_kullaniciyi_etkilemez()
    {
        var (_, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var repository = new UserRepository(context);
            var kayit = new AuthService(
                repository, new UnitOfWork(context), new TokenService(Settings),
                new StubCurrentUser(0), new SahteSaat(An));

            var silinecek = UniqueUsername();
            var kalan = UniqueUsername();
            await kayit.RegisterAsync(Register(silinecek));
            await kayit.RegisterAsync(Register(kalan));
            var silinecekUser = (await repository.GetByUsernameAsync(silinecek))!;
            var kalanUser = (await repository.GetByUsernameAsync(kalan))!;

            var service = new AuthService(
                repository, new UnitOfWork(context), new TokenService(Settings),
                new StubCurrentUser(silinecekUser.Id), new SahteSaat(An));
            await service.DeactivateAsync(new DeleteAccountRequest { Password = Password });

            context.ChangeTracker.Clear();
            var digeri = await context.Set<User>().SingleAsync(u => u.Id == kalanUser.Id);
            Assert.Null(digeri.DeletedAt);
        }
    }

    /// <summary>Global egzersizler (UserId = null) hiçbir zaman etkilenmez (PLAN 13.2).</summary>
    [Fact]
    public async Task Pasiflestirme_global_egzersizlere_dokunmaz()
    {
        var (_, context, transaction) = await CreateAsync();
        await using (transaction)
        {
            var repository = new UserRepository(context);
            var kayit = new AuthService(
                repository, new UnitOfWork(context), new TokenService(Settings),
                new StubCurrentUser(0), new SahteSaat(An));
            var username = UniqueUsername();
            await kayit.RegisterAsync(Register(username));
            var user = (await repository.GetByUsernameAsync(username))!;
            var globalSayisi = await context.Set<Exercise>().CountAsync(e => e.UserId == null);

            var service = new AuthService(
                repository, new UnitOfWork(context), new TokenService(Settings),
                new StubCurrentUser(user.Id), new SahteSaat(An));
            await service.DeactivateAsync(new DeleteAccountRequest { Password = Password });

            context.ChangeTracker.Clear();
            Assert.Equal(globalSayisi, await context.Set<Exercise>().CountAsync(e => e.UserId == null));
        }
    }
}
