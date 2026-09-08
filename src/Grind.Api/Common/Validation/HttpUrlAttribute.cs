using DataAnnotations = System.ComponentModel.DataAnnotations;

namespace Grind.Api.Common.Validation;

/// <summary>
/// Yalnızca mutlak <c>http</c>/<c>https</c> URI kabul eder.
///
/// Yerleşik <c>[Url]</c> neden yetmiyor: <c>javascript:</c> ve <c>data:</c> şemalarını
/// reddediyor (iyi) ama <c>ftp://</c>'yi GEÇİRİYOR (deneyle doğrulandı). Bu alan ileride bir
/// arayüzde kaynak/bağlantı olarak render edilecek; şema listesini veriyi kabul ederken
/// daraltmak, render eden koda güvenmekten ucuz.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field, AllowMultiple = false)]
public sealed class HttpUrlAttribute : DataAnnotations.ValidationAttribute
{
    /// <summary>null/boş burada geçerli sayılır — zorunluluğu [Required] söyler.</summary>
    public override bool IsValid(object? value)
    {
        if (value is not string text || string.IsNullOrEmpty(text))
        {
            return true;
        }

        return Uri.TryCreate(text, UriKind.Absolute, out var uri)
               && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}
