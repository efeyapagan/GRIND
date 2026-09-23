using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Profile;
using Grind.Api.Models.Entities;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Tests.Services;

/// <summary>
/// Profil alanları ve profil fotoğrafı (#280): görünen isim, doğum tarihi (yaş sorgu anında TR
/// gününe göre hesaplanır), veritabanında ayrı tabloda duran fotoğraf.
/// </summary>
[Trait("Category", "Database")]
public class ProfileServiceTests
{
    private sealed class StubCurrentUser(User user) : ICurrentUserService
    {
        public long UserId { get; } = user.Id;
        public string Username { get; } = user.Username;
    }

    /// <summary>UTC 23 Eylül 21:30 = TR 24 Eylül 00:30 — UTC günü ile TR günü farklı.</summary>
    private static readonly DateTime An = new(2026, 9, 23, 21, 30, 0, DateTimeKind.Utc);

    private sealed class SahteSaat(DateTime an) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(an, TimeSpan.Zero);
    }

    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3];
    private static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 4, 5, 6];

    private static async Task<(AppDbContext Context, User[] Users, IAsyncDisposable Transaction)>
        CreateAsync(int kullaniciSayisi)
    {
        var context = TestDatabase.CreateContext();
        var transaction = await context.Database.BeginTransactionAsync();

        var users = Enumerable.Range(0, kullaniciSayisi).Select(_ => TestDatabase.NewUser()).ToArray();
        context.AddRange(users);
        await context.SaveChangesAsync();

        return (context, users, transaction);
    }

    private static ProfileService ServiceFor(AppDbContext context, User current, DateTime? an = null) => new(
        new UserRepository(context), new UserAvatarRepository(context), new UnitOfWork(context),
        new StubCurrentUser(current), new SahteSaat(an ?? An));

    private static UpdateProfileDetailsRequest Istek(string? ad, string? dogum) => new()
    {
        DisplayName = ad,
        BirthDate = dogum is null ? null : DateOnly.Parse(dogum)
    };

    // ---- Profil alanları ----

    /// <summary>
    /// Görünen isim kırpılır; yaş TR gününe göre hesaplanır: doğum günü TR'de bugün (24 Eylül) ama
    /// UTC'de henüz yarın — UTC'ye göre hesaplansaydı 25 çıkardı.
    /// </summary>
    [Fact]
    public async Task Profil_guncellenir_isim_kirpilir_yas_TR_gunune_gore_hesaplanir()
    {
        var (context, users, transaction) = await CreateAsync(1);
        await using (transaction)
        {
            var service = ServiceFor(context, users[0]);

            await service.UpdateAsync(Istek("  Efe Yapağan  ", "2000-09-24"));
            var profil = await service.GetAsync();

            Assert.Equal(users[0].Username, profil.Username);
            Assert.Equal("Efe Yapağan", profil.DisplayName);
            Assert.Equal(new DateOnly(2000, 9, 24), profil.BirthDate);
            Assert.Equal(26, profil.Age);
            Assert.False(profil.HasAvatar);
            Assert.Null(profil.AvatarVersion);
        }
    }

    /// <summary>Yalnızca boşluktan oluşan isim "isim yok" demektir; doğum tarihi null ise yaş da null.</summary>
    [Fact]
    public async Task Bos_isim_ve_dogum_tarihi_temizlenir()
    {
        var (context, users, transaction) = await CreateAsync(1);
        await using (transaction)
        {
            var service = ServiceFor(context, users[0]);
            await service.UpdateAsync(Istek("Efe", "2000-01-01"));

            await service.UpdateAsync(Istek("   ", null));
            var profil = await service.GetAsync();

            Assert.Null(profil.DisplayName);
            Assert.Null(profil.BirthDate);
            Assert.Null(profil.Age);
        }
    }

    /// <summary>Sınır kırpmadan SONRA uygulanır: 50 karakter + boşluk geçer, 51 karakter geçmez.</summary>
    [Fact]
    public async Task Gorunen_isim_kirpildiktan_sonra_en_fazla_elli_karakter()
    {
        var (context, users, transaction) = await CreateAsync(1);
        await using (transaction)
        {
            var service = ServiceFor(context, users[0]);

            await service.UpdateAsync(Istek($" {new string('a', 50)} ", null));
            await Assert.ThrowsAsync<ValidationException>(
                () => service.UpdateAsync(Istek(new string('a', 51), null)));
        }
    }

    /// <summary>Gelecek tarih, 13 yaş altı ve 120 yaş üstü reddedilir (bugün TR'de 2026-09-24).</summary>
    [Theory]
    [InlineData("2026-09-25")]
    [InlineData("2013-09-25")]
    [InlineData("1905-09-23")]
    public async Task Gecersiz_dogum_tarihi_reddedilir(string dogum)
    {
        var (context, users, transaction) = await CreateAsync(1);
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(
                () => ServiceFor(context, users[0]).UpdateAsync(Istek(null, dogum)));
        }
    }

    /// <summary>Sınırlar dahil: bugün 13'üne ve 120'sine basan kabul edilir.</summary>
    [Theory]
    [InlineData("2013-09-24")]
    [InlineData("1906-09-24")]
    public async Task Yas_sinirlari_dahildir(string dogum)
    {
        var (context, users, transaction) = await CreateAsync(1);
        await using (transaction)
        {
            await ServiceFor(context, users[0]).UpdateAsync(Istek(null, dogum));
        }
    }

    // ---- Profil fotoğrafı ----

    /// <summary>
    /// Yükleme, üstüne yazma ve silme: türü istemcinin beyanından değil dosyanın imzasından belirlenir;
    /// ikinci yükleme ikinci satır açmaz, eskisinin yerine geçer ve sürümü ilerletir.
    /// </summary>
    [Fact]
    public async Task Fotograf_yuklenir_degistirilir_ve_silinir()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (sahip, baskasi) = (users[0], users[1]);

            await ServiceFor(context, sahip).SetAvatarAsync(new MemoryStream(Png));
            var ilkSurum = (await ServiceFor(context, sahip).GetAsync()).AvatarVersion;

            await ServiceFor(context, sahip, An.AddMinutes(1)).SetAvatarAsync(new MemoryStream(Jpeg));
            var profil = await ServiceFor(context, sahip).GetAsync();
            Assert.True(profil.HasAvatar);
            Assert.NotEqual(ilkSurum, profil.AvatarVersion);
            Assert.Equal(1, await context.Set<UserAvatar>().CountAsync(a => a.UserId == sahip.Id));

            var foto = await ServiceFor(context, baskasi).GetAvatarAsync(sahip.Username);
            Assert.Equal(Jpeg, foto.Content);
            Assert.Equal("image/jpeg", foto.ContentType);
            Assert.Equal(profil.AvatarVersion, foto.Version);

            await ServiceFor(context, sahip).DeleteAvatarAsync();
            Assert.False((await ServiceFor(context, sahip).GetAsync()).HasAvatar);
            await Assert.ThrowsAsync<NotFoundException>(
                () => ServiceFor(context, baskasi).GetAvatarAsync(sahip.Username));
        }
    }

    /// <summary>256 KB'ı aşan ya da JPEG/PNG/WebP olmayan dosya 400; hiçbir satır yazılmaz.</summary>
    [Fact]
    public async Task Sinir_disi_fotograf_reddedilir()
    {
        var (context, users, transaction) = await CreateAsync(1);
        await using (transaction)
        {
            var service = ServiceFor(context, users[0]);
            var buyuk = new byte[ProfileService.MaxAvatarBytes + 1];
            Png.CopyTo(buyuk, 0);
            var gif = "GIF89a"u8.ToArray();

            await Assert.ThrowsAsync<ValidationException>(() => service.SetAvatarAsync(new MemoryStream(buyuk)));
            await Assert.ThrowsAsync<ValidationException>(() => service.SetAvatarAsync(new MemoryStream(gif)));
            Assert.False(await context.Set<UserAvatar>().AnyAsync(a => a.UserId == users[0].Id));
        }
    }

    /// <summary>Pasif hesabın fotoğrafı durur ama görünmez: yok, fotoğrafsız ve pasif aynı 404'ü alır.</summary>
    [Fact]
    public async Task Pasif_hesabin_fotografi_gorunmez()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (pasif, bakan) = (users[0], users[1]);
            await ServiceFor(context, pasif).SetAvatarAsync(new MemoryStream(Png));
            pasif.DeletedAt = An;
            await context.SaveChangesAsync();

            var service = ServiceFor(context, bakan);
            await Assert.ThrowsAsync<NotFoundException>(() => service.GetAvatarAsync(pasif.Username));
            await Assert.ThrowsAsync<NotFoundException>(() => service.GetAvatarAsync(bakan.Username));
            await Assert.ThrowsAsync<NotFoundException>(() => service.GetAvatarAsync("boyle_biri_yok"));
            Assert.True(await context.Set<UserAvatar>().AnyAsync(a => a.UserId == pasif.Id));
        }
    }
}
