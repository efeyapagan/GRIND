namespace Grind.Api.Common.Time;

/// <summary>
/// Doğum tarihinden yaş (#280). Yaş saklanmaz — her yıl değişir; sorgu anında hesaplanır (Tahmini 1RM
/// ile aynı gerekçe). "Bugün" çağıranın verdiği TR yerel günüdür (<see cref="TurkeyDay.LocalDateOf"/>).
/// </summary>
public static class AgeCalculator
{
    /// <summary>
    /// <paramref name="today"/> günündeki tamamlanmış yıl sayısı. 29 Şubat doğumlu, artık olmayan yılda
    /// 28 Şubat'ta yaşını doldurur (<see cref="DateOnly.AddYears"/> 29 Şubat'ı 28'e çeker).
    /// </summary>
    public static int AgeOn(DateOnly birthDate, DateOnly today)
    {
        var age = today.Year - birthDate.Year;
        return birthDate.AddYears(age) > today ? age - 1 : age;
    }
}
