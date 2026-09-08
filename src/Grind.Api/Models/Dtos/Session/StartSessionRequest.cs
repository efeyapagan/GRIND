using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Session;

/// <summary>
/// İki alanı da opsiyonel: şablonsuz ve notsuz başlatmak en sık akış.
/// Gövdesiz bir POST bile geçerlidir.
/// </summary>
public class StartSessionRequest
{
    /// <summary>null ise şablonsuz oturum. Dolu ise sahiplik servis katmanında doğrulanır.</summary>
    [Range(1, long.MaxValue, ErrorMessage = "Geçerli bir şablon seçilmeli.")]
    public long? TemplateId { get; set; }

    /// <summary>Veritabanı sütunu sınırsız (text); sınır burada bilinçli bir ürün kararı.</summary>
    [StringLength(2000, ErrorMessage = "Not en fazla 2000 karakter olabilir.")]
    public string? Notes { get; set; }
}
