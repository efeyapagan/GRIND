using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Security;
using Grind.Api.Data;
using Grind.Api.Models.Dtos.Common;
using Grind.Api.Models.Dtos.Social;
using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;
using Grind.Api.Repositories;
using Grind.Api.Services;
using Microsoft.EntityFrameworkCore;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Tests.Services;

/// <summary>
/// Takip sistemi (#281): doğrudan takip, arkadaş = karşılıklı takip (saklanmaz, iki satırdan
/// sorgulanır), pasif hesaplar listelerde/sayaçlarda/aramada görünmez.
/// </summary>
[Trait("Category", "Database")]
public class FollowServiceTests
{
    private sealed class StubCurrentUser(User user) : ICurrentUserService
    {
        public long UserId { get; } = user.Id;
        public string Username { get; } = user.Username;
    }

    private static readonly DateTime An = new(2026, 9, 23, 12, 0, 0, DateTimeKind.Utc);

    private sealed class SahteSaat : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(An, TimeSpan.Zero);
    }

    private static readonly PagedQuery IlkSayfa = new();

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

    /// <summary>Aynı context, farklı "oturum açmış" kullanıcı.</summary>
    private static FollowService ServiceFor(AppDbContext context, User current) => new(
        new FollowRepository(context), new UserRepository(context), new UserAvatarRepository(context), new UnitOfWork(context),
        new StubCurrentUser(current), new SahteSaat());

    private static async Task<string[]> Adlar(Task<PagedResponse<UserSummaryResponse>> liste) =>
        (await liste).Items.Select(i => i.Username).ToArray();

    // ---- Takip / arkadaşlık ----

    /// <summary>Tek yönlü takip: B'nin takipçisi olur, ama kimsenin arkadaşı olmaz.</summary>
    [Fact]
    public async Task Tek_yonlu_takip_takipci_yapar_arkadas_yapmaz()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (a, b) = (users[0], users[1]);
            await ServiceFor(context, a).FollowAsync(b.Username);

            var bGozuyle = ServiceFor(context, b);
            Assert.Equal([a.Username], await Adlar(bGozuyle.GetFollowersAsync(b.Username, IlkSayfa)));
            Assert.Empty(await Adlar(bGozuyle.GetFriendsAsync(b.Username, IlkSayfa)));
            Assert.Equal([b.Username], await Adlar(bGozuyle.GetFollowingAsync(a.Username, IlkSayfa)));
            Assert.Empty(await Adlar(bGozuyle.GetFriendsAsync(a.Username, IlkSayfa)));
        }
    }

    /// <summary>Karşılıklı takip arkadaşlıktır; biri bırakınca arkadaşlık kendiliğinden biter.</summary>
    [Fact]
    public async Task Karsilikli_takip_arkadasliktir_biri_birakinca_biter()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (a, b) = (users[0], users[1]);
            await ServiceFor(context, a).FollowAsync(b.Username);
            await ServiceFor(context, b).FollowAsync(a.Username);

            var aGozuyle = ServiceFor(context, a);
            Assert.Equal([b.Username], await Adlar(aGozuyle.GetFriendsAsync(a.Username, IlkSayfa)));
            Assert.Equal([a.Username], await Adlar(aGozuyle.GetFriendsAsync(b.Username, IlkSayfa)));

            await aGozuyle.UnfollowAsync(b.Username);

            Assert.Empty(await Adlar(aGozuyle.GetFriendsAsync(a.Username, IlkSayfa)));
            Assert.Equal([b.Username], await Adlar(aGozuyle.GetFollowersAsync(a.Username, IlkSayfa)));
        }
    }

    /// <summary>
    /// Çift tıklama / yeniden deneme hata vermez: ikinci takip yeni satır açmaz, takip edilmeyeni
    /// bırakmak sessizce geçer.
    /// </summary>
    [Fact]
    public async Task Takip_ve_birakma_idempotenttir()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (a, b) = (users[0], users[1]);
            var service = ServiceFor(context, a);

            await service.FollowAsync(b.Username);
            await service.FollowAsync(b.Username);
            Assert.Equal(1, await context.Set<Follow>().CountAsync(f => f.FollowerId == a.Id));

            await service.UnfollowAsync(b.Username);
            await service.UnfollowAsync(b.Username);
            Assert.Equal(0, await context.Set<Follow>().CountAsync(f => f.FollowerId == a.Id));
        }
    }

    [Fact]
    public async Task Kendini_takip_edemez()
    {
        var (context, users, transaction) = await CreateAsync(1);
        await using (transaction)
        {
            await Assert.ThrowsAsync<ValidationException>(
                () => ServiceFor(context, users[0]).FollowAsync(users[0].Username));
        }
    }

    /// <summary>Pasif hesap takip edilemez; olmayan kullanıcıyla aynı yanıt (varlığı sızmaz).</summary>
    [Fact]
    public async Task Pasif_ya_da_olmayan_kullanici_takip_edilemez()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            users[1].DeletedAt = An;
            await context.SaveChangesAsync();
            var service = ServiceFor(context, users[0]);

            await Assert.ThrowsAsync<NotFoundException>(() => service.FollowAsync(users[1].Username));
            await Assert.ThrowsAsync<NotFoundException>(() => service.FollowAsync("boyle_biri_yok"));
        }
    }

    /// <summary>Kullanıcı adları küçük harf saklanır; URL'deki büyük harf aynı kişiyi bulur.</summary>
    [Fact]
    public async Task Kullanici_adi_buyuk_kucuk_harf_duyarsizdir()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            await ServiceFor(context, users[0]).FollowAsync(users[1].Username.ToUpperInvariant());

            Assert.True(await context.Set<Follow>()
                .AnyAsync(f => f.FollowerId == users[0].Id && f.FolloweeId == users[1].Id));
        }
    }

    // ---- Profil başlığı ----

    /// <summary>
    /// İlişki durumu bakanın gözünden: kendisi / yok / takip ediyorum / beni takip ediyor / arkadaş.
    /// Sayaçlar hedefin kendi sayılarıdır.
    /// </summary>
    [Fact]
    public async Task Profil_sayaclari_ve_iliski_durumu_dogrudur()
    {
        var (context, users, transaction) = await CreateAsync(3);
        await using (transaction)
        {
            var (a, b, c) = (users[0], users[1], users[2]);
            var aGozuyle = ServiceFor(context, a);

            Assert.Equal(FollowRelation.Self, (await aGozuyle.GetProfileAsync(a.Username)).Relation);
            Assert.Equal(FollowRelation.None, (await aGozuyle.GetProfileAsync(b.Username)).Relation);
            Assert.Equal(PrivacyLevel.Kisitli, (await aGozuyle.GetProfileAsync(b.Username)).PrivacyLevel);

            await aGozuyle.FollowAsync(b.Username);
            Assert.Equal(FollowRelation.Following, (await aGozuyle.GetProfileAsync(b.Username)).Relation);

            await ServiceFor(context, c).FollowAsync(a.Username);
            Assert.Equal(FollowRelation.FollowedBy, (await aGozuyle.GetProfileAsync(c.Username)).Relation);

            await ServiceFor(context, b).FollowAsync(a.Username);
            var bProfili = await aGozuyle.GetProfileAsync(b.Username);
            Assert.Equal(FollowRelation.Friends, bProfili.Relation);

            // a: takipçileri b, c; takip ettiği b; arkadaşı b.
            var aProfili = await aGozuyle.GetProfileAsync(a.Username);
            Assert.Equal(a.Username, aProfili.Username);
            Assert.Equal(2, aProfili.FollowerCount);
            Assert.Equal(1, aProfili.FollowingCount);
            Assert.Equal(1, aProfili.FriendCount);
        }
    }

    /// <summary>
    /// Pasifleşen hesap listelerden ve sayaçlardan düşer; satırı silinmez (hesap geri açılınca
    /// ilişki geri gelir — soft delete kararı). Pasif hesabın profili de açılmaz.
    /// </summary>
    [Fact]
    public async Task Pasif_hesap_listelerde_ve_sayaclarda_gorunmez()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (a, b) = (users[0], users[1]);
            await ServiceFor(context, a).FollowAsync(b.Username);
            await ServiceFor(context, b).FollowAsync(a.Username);

            a.DeletedAt = An;
            await context.SaveChangesAsync();

            var bGozuyle = ServiceFor(context, b);
            var profil = await bGozuyle.GetProfileAsync(b.Username);
            Assert.Equal(0, profil.FollowerCount);
            Assert.Equal(0, profil.FollowingCount);
            Assert.Equal(0, profil.FriendCount);
            Assert.Empty(await Adlar(bGozuyle.GetFollowersAsync(b.Username, IlkSayfa)));
            Assert.Empty(await Adlar(bGozuyle.GetFriendsAsync(b.Username, IlkSayfa)));
            await Assert.ThrowsAsync<NotFoundException>(() => bGozuyle.GetProfileAsync(a.Username));
            Assert.Equal(2, await context.Set<Follow>()
                .CountAsync(f => f.FollowerId == a.Id || f.FolloweeId == a.Id));
        }
    }

    /// <summary>Listedeki her satır, BAKANIN o kişiyle ilişkisini taşır (liste düğmesi buna göre çizilir).</summary>
    [Fact]
    public async Task Liste_satirlari_bakanin_iliskisini_tasir()
    {
        var (context, users, transaction) = await CreateAsync(3);
        await using (transaction)
        {
            var (a, b, c) = (users[0], users[1], users[2]);
            await ServiceFor(context, b).FollowAsync(a.Username);
            await ServiceFor(context, c).FollowAsync(a.Username);
            await ServiceFor(context, a).FollowAsync(b.Username);

            var takipciler = (await ServiceFor(context, a).GetFollowersAsync(a.Username, IlkSayfa)).Items;

            Assert.Equal(FollowRelation.Friends, takipciler.Single(t => t.Username == b.Username).Relation);
            Assert.Equal(FollowRelation.FollowedBy, takipciler.Single(t => t.Username == c.Username).Relation);
        }
    }

    /// <summary>
    /// #284: başkasının profil başlığı ve liste/arama satırları kendi başlığınla aynı bilgiyi çizer —
    /// görünen isim, fotoğraf sürümü; başlıkta yaş da (TR gününe göre, doğum günü yarın → henüz dolmadı).
    /// </summary>
    [Fact]
    public async Task Profil_ve_satirlar_gorunen_isim_yas_ve_fotograf_surumunu_tasir()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (a, b) = (users[0], users[1]);
            b.DisplayName = "Ayşe Kaya";
            b.BirthDate = new DateOnly(2001, 9, 24);
            context.Add(new UserAvatar { UserId = b.Id, Content = [1], ContentType = "image/jpeg", UpdatedAt = An });
            await context.SaveChangesAsync();
            await ServiceFor(context, b).FollowAsync(a.Username);
            var surum = new DateTimeOffset(An).ToUnixTimeMilliseconds();

            var aGozuyle = ServiceFor(context, a);
            var profil = await aGozuyle.GetProfileAsync(b.Username);
            Assert.Equal(("Ayşe Kaya", 24, true, surum), (profil.DisplayName, profil.Age, profil.HasAvatar, profil.AvatarVersion));

            var satir = (await aGozuyle.GetFollowersAsync(a.Username, IlkSayfa)).Items.Single();
            Assert.Equal(("Ayşe Kaya", true, surum), (satir.DisplayName, satir.HasAvatar, satir.AvatarVersion));

            var fotografsiz = await ServiceFor(context, b).GetProfileAsync(a.Username);
            Assert.Equal((null, null, false, null), (fotografsiz.DisplayName, fotografsiz.Age, fotografsiz.HasAvatar, fotografsiz.AvatarVersion));
        }
    }

    // ---- Arama ----

    /// <summary>
    /// #284: görünen isimle de aranır — ismin başı ya da herhangi bir kelimesinin başı, büyük/küçük harf
    /// duyarsız. Kelimenin ortası eşleşmez.
    /// </summary>
    [Fact]
    public async Task Arama_gorunen_ismin_kelime_basiyla_da_bulur()
    {
        var (context, users, transaction) = await CreateAsync(2);
        await using (transaction)
        {
            var (ben, hedef) = (users[0], users[1]);
            var soyad = $"Zq{Guid.NewGuid():N}"[..10];
            hedef.DisplayName = $"Ayşe {soyad}";
            await context.SaveChangesAsync();
            var benGozuyle = ServiceFor(context, ben);

            Assert.Equal([hedef.Username], (await benGozuyle.SearchAsync(soyad.ToLowerInvariant())).Select(s => s.Username));
            Assert.Contains(hedef.Username, (await benGozuyle.SearchAsync("AYŞE")).Select(s => s.Username));
            Assert.Empty(await benGozuyle.SearchAsync(soyad[2..]));
        }
    }

    /// <summary>Ön-ek, büyük/küçük harf duyarsız; pasif hesap ve aramayı yapan kendisi sonuçta yok.</summary>
    [Fact]
    public async Task Arama_on_ek_ile_bulur_pasifi_ve_kendini_disarida_birakir()
    {
        var (context, users, transaction) = await CreateAsync(0);
        await using (transaction)
        {
            var onEk = $"ara{Guid.NewGuid():N}"[..12];
            User Yeni(string ek) => new()
            {
                Username = onEk + ek, PasswordHash = "x", CreatedAt = An
            };
            var (ben, aktif, pasif, alakasiz) = (Yeni("ben"), Yeni("aktif"), Yeni("pasif"), TestDatabase.NewUser());
            pasif.DeletedAt = An;
            context.AddRange(ben, aktif, pasif, alakasiz);
            await context.SaveChangesAsync();

            var sonuc = await ServiceFor(context, ben).SearchAsync(onEk.ToUpperInvariant());

            Assert.Equal([aktif.Username], sonuc.Select(s => s.Username));
        }
    }
}
