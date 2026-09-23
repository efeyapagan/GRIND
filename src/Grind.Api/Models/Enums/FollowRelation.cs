namespace Grind.Api.Models.Enums;

/// <summary>
/// Bakan kullanıcının, bakılan kullanıcıyla ilişkisi (#281). Saklanmaz; iki takip satırının varlığından
/// her istekte türetilir.
/// </summary>
public enum FollowRelation
{
    /// <summary>Bakılan, bakanın kendisi.</summary>
    Self,

    /// <summary>İki yönde de takip yok.</summary>
    None,

    /// <summary>Bakan onu takip ediyor, o bakanı etmiyor.</summary>
    Following,

    /// <summary>O bakanı takip ediyor, bakan onu etmiyor.</summary>
    FollowedBy,

    /// <summary>Karşılıklı takip = arkadaş.</summary>
    Friends
}
