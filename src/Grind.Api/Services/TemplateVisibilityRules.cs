using Grind.Api.Models.Entities;
using Grind.Api.Models.Enums;

namespace Grind.Api.Services;

/// <summary>
/// Şablon görünürlüğünün TEK kuralı (#540). Saf: veritabanı yok. Hem kimin görebileceği
/// (<see cref="SharedTemplateService"/>) hem sahibine gösterilen etkin değer (<c>TemplateMapper</c>)
/// buradan okunur — istemci eşlemeyi ikinci kez yapmaz.
/// </summary>
public static class TemplateVisibilityRules
{
    /// <summary>Seçilmişse o; değilse hesap seviyesinden türeyen varsayılan.</summary>
    public static TemplateVisibility Effective(TemplateVisibility? selected, PrivacyLevel ownerLevel) =>
        selected ?? ownerLevel switch
        {
            PrivacyLevel.Acik => TemplateVisibility.Public,
            PrivacyLevel.Kisitli => TemplateVisibility.Friends,
            _ => TemplateVisibility.Hidden,
        };

    /// <summary>
    /// Sahibi OLMAYAN bir izleyici şablonu görebilir mi. Kaydedilmiş kopya (<c>SavedFromUserId</c>
    /// dolu) hiçbir kademede paylaşılmaz (#534): aksi hâlde üçüncü kişinin şablonu, onun kendi
    /// seçimi aşılarak kopyalayan üzerinden yeniden dağıtılır.
    /// </summary>
    public static bool IsVisibleTo(WorkoutTemplate template, PrivacyLevel ownerLevel, bool areFriends) =>
        template.SavedFromUserId is null
        && Effective(template.Visibility, ownerLevel) switch
        {
            TemplateVisibility.Public => true,
            TemplateVisibility.Friends => areFriends,
            _ => false,
        };
}
