using System.ComponentModel.DataAnnotations;
using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// Şablonun görünürlüğü (#467, #540): <c>Public</c> / <c>Friends</c> / <c>Hidden</c>. Hesap seviyesi
/// ne olursa olsun üçünden biri seçilebilir. "Varsayılana dön" yok: bir kez seçilen şablon hesap
/// seviyesinden türemeyi bırakır.
/// </summary>
public class UpdateTemplateSharingRequest
{
    [Required]
    public TemplateVisibility? Visibility { get; set; }
}
