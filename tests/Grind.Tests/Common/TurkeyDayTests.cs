using Grind.Api.Common.Time;

namespace Grind.Tests.Common;

/// <summary>
/// Bu fazın çekirdeği. TR gece yarısı UTC 21:00'e denk geliyor (Türkiye sabit +03:00,
/// DST 2016'da kaldırıldı) — testler o sınırın iki yanına oturuyor.
/// Veritabanı gerektirmez: saf hesap.
/// </summary>
public class TurkeyDayTests
{
    [Fact]
    public void Gece_yarisindan_once_ayni_TR_gunune_duser()
    {
        // UTC 20:30 = TR 23:30, hâlâ 10 Mart.
        var (baslangic, bitis) = TurkeyDay.RangeFor(new DateTime(2026, 3, 10, 20, 30, 0, DateTimeKind.Utc));

        Assert.Equal(new DateTime(2026, 3, 9, 21, 0, 0, DateTimeKind.Utc), baslangic);
        Assert.Equal(new DateTime(2026, 3, 10, 21, 0, 0, DateTimeKind.Utc), bitis);
    }

    /// <summary>UTC 21:00 = TR gece yarısı; bir sonraki güne geçmiş olmalı.</summary>
    [Fact]
    public void Gece_yarisinda_ertesi_TR_gunune_gecer()
    {
        var (baslangic, bitis) = TurkeyDay.RangeFor(new DateTime(2026, 3, 10, 21, 0, 0, DateTimeKind.Utc));

        Assert.Equal(new DateTime(2026, 3, 10, 21, 0, 0, DateTimeKind.Utc), baslangic);
        Assert.Equal(new DateTime(2026, 3, 11, 21, 0, 0, DateTimeKind.Utc), bitis);
    }

    [Fact]
    public void Sabah_saati_dogru_araliga_duser()
    {
        // UTC 06:00 = TR 09:00, 11 Mart.
        var (baslangic, bitis) = TurkeyDay.RangeFor(new DateTime(2026, 3, 11, 6, 0, 0, DateTimeKind.Utc));

        Assert.Equal(new DateTime(2026, 3, 10, 21, 0, 0, DateTimeKind.Utc), baslangic);
        Assert.Equal(new DateTime(2026, 3, 11, 21, 0, 0, DateTimeKind.Utc), bitis);
    }

    /// <summary>Yaz ve kış aynı davranmalı — Türkiye'de DST yok.</summary>
    [Theory]
    [InlineData(1)]
    [InlineData(7)]
    public void Aralik_her_mevsimde_tam_yirmi_dort_saat(int ay)
    {
        var (baslangic, bitis) = TurkeyDay.RangeFor(new DateTime(2026, ay, 15, 12, 0, 0, DateTimeKind.Utc));

        Assert.Equal(TimeSpan.FromHours(24), bitis - baslangic);
        Assert.Equal(DateTimeKind.Utc, baslangic.Kind);
        Assert.Equal(DateTimeKind.Utc, bitis.Kind);
    }

    /// <summary>
    /// Kind = Local sessizce yanlış gün sınırı üretebilir (yerel makine saat dilimine göre
    /// kayar) — bu yüzden reddedilmeli, UTC'ye sessizce çevrilmemeli.
    /// </summary>
    [Fact]
    public void Yerel_saat_reddedilir()
    {
        var yerelAn = new DateTime(2026, 3, 10, 20, 30, 0, DateTimeKind.Local);

        Assert.Throws<ArgumentException>(() => TurkeyDay.RangeFor(yerelAn));
    }

    /// <summary>
    /// Kind = Unspecified reddedilmiyor, UTC olarak okunuyor (Postgres round-trip'i ve
    /// test yardımcıları bunu üretebilir) — bu davranışı burada belgeliyoruz.
    /// </summary>
    [Fact]
    public void Belirtilmemis_kind_UTC_gibi_okunur()
    {
        var utc = new DateTime(2026, 3, 10, 20, 30, 0, DateTimeKind.Utc);
        var belirtilmemis = DateTime.SpecifyKind(utc, DateTimeKind.Unspecified);

        Assert.Equal(TurkeyDay.RangeFor(utc), TurkeyDay.RangeFor(belirtilmemis));
    }
}
