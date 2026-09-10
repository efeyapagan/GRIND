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
}
