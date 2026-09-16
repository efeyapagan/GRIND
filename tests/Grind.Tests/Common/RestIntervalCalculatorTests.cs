using Grind.Api.Common.Rest;
using Grind.Api.Models.Entities;

namespace Grind.Tests.Common;

public class RestIntervalCalculatorTests
{
    private static readonly DateTime An = new(2026, 3, 10, 17, 0, 0, DateTimeKind.Utc);

    private const long BenchPress = 10;
    private const long BarbellCurl = 20;

    private static SetEntry Set(long id, long exerciseId, int saniyeSonra) => new()
    {
        Id = id,
        ExerciseId = exerciseId,
        Weight = 60m,
        Reps = 8,
        CreatedAt = An.AddSeconds(saniyeSonra)
    };

    /// <summary>İlk setten önce dinlenme yoktur: "0 sn dinlendi" yanlış bir sayı olurdu.</summary>
    [Fact]
    public void Oturumun_ilk_setinin_dinlenmesi_null()
    {
        var dinlenmeler = RestIntervalCalculator.ForSession([Set(1, BenchPress, 0)]);

        Assert.Null(dinlenmeler[1]);
    }

    /// <summary>
    /// Superset: dinlenme aynı hareketin önceki setine (150 sn) değil, oturumdaki bir önceki sete
    /// (Curl, 90 sn) göredir — kullanıcı gerçekte o kadar dinlendi.
    /// </summary>
    [Fact]
    public void Dinlenme_oturumdaki_bir_onceki_sete_gore_olculur()
    {
        var dinlenmeler = RestIntervalCalculator.ForSession(
        [
            Set(1, BenchPress, 0),
            Set(2, BarbellCurl, 60),
            Set(3, BenchPress, 150)
        ]);

        Assert.Equal(60, dinlenmeler[2]);
        Assert.Equal(90, dinlenmeler[3]);
    }

    /// <summary>
    /// Değerler kronolojik (karışık) sırayla gelir: sıralamadan ortadaki ikisini almak 645 verirdi.
    /// Uzun aykırı değer (telefon, sohbet) nerede olursa olsun özeti bozmaz; ilk setin null'ı sayılmaz.
    /// </summary>
    [Fact]
    public void Medyan_siralayip_ortadaki_iki_degerin_ortalamasini_alir()
    {
        Assert.Equal(105, RestIntervalCalculator.Median([null, 60, 1200, 90, 120]));
    }

    /// <summary>Tek setli oturumda hiç dinlenme yok: medyan bilinmiyor, hesap çökmüyor.</summary>
    [Fact]
    public void Gecerli_dinlenme_yoksa_medyan_null()
    {
        Assert.Null(RestIntervalCalculator.Median([null]));
    }
}
