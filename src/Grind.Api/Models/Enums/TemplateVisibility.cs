namespace Grind.Api.Models.Enums;

/// <summary>
/// Bir şablonu kimin görebileceği (#540). Değer veritabanında ADIYLA saklanır
/// (<c>EnumToStringConverter</c>, <c>varchar(20)</c>) — <see cref="PrivacyLevel"/> ile aynı sebep.
///
/// Şablonda seçilmemişse (<c>null</c>) hesap seviyesinden TÜRER ve saklanmaz:
/// <see cref="PrivacyLevel.Acik"/> → <see cref="Public"/>, <see cref="PrivacyLevel.Kisitli"/> →
/// <see cref="Friends"/>, <see cref="PrivacyLevel.Gizli"/> → <see cref="Hidden"/>
/// (<see cref="Services.TemplateVisibilityRules"/>). Kullanıcı hesap seviyesi ne olursa olsun üçünden
/// birini seçebilir.
/// </summary>
public enum TemplateVisibility
{
    /// <summary>Uygulamadaki (kimlikli) HERKES görür ve kaydedebilir — arkadaş olması gerekmez.</summary>
    Public,

    /// <summary>Yalnızca arkadaşlar (karşılıklı takip, #281).</summary>
    Friends,

    /// <summary>Kimse — sahibinin kendisi dışında.</summary>
    Hidden
}
