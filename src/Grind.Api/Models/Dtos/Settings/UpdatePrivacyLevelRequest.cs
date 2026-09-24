using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Settings;

/// <summary>
/// Antrenman geçmişi ve rekorların görünürlüğü (#294). Şifre istenmez: haftalık hedef gibi hassas bir
/// hesap işlemi değil. Model binder geçersiz bir enum adını zaten 400'e çevirir, ayrı bir doğrulama
/// gerekmez.
/// </summary>
public class UpdatePrivacyLevelRequest
{
    public PrivacyLevel PrivacyLevel { get; set; }
}
