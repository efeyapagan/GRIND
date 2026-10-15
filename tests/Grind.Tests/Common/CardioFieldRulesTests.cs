using System.ComponentModel.DataAnnotations;
using Grind.Api.Common.Validation;
using Grind.Api.Models.Dtos.Cardio;
using Grind.Api.Models.Enums;
using ValidationException = Grind.Api.Common.Exceptions.ValidationException;

namespace Grind.Tests.Common;

/// <summary>#647: kardiyo kaydının kutuları — makinenin sorduğu kutular, aralıklar ve zorunlu süre.</summary>
public class CardioFieldRulesTests
{
    private const long Treadmill = 193;
    private const long StairClimber = 200;

    [Fact]
    public void Makinenin_sormadigi_kutu_reddedilir()
    {
        var merdiven = CardioFieldCatalog.For(StairClimber, ExerciseMeasurement.Cardio);

        Assert.Throws<ValidationException>(() =>
            CardioFieldRules.EnsureAllowed(merdiven, new CardioValues { InclinePercent = 5m }));
        CardioFieldRules.EnsureAllowed(merdiven, new CardioValues { Level = 8, Floors = 40 });
    }

    [Fact]
    public void Kosu_bandi_hiz_egim_ve_mesafe_sorar()
    {
        Assert.Equal(
            [CardioField.Speed, CardioField.Incline, CardioField.Distance],
            CardioFieldCatalog.For(Treadmill, ExerciseMeasurement.Cardio));
    }

    [Theory]
    [InlineData(nameof(CardioValues.SpeedKmh), 41)]
    [InlineData(nameof(CardioValues.InclinePercent), -1)]
    [InlineData(nameof(CardioValues.Level), 31)]
    [InlineData(nameof(CardioValues.Damper), 11)]
    public void Aralik_disi_deger_reddedilir(string alan, double deger)
    {
        var values = new CardioValues();
        var property = typeof(CardioValues).GetProperty(alan)!;
        var tip = Nullable.GetUnderlyingType(property.PropertyType)!;
        property.SetValue(values, Convert.ChangeType(deger, tip));

        Assert.False(Validator.TryValidateObject(values, new ValidationContext(values), [], validateAllProperties: true));
    }

    [Fact]
    public void Duzeltmede_sure_zorunludur()
    {
        var istek = new UpdateCardioRequest();

        Assert.False(Validator.TryValidateObject(istek, new ValidationContext(istek), [], validateAllProperties: true));
    }
}
