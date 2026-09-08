using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Dtos.Template;

namespace Grind.Tests.Models.Dtos;

/// <summary>
/// DİKKAT: <c>Validator.TryValidateObject</c> İÇ İÇE koleksiyon elemanlarına GİRMEZ
/// (deneyle ölçüldü: PlannedSets = 0 olan bir alt eleman listede 0 hata üretiyor).
/// Bu yüzden alt eleman kuralları burada YALNIZCA alt DTO tek başına doğrulanarak test
/// edilir; listenin içindeyken çalıştığı Görev 4'ün entegrasyon testiyle kanıtlanır.
/// Bu ayrımı bozup "liste içinde bozuk eleman" testi yazmak, sessizce geçen boş bir test üretir.
/// </summary>
public class TemplateDtoValidationTests
{
    private static IReadOnlyList<ValidationResult> Validate(object model)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true);
        return results;
    }

    private static CreateTemplateRequest Create(string name) => new()
    {
        Name = name,
        Exercises = [new TemplateExerciseRequest { ExerciseId = 1, PlannedSets = 4 }]
    };

    [Fact]
    public void Gecerli_olusturma_istegi_dogrulamayi_gecer()
    {
        Assert.Empty(Validate(Create("Push Day A")));
    }

    [Theory]
    [InlineData("")]
    [InlineData("A")]
    public void Kurala_uymayan_sablon_adi_reddedilir(string name)
    {
        Assert.NotEmpty(Validate(Create(name)));
    }

    [Fact]
    public void Yuz_karakterden_uzun_ad_reddedilir()
    {
        Assert.NotEmpty(Validate(Create(new string('a', 101))));
        Assert.Empty(Validate(Create(new string('a', 100))));
    }

    /// <summary>Önce şablonu oluşturup sonra doldurmak doğal bir akış.</summary>
    [Fact]
    public void Bos_egzersiz_listesi_kabul_edilir()
    {
        Assert.Empty(Validate(new CreateTemplateRequest { Name = "Bos Sablon", Exercises = [] }));
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(1, true)]
    [InlineData(50, true)]
    [InlineData(51, false)]
    [InlineData(-1, false)]
    public void Alt_DTO_tek_basina_PlannedSets_araligini_uygular(int plannedSets, bool gecerliOlmali)
    {
        // Tek başına doğrulanıyor — listenin içinde değil. Sebep sınıfın doc'unda.
        var errors = Validate(new TemplateExerciseRequest { ExerciseId = 1, PlannedSets = plannedSets });

        Assert.Equal(gecerliOlmali, errors.Count == 0);
    }

    [Fact]
    public void Alt_DTO_gecersiz_ExerciseId_reddeder()
    {
        Assert.NotEmpty(Validate(new TemplateExerciseRequest { ExerciseId = 0, PlannedSets = 4 }));
    }

    /// <summary>
    /// PATCH'te ikisi de null DTO katmanını GEÇER (nullable alanlarda kural yok) — "en az bir
    /// alan" kontrolü servis katmanının işi. Bu test o sınırı kayda geçiriyor.
    /// </summary>
    [Fact]
    public void Patch_istegi_bos_haliyle_DTO_katmanini_gecer()
    {
        Assert.Empty(Validate(new PatchTemplateRequest()));
    }
}
