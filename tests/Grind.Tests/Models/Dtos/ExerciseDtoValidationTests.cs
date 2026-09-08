using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Dtos.Exercise;
using Grind.Api.Models.Enums;

namespace Grind.Tests.Models.Dtos;

public class ExerciseDtoValidationTests
{
    private static IReadOnlyList<ValidationResult> Validate(object model)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true);
        return results;
    }

    private static CreateExerciseRequest Create(string name, ExerciseCategory category = ExerciseCategory.Push) =>
        new() { Name = name, Category = category };

    [Fact]
    public void Gecerli_olusturma_istegi_dogrulamayi_gecer()
    {
        Assert.Empty(Validate(Create("Incline Dumbbell Press")));
    }

    [Theory]
    [InlineData("")]                 // boş
    [InlineData("A")]                // 2 karakterden kısa
    public void Kurala_uymayan_isim_reddedilir(string name)
    {
        Assert.NotEmpty(Validate(Create(name)));
    }

    [Fact]
    public void Yuz_karakterden_uzun_isim_reddedilir()
    {
        // Veritabanı sütunu 100 karakter; burada durdurmazsak 500 alırdık.
        Assert.NotEmpty(Validate(Create(new string('a', 101))));
        Assert.Empty(Validate(Create(new string('a', 100))));
    }

    /// <summary>
    /// System.Text.Json tanımsız bir SAYI değerini sessizce bağlıyor (deneyle doğrulandı:
    /// {"Category":99} → (ExerciseCategory)99, Enum.IsDefined = false). Onu burada durdurmazsak
    /// veritabanına "99" yazılırdı.
    /// </summary>
    [Fact]
    public void Tanimsiz_kategori_degeri_reddedilir()
    {
        Assert.NotEmpty(Validate(Create("Geçerli Ad", (ExerciseCategory)99)));
    }

    [Theory]
    [InlineData("https://ornek.com/video.mp4", true)]
    [InlineData("http://ornek.com/hareket.gif", true)]
    [InlineData("javascript:alert(1)", false)]      // XSS taşıyıcısı
    [InlineData("data:text/html,<script>", false)]  // XSS taşıyıcısı
    [InlineData("ftp://ornek.com/video.mp4", false)] // yerleşik [Url] bunu GEÇİRİRDİ
    [InlineData("/yerel/yol.gif", false)]           // mutlak değil
    public void Medya_urlinde_yalnizca_http_ve_https_kabul_edilir(string url, bool gecerliOlmali)
    {
        var errors = Validate(new AddMediaRequest { MediaType = MediaType.Video, Url = url });

        Assert.Equal(gecerliOlmali, errors.Count == 0);
    }

    [Fact]
    public void Tanimsiz_medya_tipi_reddedilir()
    {
        Assert.NotEmpty(Validate(new AddMediaRequest
        {
            MediaType = (MediaType)42,
            Url = "https://ornek.com/video.mp4"
        }));
    }
}
