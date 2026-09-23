using Grind.Api.Common.Exceptions;
using Grind.Api.Common.Validation;

namespace Grind.Tests.Common;

/// <summary>
/// #266: RIR kaydırıcısı yarım adımlıdır ("2–3 arası" = 2.5). Sütun ondalık tuttuğu için 1.3 gibi bir
/// değer SESSİZCE saklanırdı ve hiçbir durağa düşmezdi; kural bu yüzden reddeder. 0–5 aralığı DTO'da.
/// </summary>
public class RirScaleTests
{
    [Theory]
    [InlineData("0")]
    [InlineData("2.5")]
    [InlineData("5")]
    public void Yarim_adimlar_kabul_edilir(string rir)
    {
        Assert.Null(Record.Exception(() => RirScale.EnsureHalfStep(decimal.Parse(rir, System.Globalization.CultureInfo.InvariantCulture))));
    }

    [Fact]
    public void Yarimin_kati_olmayan_reddedilir()
    {
        Assert.Throws<ValidationException>(() => RirScale.EnsureHalfStep(1.3m));
    }
}
