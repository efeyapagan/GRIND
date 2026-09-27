namespace Grind.Api.Models.Enums;

/// <summary>
/// Kullanıcının antrenman hedefi (#444). Değer veritabanında ADIYLA saklanır
/// (<c>EnumToStringConverter</c>, <c>varchar(20)</c>) — <see cref="PrivacyLevel"/> ile aynı sebep:
/// yeni bir hedef eklemek migration gerektirmez, ama var olan adları değiştirmek eski satırları
/// okunamaz hâle getirir.
///
/// Bugünkü tek kullanıcısı AI yorumudur: seçiliyse prompt'a girer ve model hacim dağılımını
/// doğrudan bu hedefe göre eleştirir. <c>null</c> = seçilmemiş; prompt nötr hâlinde kalır.
/// Tek bir etiket olduğu için 3NF'yi ihlal etmez (bkz. CLAUDE.md, Veritabanı Tasarım Kuralları).
/// </summary>
public enum TrainingGoal
{
    /// <summary>Kas hacmi: hacim ve set sayısı ön planda.</summary>
    Hipertrofi,

    /// <summary>Maksimal kuvvet: ağırlık ve rekorlar ön planda.</summary>
    Guc,

    /// <summary>Kilo verme: hacmi korurken kalori açığı.</summary>
    KiloVerme,

    /// <summary>Genel form: düzenlilik ve denge ön planda.</summary>
    GenelForm
}
