using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Dtos.Session;

namespace Grind.Tests.Models.Dtos;

public class SessionDtoValidationTests
{
    private static IReadOnlyList<ValidationResult> Validate(object model)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true);
        return results;
    }

    [Fact]
    public void Bos_baslatma_istegi_gecerlidir()
    {
        // Şablonsuz, notsuz oturum meşru — en sık akış bu.
        Assert.Empty(Validate(new StartSessionRequest()));
    }

    [Fact]
    public void Sablonlu_baslatma_istegi_gecerlidir()
    {
        Assert.Empty(Validate(new StartSessionRequest { TemplateId = 5, Notes = "Omuz biraz sıkıştı" }));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Gecersiz_TemplateId_reddedilir(long templateId)
    {
        Assert.NotEmpty(Validate(new StartSessionRequest { TemplateId = templateId }));
    }

    [Fact]
    public void Cok_uzun_not_reddedilir()
    {
        Assert.NotEmpty(Validate(new StartSessionRequest { Notes = new string('a', 2001) }));
        Assert.Empty(Validate(new StartSessionRequest { Notes = new string('a', 2000) }));
    }

    [Fact]
    public void Not_guncelleme_istegi_ayni_sinira_tabi()
    {
        Assert.NotEmpty(Validate(new UpdateSessionNotesRequest { Notes = new string('a', 2001) }));
        Assert.Empty(Validate(new UpdateSessionNotesRequest { Notes = null }));
    }
}
