using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Dtos.Auth;

namespace Grind.Tests.Models.Dtos;

public class AuthDtoValidationTests
{
    /// <summary>DataAnnotations'ı [ApiController]'ın yaptığı gibi çalıştırır.</summary>
    private static IReadOnlyList<ValidationResult> Validate(object model)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true);
        return results;
    }

    private static RegisterRequest Register(string username, string password) =>
        new() { Username = username, Password = password };

    [Fact]
    public void Gecerli_kayit_istegi_dogrulamayi_gecer()
    {
        Assert.Empty(Validate(Register("efe_yapagan-1", "yeterince-uzun-sifre")));
    }

    [Theory]
    [InlineData("ef")]              // 3 karakterden kısa
    [InlineData("efeyapağan")]      // Türkçe karakter — ASCII-only kuralı
    [InlineData("efe yapagan")]     // boşluk
    [InlineData("efe.yapagan")]     // izin verilmeyen noktalama
    [InlineData("")]                // boş
    public void Kurala_uymayan_username_reddedilir(string username)
    {
        Assert.NotEmpty(Validate(Register(username, "yeterince-uzun-sifre")));
    }

    [Fact]
    public void Yedi_karakterlik_sifre_reddedilir()
    {
        Assert.NotEmpty(Validate(Register("efe", "1234567")));
    }

    [Fact]
    public void Tam_72_bytelik_sifre_kabul_edilir()
    {
        Assert.Empty(Validate(Register("efe", new string('a', 72))));
    }

    /// <summary>
    /// BCrypt 72 BYTE'ta sessizce kesiyor (deneyle ölçüldü). 72 adet 'ğ' = 144 byte:
    /// [StringLength(72)] bunu geçirirdi ve şifrenin ilk 36 karakterini bilen giriş yapabilirdi.
    /// </summary>
    [Fact]
    public void Yetmis_iki_karakterlik_ama_144_bytelik_sifre_reddedilir()
    {
        Assert.NotEmpty(Validate(Register("efe", new string('ğ', 72))));
    }

    [Fact]
    public void Giris_istegi_yalnizca_alanlarin_dolu_olmasini_ister()
    {
        // Kayıt kuralları giriş tarafında UYGULANMAZ: kurallar sonradan sıkılaşırsa eski
        // kullanıcılar kilitlenmesin, ayrıca 400/401 farkı bir ipucu vermesin.
        Assert.Empty(Validate(new LoginRequest { Username = "EFEYAPAĞAN", Password = "x" }));
        Assert.NotEmpty(Validate(new LoginRequest { Username = "", Password = "x" }));
    }
}
