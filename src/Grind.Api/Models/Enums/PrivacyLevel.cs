namespace Grind.Api.Models.Enums;

/// <summary>
/// Hesap sahibinin kendi antrenman verisini başkalarına ne kadar açacağı (#294). Değer veritabanında
/// ADIYLA saklanır (<c>EnumToStringConverter</c>, <c>varchar(20)</c>) — <see cref="SessionDifficulty"/>
/// ile aynı sebep: yeni bir seviye eklemek migration gerektirmez, ama var olan adları değiştirmek eski
/// satırları okunamaz hâle getirir. Rekorlar (<c>GetRecordsAsync</c>) üç seviyede de görünür — yalnızca
/// geçmiş (<c>GetHistoryAsync</c>) bu seviyeye göre kısıtlanır; ölçüler hiçbir seviyede paylaşılmaz.
/// </summary>
public enum PrivacyLevel
{
    /// <summary>Tüm antrenman geçmişi ve rekorlar herkese (kimlikli her kullanıcıya) açık.</summary>
    Acik,

    /// <summary>Yalnızca son 5 antrenman ve rekorlar açık. Varsayılan seviye.</summary>
    Kisitli,

    /// <summary>Geçmiş hiç açık değil, yalnızca rekorlar görünür.</summary>
    Gizli
}
