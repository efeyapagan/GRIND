using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Grind.Api.Common.Time;
using Grind.Api.Models.Dtos.Auth;
using Grind.Api.Models.Dtos.Social;
using Grind.Api.Models.Enums;
using Grind.Api.Models.Entities;
using Grind.Tests;
using Microsoft.EntityFrameworkCore;

namespace Grind.Tests.Integration;

/// <summary>
/// #418: ana ekrandaki arkadaş karşılaştırması tek uçtan beslenir. Buradaki testler kapıyı
/// (kim listede) ve hesabı (hafta sınırı, aynı günün bir kez sayılması) sabitler.
///
/// Veritabanına gerçekten yazar (diğer entegrasyon testleriyle aynı gerekçe); kullanıcı adları
/// Guid ile benzersizleştirilir.
/// </summary>
[Trait("Category", "Database")]
public class FriendWeeklyEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    private const string Password = "yeterince-uzun-sifre";
    private const string Yol = "/api/social/weekly";

    private static string UniqueUsername() => $"fw_{Guid.NewGuid():N}"[..20];

    private async Task<(HttpClient Client, string Username, long Id)> KayitliAsync()
    {
        var client = factory.CreateClient();
        var username = UniqueUsername();
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest { Username = username, Password = Password });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);

        await using var db = TestDatabase.CreateContext();
        var id = await db.Users.Where(u => u.Username == username).Select(u => u.Id).SingleAsync();
        return (client, username, id);
    }

    /// <summary>Karşılıklı takip = arkadaşlık (#281); iki yönü de kurar.</summary>
    private static async Task ArkadasYapAsync(HttpClient birinci, string birinciAd, HttpClient ikinci, string ikinciAd)
    {
        (await birinci.PostAsync($"/api/users/{ikinciAd}/follow", null)).EnsureSuccessStatusCode();
        (await ikinci.PostAsync($"/api/users/{birinciAd}/follow", null)).EnsureSuccessStatusCode();
    }

    /// <summary>Verilen TR gününde, seti olan bir antrenman yazar (seti olmayan oturum sayılmaz).</summary>
    private static async Task AntrenmanYazAsync(long userId, DateOnly gun, decimal agirlik = 100m, int tekrar = 5)
    {
        await using var db = TestDatabase.CreateContext();
        var (baslangic, _) = TurkeyDay.RangeForLocalDate(gun);
        var oturum = new WorkoutSession { UserId = userId, StartedAt = baslangic.AddHours(10) };
        db.Add(oturum);
        await db.SaveChangesAsync();
        db.Add(new SetEntry
        {
            WorkoutSessionId = oturum.Id,
            ExerciseId = 1,
            Weight = agirlik,
            Reps = tekrar,
            RecordType = RecordType.None,
            CreatedAt = oturum.StartedAt,
        });
        await db.SaveChangesAsync();
    }

    private static async Task HedefYazAsync(long userId, int? gun)
    {
        await using var db = TestDatabase.CreateContext();
        var kullanici = await db.Users.SingleAsync(u => u.Id == userId);
        kullanici.WeeklyTargetDays = gun;
        await db.SaveChangesAsync();
    }

    private static async Task GizlilikYazAsync(long userId, PrivacyLevel seviye)
    {
        await using var db = TestDatabase.CreateContext();
        var kullanici = await db.Users.SingleAsync(u => u.Id == userId);
        kullanici.PrivacyLevel = seviye;
        await db.SaveChangesAsync();
    }

    private static DateOnly Bugun() => TurkeyDay.LocalDateOf(DateTime.UtcNow);

    private static async Task<List<WeeklyStandingResponse>> ListeleAsync(HttpClient client)
        => (await client.GetFromJsonAsync<List<WeeklyStandingResponse>>(Yol))!;

    [Fact]
    public async Task Tokensiz_401_verir()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await factory.CreateClient().GetAsync(Yol)).StatusCode);
    }

    /// <summary>Tek yönlü takip arkadaşlık DEĞİLDİR (#281) -- iki yön de listeden düşer.</summary>
    [Fact]
    public async Task Karsilikli_olmayan_takip_listede_yok()
    {
        var (ben, benimAd, _) = await KayitliAsync();
        var (takipEttigim, takipEttigimAd, _) = await KayitliAsync();
        var (beniTakipEden, beniTakipEdenAd, _) = await KayitliAsync();

        (await ben.PostAsync($"/api/users/{takipEttigimAd}/follow", null)).EnsureSuccessStatusCode();
        (await beniTakipEden.PostAsync($"/api/users/{benimAd}/follow", null)).EnsureSuccessStatusCode();

        var liste = await ListeleAsync(ben);

        Assert.DoesNotContain(liste, satir => satir.Username == takipEttigimAd);
        Assert.DoesNotContain(liste, satir => satir.Username == beniTakipEdenAd);
    }

    /// <summary>#425: kullanici siralamada KENDINI de gorur -- satiri `IsSelf` ile isaretlidir.</summary>
    [Fact]
    public async Task Cagiran_kendi_satirini_gorur()
    {
        var (ben, benimAd, benimId) = await KayitliAsync();
        var (arkadas, arkadasAd, _) = await KayitliAsync();
        await ArkadasYapAsync(ben, benimAd, arkadas, arkadasAd);
        await HedefYazAsync(benimId, 3);
        await AntrenmanYazAsync(benimId, Bugun());

        var liste = await ListeleAsync(ben);

        var kendi = Assert.Single(liste, satir => satir.Username == benimAd);
        Assert.True(kendi.IsSelf);
        Assert.Equal(1, kendi.TrainedDaysThisWeek);
        Assert.Equal(3, kendi.WeeklyTargetDays);
        Assert.True(kendi.TrainedToday);
        Assert.False(Assert.Single(liste, satir => satir.Username == arkadasAd).IsSelf);
    }

    /// <summary>Kendi gizliligi kendini SAKLAMAZ: kisi kendi verisini her zaman gorur.</summary>
    [Fact]
    public async Task Kendi_gizlilik_seviyesi_Gizli_olsa_da_kendi_satiri_gorunur()
    {
        var (ben, benimAd, benimId) = await KayitliAsync();
        await GizlilikYazAsync(benimId, PrivacyLevel.Gizli);

        Assert.Contains(await ListeleAsync(ben), satir => satir.Username == benimAd && satir.IsSelf);
    }

    /// <summary>Arkadasi olmayan kullanici bos liste degil, yalnizca kendi satirini gorur.</summary>
    [Fact]
    public async Task Arkadasi_olmayan_yalnizca_kendini_gorur()
    {
        var (ben, benimAd, _) = await KayitliAsync();

        var liste = await ListeleAsync(ben);

        Assert.Equal(benimAd, Assert.Single(liste).Username);
    }

    /// <summary>Aynı gün iki antrenman BİR gün sayılır (CLAUDE.md, takvim/seri kuralıyla aynı).</summary>
    [Fact]
    public async Task Haftalik_sayilar_gun_hacim_ve_set_olarak_dogru()
    {
        var (ben, benimAd, _) = await KayitliAsync();
        var (arkadas, arkadasAd, arkadasId) = await KayitliAsync();
        await ArkadasYapAsync(ben, benimAd, arkadas, arkadasAd);
        await HedefYazAsync(arkadasId, 4);

        var haftaBasi = StreakCalculator.WeekStart(Bugun());
        await AntrenmanYazAsync(arkadasId, haftaBasi, agirlik: 50m, tekrar: 10);
        await AntrenmanYazAsync(arkadasId, haftaBasi, agirlik: 20m, tekrar: 5);
        await AntrenmanYazAsync(arkadasId, haftaBasi.AddDays(1), agirlik: 100m, tekrar: 3);

        var satir = (await ListeleAsync(ben)).Single(s => s.Username == arkadasAd);

        Assert.Equal(2, satir.TrainedDaysThisWeek);
        Assert.Equal(4, satir.WeeklyTargetDays);
        Assert.Equal(3, satir.WeeklySetCount);
        Assert.Equal(50m * 10 + 20m * 5 + 100m * 3, satir.WeeklyVolume);
    }

    /// <summary>Kullanıcı kararı: `Gizli` arkadaş yanıtta HİÇ yer almaz ("paylaşmıyor" satırı da yok).</summary>
    [Fact]
    public async Task Gizli_arkadas_listede_hic_yok()
    {
        var (ben, benimAd, _) = await KayitliAsync();
        var (gizli, gizliAd, gizliId) = await KayitliAsync();
        await ArkadasYapAsync(ben, benimAd, gizli, gizliAd);
        await AntrenmanYazAsync(gizliId, Bugun());
        await GizlilikYazAsync(gizliId, PrivacyLevel.Gizli);

        Assert.DoesNotContain(await ListeleAsync(ben), satir => satir.Username == gizliAd);
    }

    [Fact]
    public async Task Kisitli_arkadas_listede_var()
    {
        var (ben, benimAd, _) = await KayitliAsync();
        var (arkadas, arkadasAd, arkadasId) = await KayitliAsync();
        await ArkadasYapAsync(ben, benimAd, arkadas, arkadasAd);
        await GizlilikYazAsync(arkadasId, PrivacyLevel.Kisitli);

        Assert.Contains(await ListeleAsync(ben), satir => satir.Username == arkadasAd);
    }

    [Fact]
    public async Task Pasif_arkadas_listede_yok()
    {
        var (ben, benimAd, _) = await KayitliAsync();
        var (arkadas, arkadasAd, _) = await KayitliAsync();
        await ArkadasYapAsync(ben, benimAd, arkadas, arkadasAd);

        var silme = await arkadas.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/auth/me")
        {
            Content = JsonContent.Create(new DeleteAccountRequest { Password = Password }),
        });
        Assert.Equal(HttpStatusCode.NoContent, silme.StatusCode);

        Assert.DoesNotContain(await ListeleAsync(ben), satir => satir.Username == arkadasAd);
    }

    /// <summary>Hedefi olmayan arkadaş listede KALIR; hedefi `null` döner (sıralamayı istemci yapar).</summary>
    [Fact]
    public async Task Hedefsiz_arkadas_null_hedefle_doner()
    {
        var (ben, benimAd, _) = await KayitliAsync();
        var (arkadas, arkadasAd, arkadasId) = await KayitliAsync();
        await ArkadasYapAsync(ben, benimAd, arkadas, arkadasAd);
        await AntrenmanYazAsync(arkadasId, Bugun());

        var satir = (await ListeleAsync(ben)).Single(s => s.Username == arkadasAd);

        Assert.Null(satir.WeeklyTargetDays);
        Assert.Equal(1, satir.TrainedDaysThisWeek);
    }

    [Fact]
    public async Task Bugun_antrenman_yapan_arkadas_isaretli()
    {
        var (ben, benimAd, _) = await KayitliAsync();
        var (bugunYapan, bugunYapanAd, bugunYapanId) = await KayitliAsync();
        var (yapmayan, yapmayanAd, _) = await KayitliAsync();
        await ArkadasYapAsync(ben, benimAd, bugunYapan, bugunYapanAd);
        await ArkadasYapAsync(ben, benimAd, yapmayan, yapmayanAd);
        await AntrenmanYazAsync(bugunYapanId, Bugun());

        var liste = await ListeleAsync(ben);

        Assert.True(liste.Single(s => s.Username == bugunYapanAd).TrainedToday);
        Assert.False(liste.Single(s => s.Username == yapmayanAd).TrainedToday);
    }

    /// <summary>Hafta Pazartesi başlar: geçen haftanın antrenmanı bu haftanın sayılarına girmez.</summary>
    [Fact]
    public async Task Gecen_haftanin_antrenmani_bu_haftaya_sayilmaz()
    {
        var (ben, benimAd, _) = await KayitliAsync();
        var (arkadas, arkadasAd, arkadasId) = await KayitliAsync();
        await ArkadasYapAsync(ben, benimAd, arkadas, arkadasAd);

        var gecenHafta = StreakCalculator.WeekStart(Bugun()).AddDays(-1);
        await AntrenmanYazAsync(arkadasId, gecenHafta);

        var satir = (await ListeleAsync(ben)).Single(s => s.Username == arkadasAd);

        Assert.Equal(0, satir.TrainedDaysThisWeek);
        Assert.Equal(0m, satir.WeeklyVolume);
        Assert.False(satir.TrainedToday);
    }

    /// <summary>Seti olmayan oturum antrenman sayılmaz (spec Karar 3; takvimle aynı kural).</summary>
    [Fact]
    public async Task Setsiz_oturum_gun_olarak_sayilmaz()
    {
        var (ben, benimAd, _) = await KayitliAsync();
        var (arkadas, arkadasAd, arkadasId) = await KayitliAsync();
        await ArkadasYapAsync(ben, benimAd, arkadas, arkadasAd);

        await using (var db = TestDatabase.CreateContext())
        {
            var (baslangic, _) = TurkeyDay.RangeForLocalDate(Bugun());
            db.Add(new WorkoutSession { UserId = arkadasId, StartedAt = baslangic.AddHours(9) });
            await db.SaveChangesAsync();
        }

        var satir = (await ListeleAsync(ben)).Single(s => s.Username == arkadasAd);

        Assert.Equal(0, satir.TrainedDaysThisWeek);
        Assert.False(satir.TrainedToday);
    }
}
