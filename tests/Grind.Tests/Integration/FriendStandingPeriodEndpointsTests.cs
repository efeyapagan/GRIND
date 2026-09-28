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

using static Grind.Tests.Integration.ArkadasTestVerisi;

namespace Grind.Tests.Integration;

/// <summary>
/// #420: arkadaş sıralaması ana sayfa takviminin DÖNEMİNİ izler -- aynı uç, <c>from</c>/<c>to</c>
/// ile (iki ucu dahil TR yerel günü). Parametresiz çağrının "bu hafta" davranışı
/// <see cref="FriendWeeklyEndpointsTests"/>'te sabit; burada dönem ve doğrulaması.
///
/// Ayrı sınıf, çünkü kayıt ucunun hız sınırı sınıf başınadır (bkz. <see cref="ArkadasTestVerisi"/>).
/// </summary>
[Trait("Category", "Database")]
public class FriendStandingPeriodEndpointsTests(GrindApiFactory factory) : IClassFixture<GrindApiFactory>
{
    /// <summary>
    /// Geçmiş bir hafta istenince yalnızca O HAFTANIN antrenmanları sayılır; bu haftanınki girmez.
    /// </summary>
    [Fact]
    public async Task Aralik_verilirse_yalnizca_o_donem_sayilir()
    {
        var (ben, benimAd, _) = await KayitliAsync(factory);
        var (arkadas, arkadasAd, arkadasId) = await KayitliAsync(factory);
        await ArkadasYapAsync(ben, benimAd, arkadas, arkadasAd);

        var buHaftaBasi = StreakCalculator.WeekStart(Bugun());
        var gecenHaftaBasi = buHaftaBasi.AddDays(-7);
        await AntrenmanYazAsync(arkadasId, gecenHaftaBasi.AddDays(2), agirlik: 60m, tekrar: 5);
        await AntrenmanYazAsync(arkadasId, Bugun(), agirlik: 999m, tekrar: 1);

        var satir = (await DonemdeListeleAsync(ben, gecenHaftaBasi, gecenHaftaBasi.AddDays(6)))
            .Single(s => s.Username == arkadasAd);

        Assert.Equal(1, satir.TrainedDays);
        Assert.Equal(60m * 5, satir.Volume);
    }

    /// <summary>Aylık dönem, farklı haftalara düşen günlerin hepsini sayar.</summary>
    [Fact]
    public async Task Aylik_aralik_farkli_haftalardaki_gunleri_toplar()
    {
        var (ben, benimAd, _) = await KayitliAsync(factory);
        var (arkadas, arkadasAd, arkadasId) = await KayitliAsync(factory);
        await ArkadasYapAsync(ben, benimAd, arkadas, arkadasAd);

        // 17 gün arayla: aynı Pazartesi–Pazar haftasına düşmeleri imkânsız.
        await AntrenmanYazAsync(arkadasId, Bugun().AddDays(-20));
        await AntrenmanYazAsync(arkadasId, Bugun().AddDays(-3));

        var satir = (await DonemdeListeleAsync(ben, Bugun().AddDays(-27), Bugun()))
            .Single(s => s.Username == arkadasAd);

        Assert.Equal(2, satir.TrainedDays);
    }

    /// <summary>
    /// Geçmiş bir dönemde "bugün antrenman yaptı" işareti YOKTUR: kişi bugün çalışmış olsa da o
    /// dönemin satırında alev çizilmemeli.
    /// </summary>
    [Fact]
    public async Task Gecmis_donemde_bugun_isareti_yok()
    {
        var (ben, benimAd, _) = await KayitliAsync(factory);
        var (arkadas, arkadasAd, arkadasId) = await KayitliAsync(factory);
        await ArkadasYapAsync(ben, benimAd, arkadas, arkadasAd);
        await AntrenmanYazAsync(arkadasId, Bugun());

        var gecenHaftaBasi = StreakCalculator.WeekStart(Bugun()).AddDays(-7);
        var satir = (await DonemdeListeleAsync(ben, gecenHaftaBasi, gecenHaftaBasi.AddDays(6)))
            .Single(s => s.Username == arkadasAd);

        Assert.False(satir.TrainedToday);
    }

    /// <summary>Aralığın tek ucu anlamsız: ya ikisi birden ya hiçbiri (hiçbiri = bu hafta).</summary>
    [Theory]
    [InlineData("from=2026-09-01")]
    [InlineData("to=2026-09-07")]
    public async Task Tek_ucu_verilen_aralik_400(string sorgu)
    {
        var (ben, _, _) = await KayitliAsync(factory);

        Assert.Equal(HttpStatusCode.BadRequest, (await ben.GetAsync($"{Yol}?{sorgu}")).StatusCode);
    }

    [Fact]
    public async Task Ters_aralik_400()
    {
        var (ben, _, _) = await KayitliAsync(factory);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await ben.GetAsync($"{Yol}?from=2026-09-10&to=2026-09-01")).StatusCode);
    }

    /// <summary>
    /// En uzun takvim dönemi bir ay (31 gün). Daha uzunu istenmez: sıralama sınırsız bir geçmişi
    /// taramaya dönüşmesin.
    /// </summary>
    [Fact]
    public async Task Bir_aydan_uzun_aralik_400()
    {
        var (ben, _, _) = await KayitliAsync(factory);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await ben.GetAsync($"{Yol}?from=2026-08-01&to=2026-09-01")).StatusCode);
    }
}
