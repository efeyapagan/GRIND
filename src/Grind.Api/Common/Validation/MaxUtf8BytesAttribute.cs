using System.Text;
using DataAnnotations = System.ComponentModel.DataAnnotations;

namespace Grind.Api.Common.Validation;

/// <summary>
/// Değerin UTF-8 byte uzunluğunu sınırlar. StringLength KARAKTER sayar; BCrypt ise girdiyi
/// 72 BYTE'ta sessizce keser. 72 adet 'ğ' 72 karakter ama 144 byte'tır — StringLength(72)
/// bunu geçirir ve şifrenin yalnızca ilk yarısı korur.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field, AllowMultiple = false)]
public sealed class MaxUtf8BytesAttribute(int maxBytes) : DataAnnotations.ValidationAttribute
{
    public int MaxBytes { get; } = maxBytes;

    /// <summary>null/boş burada geçerli sayılır — zorunluluğu [Required] söyler.</summary>
    public override bool IsValid(object? value)
        => value is not string text || Encoding.UTF8.GetByteCount(text) <= MaxBytes;
}
