using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Time;

namespace Grind.Tests.Common;

/// <summary>
/// Sorgu parametrelerinin (TR yerel günü, iki ucu dahil) UTC aralığına çevrilmesi.
/// Bitiş gününün DAHİL olması kritik: hariç olsaydı "1-31 Mart" sorgusu 31 Mart'ı kaçırırdı.
/// </summary>
public class LocalDayRangeTests
{
    [Fact]
    public void Bos_aralik_sinirsizdir()
    {
        var (from, to) = LocalDayRange.Resolve(null, null);

        Assert.Null(from);
        Assert.Null(to);
    }

    [Fact]
    public void Baslangic_gunun_basina_cevrilir()
    {
        var (from, _) = LocalDayRange.Resolve(new DateOnly(2026, 3, 10), null);

        Assert.Equal(new DateTime(2026, 3, 9, 21, 0, 0, DateTimeKind.Utc), from);
    }

    /// <summary>Bitiş günü DAHİL: sınır, o günün SONU (ertesi günün başı, hariç).</summary>
    [Fact]
    public void Bitis_gunu_araliga_dahildir()
    {
        var (_, to) = LocalDayRange.Resolve(null, new DateOnly(2026, 3, 10));

        Assert.Equal(new DateTime(2026, 3, 10, 21, 0, 0, DateTimeKind.Utc), to);
    }

    [Fact]
    public void Tek_gunluk_aralik_yirmi_dort_saattir()
    {
        var (from, to) = LocalDayRange.Resolve(new DateOnly(2026, 3, 10), new DateOnly(2026, 3, 10));

        Assert.Equal(TimeSpan.FromHours(24), to!.Value - from!.Value);
    }

    [Fact]
    public void Ters_aralik_reddedilir()
    {
        Assert.Throws<ValidationException>(
            () => LocalDayRange.Resolve(new DateOnly(2026, 3, 10), new DateOnly(2026, 3, 1)));
    }

    /// <summary>
    /// Üst sınırda DateOnly.MaxValue "sınır yok" anlamına gelir (bkz. LocalDayRange.Resolve
    /// yorumu): TurkeyDay bu değer için AddDays(1) ile taşar, bu yüzden özel olarak sınırsız
    /// kabul edilir; ArgumentOutOfRangeException asla dışarı sızmamalı.
    /// </summary>
    [Fact]
    public void Ust_sinir_maksimum_tarihse_sinirsiz_kabul_edilir()
    {
        var (_, to) = LocalDayRange.Resolve(null, DateOnly.MaxValue);

        Assert.Null(to);
    }

    /// <summary>
    /// Alt sınırda DateOnly.MaxValue anlamsız bir istektir ("9999-12-31'den itibaren") ve
    /// üst sınırdaki gibi sınırsız yorumlanamaz; 500 yerine 400 ile reddedilmeli.
    /// </summary>
    [Fact]
    public void Alt_sinir_maksimum_tarihse_reddedilir()
    {
        Assert.Throws<ValidationException>(
            () => LocalDayRange.Resolve(DateOnly.MaxValue, null));
    }
}
