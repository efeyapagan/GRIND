using Grind.Api.Models.Dtos.Common;

namespace Grind.Tests.Common;

/// <summary>
/// Sayfalı liste uçlarının ortak parametreleri. <c>Skip()</c> taşma korumalıdır — Faz 9 final
/// incelemesinde bulunan hata (<c>page=2147483647</c> → negatif OFFSET → 500) burada tek yerde
/// düzeltilmiş olarak yaşar.
/// </summary>
public class PagedRangeQueryTests
{
    [Fact]
    public void Varsayilanlar_ilk_sayfadir_ve_hic_satir_atlamaz()
    {
        var query = new PagedRangeQuery();

        Assert.Equal(1, query.Page);
        Assert.Equal(20, query.PageSize);
        Assert.Equal(0, query.Skip());
    }

    [Fact]
    public void Ucuncu_sayfa_iki_sayfa_boyu_atlar()
    {
        Assert.Equal(40, new PagedRangeQuery { Page = 3, PageSize = 20 }.Skip());
    }

    /// <summary>
    /// (int.MaxValue - 1) × 100 bir int'e sığmaz; denetimsiz çarpım negatife sarar. Sonuç
    /// negatif olmamalı — int.MaxValue'da sınırlanmalı.
    /// </summary>
    [Fact]
    public void Cok_buyuk_sayfa_numarasi_tasmaz()
    {
        Assert.Equal(int.MaxValue, new PagedRangeQuery { Page = int.MaxValue, PageSize = 100 }.Skip());
    }
}
