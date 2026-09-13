using Grind.Api.Common.Exceptions;
using Grind.Api.Services;

namespace Grind.Tests.Services;

/// <summary>
/// AI yorumunun kapsadığı TR günleri (Faz 12 spec Karar 4). Saf: "bugün" dışarıdan verilir, DB yok.
/// </summary>
public class AiInsightRangeTests
{
    private static readonly DateOnly Bugun = new(2026, 3, 12);

    /// <summary>İki ucu dahil 30 gün: 11 Şubat – 12 Mart (2026 Şubat'ı 28 gün).</summary>
    [Fact]
    public void Aralik_verilmezse_bugun_biten_son_otuz_gundur()
    {
        var (from, to) = AiInsightRange.Resolve(null, null, Bugun);

        Assert.Equal(new DateOnly(2026, 2, 11), from);
        Assert.Equal(Bugun, to);
    }

    [Fact]
    public void Yalnizca_bitis_verilirse_ondan_geriye_otuz_gun_alinir()
    {
        var (from, to) = AiInsightRange.Resolve(null, new DateOnly(2026, 1, 31), Bugun);

        Assert.Equal(new DateOnly(2026, 1, 2), from);
        Assert.Equal(new DateOnly(2026, 1, 31), to);
    }

    [Fact]
    public void Yalnizca_baslangic_verilirse_bitis_bugundur()
    {
        var (from, to) = AiInsightRange.Resolve(new DateOnly(2026, 1, 1), null, Bugun);

        Assert.Equal(new DateOnly(2026, 1, 1), from);
        Assert.Equal(Bugun, to);
    }

    /// <summary>Artık yıl: 1 Ocak – 31 Aralık 2024 iki ucu dahil tam 366 gündür ve kabul edilir.</summary>
    [Fact]
    public void Tam_366_gun_kabul_edilir()
    {
        var (from, to) = AiInsightRange.Resolve(new DateOnly(2024, 1, 1), new DateOnly(2024, 12, 31), Bugun);

        Assert.Equal(365, to.DayNumber - from.DayNumber);
    }

    /// <summary>1 Ocak 2024 – 1 Ocak 2025 iki ucu dahil 367 gündür: maliyet sınırı (spec Karar 4).</summary>
    [Fact]
    public void Uc_yuz_altmis_yedi_gun_reddedilir()
    {
        var hata = Assert.Throws<ValidationException>(
            () => AiInsightRange.Resolve(new DateOnly(2024, 1, 1), new DateOnly(2025, 1, 1), Bugun));

        Assert.Equal("Aralık en fazla 366 gün olabilir.", hata.Message);
    }

    [Fact]
    public void Ters_aralik_reddedilir()
    {
        var hata = Assert.Throws<ValidationException>(
            () => AiInsightRange.Resolve(new DateOnly(2026, 3, 10), new DateOnly(2026, 3, 1), Bugun));

        Assert.Equal("Başlangıç tarihi bitiş tarihinden sonra olamaz.", hata.Message);
    }

    /// <summary>
    /// AYIRT EDİCİ: 0001-01-10'dan 29 gün geri gitmek DateOnly.AddDays'i taşırır
    /// (ArgumentOutOfRangeException → 500). Başlangıç en erken güne sabitlenmeli.
    /// </summary>
    [Fact]
    public void Takvimin_basina_yakin_bitis_tasmaz()
    {
        var (from, to) = AiInsightRange.Resolve(null, new DateOnly(1, 1, 10), Bugun);

        Assert.Equal(DateOnly.MinValue, from);
        Assert.Equal(new DateOnly(1, 1, 10), to);
    }
}
