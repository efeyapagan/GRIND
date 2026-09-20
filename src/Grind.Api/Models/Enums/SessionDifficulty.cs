namespace Grind.Api.Models.Enums;

/// <summary>
/// Antrenmanın kullanıcıya ne kadar zor geldiği (#118, #153'te beş kademeye çıktı — mobil uygulama
/// bunu döner bir kadranla sorar). Değer veritabanında ADIYLA saklanır (<c>EnumToStringConverter</c>,
/// <c>varchar(20)</c>): bu yüzden yeni uçlar eklemek migration GEREKTİRMEZ, ama var olan adları
/// değiştirmek eski satırları okunamaz hâle getirir — <c>Easy</c>/<c>Medium</c>/<c>Hard</c> bu yüzden
/// aynen korundu. Sıralama kolaydan zora: ekleme yapılacaksa doğru yere, sırayı bozmadan girmeli.
/// </summary>
public enum SessionDifficulty
{
    VeryEasy,
    Easy,
    Medium,
    Hard,
    Maximal
}
