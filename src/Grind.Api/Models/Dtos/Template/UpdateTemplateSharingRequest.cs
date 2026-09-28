namespace Grind.Api.Models.Dtos.Template;

/// <summary>
/// Tek alanlı gövde (#467): burada <c>null</c> "dokunma" DEĞİL "varsayılana dön" anlamına gelir
/// — <c>PatchTemplateRequest</c>'teki null semantiğiyle karıştırılmasın diye ayrı bir uç.
/// </summary>
public class UpdateTemplateSharingRequest
{
    public bool? Override { get; set; }
}
