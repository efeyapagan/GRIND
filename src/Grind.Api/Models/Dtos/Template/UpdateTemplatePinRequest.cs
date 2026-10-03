using System.ComponentModel.DataAnnotations;

namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// Kaydedilen şablonu başa sabitler ya da sabitlemeyi kaldırır (#538). Gövde <c>{ "isPinned": true }</c>.
/// </summary>
public class UpdateTemplatePinRequest
{
    [Required]
    public bool? IsPinned { get; set; }
}
