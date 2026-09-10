namespace Grind.Api.Models.Dtos.Stats;

/// <summary>
/// Antrenman yapılmış bir TR günü. Antrenman YAPILMAYAN günler listede HİÇ yer almaz —
/// boş günleri sıfırlarla doldurmak yanıtı gereksiz büyütürdü; takvim ızgarasındaki boşlukları
/// istemci zaten biliyor.
/// </summary>
public record CalendarDayResponse(DateOnly Date, int SessionCount, int SetCount, decimal Volume);
